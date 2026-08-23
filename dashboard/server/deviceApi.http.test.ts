import express from "express";
import { createServer, type Server } from "http";
import { afterEach, describe, expect, it } from "vitest";
import { registerDeviceApi } from "./deviceApi";

const servers: Server[] = [];

afterEach(() => { while (servers.length) servers.pop()?.close(); });

async function request(path: string, init?: RequestInit) {
  const app = express();
  app.use(express.json());
  registerDeviceApi(app);
  const server = await new Promise<Server>(resolve => { const value = createServer(app).listen(0, () => resolve(value)); });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test server address");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("mobile device HTTP endpoints", () => {
  it("rejects malformed registration before database access", async () => {
    const response = await request("/api/device/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "short", name: "", platform: "desktop" }) });
    expect(response.status).toBe(400);
  });

  it("rejects telemetry without a device token", async () => {
    const response = await request("/api/device/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: 48, longitude: 2 }) });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Device token required" });
  });

  it("requires authentication for native call, contact, usage, and notification synchronization", async () => {
    const response = await request("/api/device/native-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callLogs: [], contacts: [], usage: [], notifications: [] }) });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Device token required" });
  });

  it("requires a device token before accepting an Ask Mariah request", async () => {
    const response = await request("/api/device/trivia/ask-mariah", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: 4, message: "Un indice ?" }) });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Device token required" });
  });
});
