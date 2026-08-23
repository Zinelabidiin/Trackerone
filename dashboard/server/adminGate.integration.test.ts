import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("dashboard admin procedure", () => {
  it("rejects device queries without an admin session", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
      adminSession: null,
    });
    await expect(caller.devices.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
