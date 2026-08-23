/** @vitest-environment node */
import express from "express";
import { createServer, type Server } from "http";
import { afterEach, describe, expect, it } from "vitest";
import { registerAdminAuth } from "./adminAuth";

const servers: Server[] = [];

afterEach(() => {
  while (servers.length) servers.pop()?.close();
});

async function request(path: string, init?: RequestInit) {
  const app = express();
  app.use(express.json());
  registerAdminAuth(app);
  const server = await new Promise<Server>(resolve => {
    const value = createServer(app).listen(0, () => resolve(value));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("admin dashboard authentication", () => {
  it("accepts only the configured administrator credentials and returns a session cookie", async () => {
    const response = await request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: process.env.DASHBOARD_ADMIN_1_USERNAME, password: process.env.DASHBOARD_ADMIN_1_PASSWORD }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("my-trivia-hub-admin=");
  });

  it("accepts the second configured administrator", async () => {
    const response = await request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: process.env.DASHBOARD_ADMIN_2_USERNAME, password: process.env.DASHBOARD_ADMIN_2_PASSWORD }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("my-trivia-hub-admin=");
  });

  it("rejects an unauthenticated session request", async () => {
    const response = await request("/api/admin/session");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ authenticated: false });
  });

  it("returns an authenticated session and clears it on logout", async () => {
    const login = await request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: process.env.DASHBOARD_ADMIN_1_USERNAME, password: process.env.DASHBOARD_ADMIN_1_PASSWORD }),
    });
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toContain("my-trivia-hub-admin=");

    const session = await request("/api/admin/session", { headers: { Cookie: cookie ?? "" } });
    expect(session.status).toBe(200);
    await expect(session.json()).resolves.toMatchObject({ authenticated: true, admin: { username: process.env.DASHBOARD_ADMIN_1_USERNAME } });

    const logout = await request("/api/admin/logout", { method: "POST", headers: { Cookie: cookie ?? "" } });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("my-trivia-hub-admin=");
  });

  it("rejects an unconfigured administrator username", async () => {
    const response = await request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "not-an-admin", password: process.env.DASHBOARD_ADMIN_1_PASSWORD }),
    });
    expect(response.status).toBe(401);
  });
});
