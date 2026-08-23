import express from "express";
import { createServer, type Server } from "http";
import { scryptSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAdminCredentialByUsername: vi.fn(),
  createAdminCredential: vi.fn(),
  updateAdminCredential: vi.fn(),
  getDeviceByAuthToken: vi.fn(),
  recordTelemetry: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
const { registerAdminAuth } = await import("./adminAuth");
const { registerDeviceApi } = await import("./deviceApi");

const servers: Server[] = [];
const originalEnv = { username: process.env.DASHBOARD_ADMIN_1_USERNAME, password: process.env.DASHBOARD_ADMIN_1_PASSWORD };
const currentCredential = { id: 1, username: "admin", passwordHash: scryptSync("CurrentPassword1", "test-salt", 64).toString("hex"), passwordSalt: "test-salt", sessionVersion: 1, updatedAt: new Date() };

afterEach(() => {
  process.env.DASHBOARD_ADMIN_1_USERNAME = originalEnv.username;
  process.env.DASHBOARD_ADMIN_1_PASSWORD = originalEnv.password;
  dbMocks.getAdminCredentialByUsername.mockReset();
  dbMocks.createAdminCredential.mockReset();
  dbMocks.updateAdminCredential.mockReset();
  dbMocks.getDeviceByAuthToken.mockReset();
  dbMocks.recordTelemetry.mockReset();
  while (servers.length) servers.pop()?.close();
});

async function request(path: string, init?: RequestInit, includeMobileApi = false) {
  const app = express(); app.use(express.json()); registerAdminAuth(app); if (includeMobileApi) registerDeviceApi(app);
  const server = await new Promise<Server>(resolve => { const value = createServer(app).listen(0, () => resolve(value)); });
  servers.push(server);
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No test server address");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("admin password profile endpoint", () => {
  it("bootstraps a missing credential row with a salted hash", async () => {
    process.env.DASHBOARD_ADMIN_1_USERNAME = "admin";
    process.env.DASHBOARD_ADMIN_1_PASSWORD = "CurrentPassword1";
    dbMocks.getAdminCredentialByUsername.mockResolvedValue(undefined);
    dbMocks.createAdminCredential.mockImplementation(async (input: { username: string; passwordHash: string; passwordSalt: string }) => ({ ...currentCredential, ...input }));
    const response = await request("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "CurrentPassword1" }) });
    expect(response.status).toBe(200);
    expect(dbMocks.createAdminCredential).toHaveBeenCalledWith(expect.objectContaining({ username: "admin", passwordHash: expect.any(String), passwordSalt: expect.any(String) }));
    const created = dbMocks.createAdminCredential.mock.calls[0]?.[0];
    expect(created.passwordHash).not.toBe("CurrentPassword1");
    expect(created.passwordSalt).toHaveLength(32);
  });

  it("changes the current administrator password, refreshes the session, and invalidates the old cookie", async () => {
    process.env.DASHBOARD_ADMIN_1_USERNAME = "admin";
    process.env.DASHBOARD_ADMIN_1_PASSWORD = "CurrentPassword1";
    let credentialReads = 0;
    dbMocks.getAdminCredentialByUsername.mockImplementation(async () => credentialReads++ < 2 ? currentCredential : { ...currentCredential, sessionVersion: 2 });
    dbMocks.updateAdminCredential.mockImplementation(async (_username: string, input: { passwordHash: string; passwordSalt: string }) => ({ ...currentCredential, ...input, sessionVersion: 2 }));

    const login = await request("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "CurrentPassword1" }) });
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    const response = await request("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie ?? "" }, body: JSON.stringify({ currentPassword: "CurrentPassword1", newPassword: "NewSecurePassword2", confirmPassword: "NewSecurePassword2" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("my-trivia-hub-admin=");
    expect(dbMocks.updateAdminCredential).toHaveBeenCalledWith("admin", expect.objectContaining({ passwordHash: expect.any(String), passwordSalt: expect.any(String) }));

    const oldSession = await request("/api/admin/session", { headers: { Cookie: cookie ?? "" } });
    expect(oldSession.status).toBe(401);
  });

  it("keeps mobile token telemetry independent after the admin password flow", async () => {
    dbMocks.getDeviceByAuthToken.mockResolvedValue({ id: 9, deviceId: "TRK-9" });
    const response = await request("/api/device/telemetry", { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": "mobile-token" }, body: JSON.stringify({ latitude: 48.8, longitude: 2.3 }) }, true);
    expect(response.status).toBe(200);
    expect(dbMocks.recordTelemetry).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 9 }));
  });

  it("rejects a wrong current password and weak replacement password", async () => {
    process.env.DASHBOARD_ADMIN_1_USERNAME = "admin";
    process.env.DASHBOARD_ADMIN_1_PASSWORD = "CurrentPassword1";
    dbMocks.getAdminCredentialByUsername.mockResolvedValue(currentCredential);
    const login = await request("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "CurrentPassword1" }) });
    const cookie = login.headers.get("set-cookie")?.split(";")[0];

    const wrongCurrent = await request("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie ?? "" }, body: JSON.stringify({ currentPassword: "WrongPassword1", newPassword: "NewSecurePassword2", confirmPassword: "NewSecurePassword2" }) });
    expect(wrongCurrent.status).toBe(401);

    const weakReplacement = await request("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie ?? "" }, body: JSON.stringify({ currentPassword: "CurrentPassword1", newPassword: "short", confirmPassword: "short" }) });
    expect(weakReplacement.status).toBe(400);
  });
});
