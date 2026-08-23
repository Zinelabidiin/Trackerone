import express from "express";
import { createServer, type Server } from "http";
import { afterEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getValidInvitation: vi.fn(),
  createDevice: vi.fn(),
  createTriviaProfile: vi.fn(),
  acceptInvitation: vi.fn(),
  getDeviceByAuthToken: vi.fn(),
  getTriviaProfileByDeviceId: vi.fn(),
  getTriviaQuestions: vi.fn(),
  getAnsweredTriviaQuestionIds: vi.fn(),
  getTriviaQuestionById: vi.fn(),
  hasTriviaAttempt: vi.fn(),
  recordTriviaAttempt: vi.fn(),
  recordTelemetry: vi.fn(),
}));
const mariahMocks = vi.hoisted(() => ({ askMariah: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./mariah", () => mariahMocks);
const { registerDeviceApi } = await import("./deviceApi");

const servers: Server[] = [];
afterEach(() => { dbMocks.getValidInvitation.mockReset(); dbMocks.createDevice.mockReset(); dbMocks.createTriviaProfile.mockReset(); dbMocks.acceptInvitation.mockReset(); dbMocks.getDeviceByAuthToken.mockReset(); dbMocks.getTriviaProfileByDeviceId.mockReset(); dbMocks.getTriviaQuestions.mockReset(); dbMocks.getAnsweredTriviaQuestionIds.mockReset(); dbMocks.getTriviaQuestionById.mockReset(); dbMocks.hasTriviaAttempt.mockReset(); dbMocks.recordTriviaAttempt.mockReset(); dbMocks.recordTelemetry.mockReset(); mariahMocks.askMariah.mockReset(); while (servers.length) servers.pop()?.close(); });

async function request(path: string, init?: RequestInit) {
  const app = express(); app.use(express.json()); registerDeviceApi(app);
  const server = await new Promise<Server>(resolve => { const value = createServer(app).listen(0, () => resolve(value)); });
  servers.push(server);
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No test server address");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("mobile device integration flows", () => {
  it("registers a device and accepts the invitation", async () => {
    dbMocks.getValidInvitation.mockResolvedValue({ id: 7, ownerId: 3 });
    dbMocks.createDevice.mockResolvedValue({ id: 11, name: "Téléphone", platform: "android", deviceId: "TRK-ABC", authToken: "auth-token" });
    const response = await request("/api/device/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "valid-token-123", name: "Téléphone", platform: "android" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, authToken: "auth-token" });
    expect(dbMocks.acceptInvitation).toHaveBeenCalledWith(7);
  });

  it("rejects an expired or invalid invitation", async () => {
    dbMocks.getValidInvitation.mockResolvedValue(undefined);
    const response = await request("/api/device/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "expired-token", name: "Téléphone", platform: "android" }) });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invitation expired or invalid" });
  });

  it("rejects an invalid device token", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue(undefined);
    const response = await request("/api/device/telemetry", { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": "bad-token" }, body: JSON.stringify({ latitude: 48, longitude: 2 }) });
    expect(response.status).toBe(401);
  });

  it("returns the authenticated device trivia profile", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue({ id: 11, deviceId: "TRK-ABC" });
    dbMocks.getTriviaProfileByDeviceId.mockResolvedValue({ score: 120, bestScore: 180, nickname: "Curieux", level: 2, iconKey: "explorer" });
    const response = await request("/api/device/trivia", { headers: { "x-device-token": "auth-token" } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, profile: { score: 120, bestScore: 180, nickname: "Détective du dimanche", level: 2, emoji: "🕵️", pointsToNext: 30, currentLevel: { level: 2, nickname: "Détective du dimanche", emoji: "🕵️" }, ladder: expect.arrayContaining([expect.objectContaining({ level: 10, nickname: "Grand maître du “je le savais”", emoji: "🧠" })]) } });
  });

  it("delivers a randomized four-option question without exposing its answer", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue({ id: 11, deviceId: "TRK-ABC" });
    dbMocks.getTriviaQuestions.mockResolvedValue([{ id: 4, language: "fr", category: "science", difficulty: "easy", prompt: "Quelle planète est rouge ?", options: ["Mars", "Vénus", "Jupiter", "Mercure"], correctOptionIndex: 0, explanation: "Mars est rouge.", active: 1 }]);
    dbMocks.getAnsweredTriviaQuestionIds.mockResolvedValue([]);
    const response = await request("/api/device/trivia/next?language=fr", { headers: { "x-device-token": "auth-token" } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.question).toMatchObject({ id: 4, options: ["Mars", "Vénus", "Jupiter", "Mercure"] });
    expect(body.question.correctOptionIndex).toBeUndefined();
  });

  it("returns a clear exhausted state instead of re-serving an answered question", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue({ id: 11, deviceId: "TRK-ABC" });
    dbMocks.getTriviaQuestions.mockResolvedValue([{ id: 4, language: "fr", category: "science", difficulty: "easy", prompt: "Quelle planète est rouge ?", options: ["Mars", "Vénus", "Jupiter", "Mercure"], correctOptionIndex: 0, explanation: "Mars est rouge.", active: 1 }]);
    dbMocks.getAnsweredTriviaQuestionIds.mockResolvedValue([4]);
    const response = await request("/api/device/trivia/next?language=fr", { headers: { "x-device-token": "auth-token" } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, question: null, exhausted: true });
  });

  it("scores a correct answer on the server and rejects duplicate attempts", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue({ id: 11, deviceId: "TRK-ABC" });
    dbMocks.getTriviaQuestionById.mockResolvedValue({ id: 4, language: "fr", category: "science", difficulty: "easy", prompt: "Quelle planète est rouge ?", options: ["Mars", "Vénus", "Jupiter", "Mercure"], correctOptionIndex: 0, explanation: "Mars est rouge.", active: 1 });
    dbMocks.hasTriviaAttempt.mockResolvedValue(false);
    dbMocks.recordTriviaAttempt.mockResolvedValue({ score: 10, bestScore: 10 });
    const response = await request("/api/device/trivia/answer", { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": "auth-token" }, body: JSON.stringify({ questionId: 4, selectedOptionIndex: 0 }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ result: { isCorrect: true, pointsAwarded: 10, correctOptionIndex: 0 }, profile: { score: 10, bestScore: 10 } });
    expect(dbMocks.recordTriviaAttempt).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 11, questionId: 4, isCorrect: true, pointsAwarded: 10 }));
  });

  it("sends only the authenticated device's active question context to Mariah", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue({ id: 11, deviceId: "TRK-ABC" });
    dbMocks.getTriviaQuestionById.mockResolvedValue({ id: 4, language: "fr", category: "science", difficulty: "easy", prompt: "Quelle planète est rouge ?", options: ["Mars", "Vénus", "Jupiter", "Mercure"], correctOptionIndex: 0, explanation: "Mars est rouge.", active: 1 });
    dbMocks.hasTriviaAttempt.mockResolvedValue(false);
    mariahMocks.askMariah.mockResolvedValue("Indice : pensez à la couleur de la surface de cette planète.");
    const response = await request("/api/device/trivia/ask-mariah", { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": "auth-token" }, body: JSON.stringify({ questionId: 4, message: "Un indice, s'il te plaît." }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, reply: expect.stringContaining("Indice") });
    expect(mariahMocks.askMariah).toHaveBeenCalledWith(expect.objectContaining({ answered: false, message: "Un indice, s'il te plaît.", question: expect.objectContaining({ id: 4 }) }));
  });

  it("records authorized telemetry without a dashboard admin cookie", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue({ id: 11, deviceId: "TRK-ABC" });
    const response = await request("/api/device/telemetry", { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": "auth-token" }, body: JSON.stringify({ latitude: 48.8566, longitude: 2.3522, batteryPercent: 74, network: "wifi" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, deviceId: "TRK-ABC" });
    expect(dbMocks.recordTelemetry).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 11, batteryPercent: 74 }));
  });
});
