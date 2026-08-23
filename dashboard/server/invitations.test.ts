import { describe, expect, it } from "vitest";
import { nanoid } from "nanoid";
import { appRouter } from "./routers";
import { isInvitationActive } from "./db";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("TrackerOne invitations", () => {
  it("creates URL-safe nanoid tokens with the requested length", () => {
    const token = nanoid(16);
    expect(token).toHaveLength(16);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("accepts a future, unused invitation as active", () => {
    expect(isInvitationActive({ acceptedAt: null, expiresAt: new Date(Date.now() + 60_000) })).toBe(true);
    expect(isInvitationActive({ acceptedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) })).toBe(false);
  });

  it("returns invalid for an unknown invitation token", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.invitations.validate({ token: "unknown-token-123" })).resolves.toEqual({ valid: false });
  });

  it("rejects device registration with an unknown token", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.devices.createFromInvite({ token: "unknown-token-123", name: "Téléphone", platform: "android" })).rejects.toThrow("expiré ou invalide");
  });
});
