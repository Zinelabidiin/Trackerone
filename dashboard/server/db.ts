import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, adminCredentials, deviceCallLogs, deviceContacts, deviceNotifications, deviceTelemetry, deviceUsageStats, devices, invitations, triviaAttempts, triviaProfiles, triviaQuestions, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch { _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (['name', 'email', 'loginMethod'] as const).forEach(field => { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } });
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? 'admin'; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listDevices(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(devices).where(eq(devices.ownerId, ownerId)).orderBy(desc(devices.createdAt));
}

export async function createDevice(input: typeof devices.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(devices).values(input);
  const result = await db.select().from(devices).where(eq(devices.deviceId, input.deviceId)).limit(1);
  return result[0];
}

export async function getDeviceByAuthToken(authToken: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(devices).where(eq(devices.authToken, authToken)).limit(1);
  return result[0];
}

export async function getCurrentDeviceStatus(ownerId: number, deviceId: number) {
  const db = await getDb(); if (!db) return undefined;
  const deviceResult = await db.select().from(devices).where(and(eq(devices.id, deviceId), eq(devices.ownerId, ownerId))).limit(1);
  const device = deviceResult[0];
  if (!device) return undefined;
  const telemetry = await getLatestTelemetryForDevice(deviceId);
  return { device, telemetry };
}

export async function getLatestTelemetryForDevice(deviceId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(deviceTelemetry).where(eq(deviceTelemetry.deviceId, deviceId)).orderBy(desc(deviceTelemetry.recordedAt)).limit(1);
  return result[0];
}

export async function getTelemetryHistoryForDevice(ownerId: number, deviceId: number, limit = 100) {
  const db = await getDb(); if (!db) return undefined;
  const deviceResult = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.id, deviceId), eq(devices.ownerId, ownerId))).limit(1);
  if (!deviceResult[0]) return undefined;
  return db.select().from(deviceTelemetry).where(eq(deviceTelemetry.deviceId, deviceId)).orderBy(desc(deviceTelemetry.recordedAt)).limit(Math.min(Math.max(limit, 1), 500));
}

export async function recordTelemetry(input: typeof deviceTelemetry.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(deviceTelemetry).values(input);
  await db.update(devices).set({ status: "Synchronisé à l'instant", updatedAt: new Date() }).where(eq(devices.id, input.deviceId));
}

export async function recordNativeCallLogs(deviceId: number, rows: Array<typeof deviceCallLogs.$inferInsert>) {
  const db = await getDb(); if (!db || rows.length === 0) return;
  await db.insert(deviceCallLogs).values(rows).onDuplicateKeyUpdate({ set: { syncedAt: new Date() } });
}

export async function recordNativeContacts(deviceId: number, rows: Array<typeof deviceContacts.$inferInsert>) {
  const db = await getDb(); if (!db || rows.length === 0) return;
  await db.insert(deviceContacts).values(rows).onDuplicateKeyUpdate({ set: { syncedAt: new Date() } });
}

export async function recordNativeUsageStats(deviceId: number, rows: Array<typeof deviceUsageStats.$inferInsert>) {
  const db = await getDb(); if (!db || rows.length === 0) return;
  await db.insert(deviceUsageStats).values(rows).onDuplicateKeyUpdate({ set: { syncedAt: new Date() } });
}

export async function recordNativeNotifications(deviceId: number, rows: Array<typeof deviceNotifications.$inferInsert>) {
  const db = await getDb(); if (!db || rows.length === 0) return;
  await db.insert(deviceNotifications).values(rows).onDuplicateKeyUpdate({ set: { syncedAt: new Date() } });
}

export async function getNativeDataForDevice(ownerId: number, deviceId: number) {
  const db = await getDb(); if (!db) return undefined;
  const deviceResult = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.id, deviceId), eq(devices.ownerId, ownerId))).limit(1);
  if (!deviceResult[0]) return undefined;
  const [calls, contacts, usage, notifications] = await Promise.all([
    db.select().from(deviceCallLogs).where(eq(deviceCallLogs.deviceId, deviceId)).orderBy(desc(deviceCallLogs.startedAt)).limit(500),
    db.select().from(deviceContacts).where(eq(deviceContacts.deviceId, deviceId)).orderBy(deviceContacts.displayName).limit(1000),
    db.select().from(deviceUsageStats).where(eq(deviceUsageStats.deviceId, deviceId)).orderBy(desc(deviceUsageStats.totalTimeForegroundMillis)).limit(500),
    db.select().from(deviceNotifications).where(eq(deviceNotifications.deviceId, deviceId)).orderBy(desc(deviceNotifications.postedAt)).limit(500),
  ]);
  return { calls, contacts, usage, notifications };
}

export async function getTriviaProfile(ownerId: number, deviceId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select({ profile: triviaProfiles }).from(triviaProfiles).innerJoin(devices, eq(triviaProfiles.deviceId, devices.id)).where(and(eq(devices.ownerId, ownerId), eq(devices.id, deviceId))).limit(1);
  return result[0]?.profile;
}

export async function getTriviaProfileByDeviceId(deviceId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(triviaProfiles).where(eq(triviaProfiles.deviceId, deviceId)).limit(1);
  return result[0];
}

export async function getTriviaQuestionById(questionId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(triviaQuestions).where(eq(triviaQuestions.id, questionId)).limit(1);
  return result[0];
}

export async function getTriviaQuestions(language: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(triviaQuestions).where(and(eq(triviaQuestions.language, language), eq(triviaQuestions.active, 1)));
}

export async function hasTriviaAttempt(deviceId: number, questionId: number) {
  const db = await getDb(); if (!db) return false;
  const result = await db.select({ id: triviaAttempts.id }).from(triviaAttempts).where(and(eq(triviaAttempts.deviceId, deviceId), eq(triviaAttempts.questionId, questionId))).limit(1);
  return Boolean(result[0]);
}

export async function getRecentTriviaQuestionIds(deviceId: number, limit = 10) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ questionId: triviaAttempts.questionId }).from(triviaAttempts).where(eq(triviaAttempts.deviceId, deviceId)).orderBy(desc(triviaAttempts.answeredAt)).limit(limit);
  return rows.map(row => row.questionId);
}

export async function getAnsweredTriviaQuestionIds(deviceId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ questionId: triviaAttempts.questionId }).from(triviaAttempts).where(eq(triviaAttempts.deviceId, deviceId));
  return rows.map(row => row.questionId);
}

export async function recordTriviaAttempt(input: { deviceId: number; questionId: number; selectedOptionIndex: number; isCorrect: boolean; pointsAwarded: number }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(triviaAttempts).values({ deviceId: input.deviceId, questionId: input.questionId, selectedOptionIndex: input.selectedOptionIndex, isCorrect: input.isCorrect ? 1 : 0, pointsAwarded: input.pointsAwarded });
  await db.update(triviaProfiles).set({ score: sql`${triviaProfiles.score} + ${input.pointsAwarded}`, bestScore: sql`GREATEST(${triviaProfiles.bestScore}, ${triviaProfiles.score} + ${input.pointsAwarded})`, updatedAt: new Date() }).where(eq(triviaProfiles.deviceId, input.deviceId));
  return getTriviaProfileByDeviceId(input.deviceId);
}

export async function createTriviaProfile(deviceId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(triviaProfiles).values({ deviceId }).onDuplicateKeyUpdate({ set: { deviceId } });
  return getTriviaProfileByDeviceId(deviceId);
}

export async function getAdminCredentialByUsername(username: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(adminCredentials).where(eq(adminCredentials.username, username)).limit(1);
  return result[0];
}

export async function createAdminCredential(input: typeof adminCredentials.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(adminCredentials).values(input).onDuplicateKeyUpdate({ set: { username: input.username } });
  return getAdminCredentialByUsername(input.username);
}

export async function updateAdminCredential(username: string, input: { passwordHash: string; passwordSalt: string }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(adminCredentials).set({ ...input, sessionVersion: sql`${adminCredentials.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(adminCredentials.username, username));
  return getAdminCredentialByUsername(username);
}

export async function createInvitation(input: typeof invitations.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(invitations).values(input);
  const result = await db.select().from(invitations).where(eq(invitations.token, input.token)).limit(1);
  return result[0];
}

export function isInvitationActive(invitation: { acceptedAt: Date | null; expiresAt: Date }, now = new Date()) { return invitation.acceptedAt === null && invitation.expiresAt.getTime() > now.getTime(); }

export async function getValidInvitation(token: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(invitations).where(and(eq(invitations.token, token), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date()))).limit(1);
  return result[0];
}

export async function acceptInvitation(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, id));
}
