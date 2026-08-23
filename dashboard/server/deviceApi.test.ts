import { describe, expect, it } from "vitest";
import { nanoid } from "nanoid";
import { registrationSchema, telemetrySchema } from "./deviceApi";

describe("mobile device API validation", () => {
  it("accepts a valid registration payload", () => {
    const result = registrationSchema.safeParse({ token: nanoid(16), name: "Téléphone familial", platform: "android" });
    expect(result.success).toBe(true);
  });

  it("rejects malformed registration payloads", () => {
    expect(registrationSchema.safeParse({ token: "short", name: "", platform: "windows" }).success).toBe(false);
  });

  it("accepts bounded telemetry values", () => {
    const result = telemetrySchema.safeParse({ latitude: 48.8566, longitude: 2.3522, batteryPercent: 74, network: "wifi" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid telemetry values", () => {
    expect(telemetrySchema.safeParse({ latitude: 120, longitude: 2, batteryPercent: 140 }).success).toBe(false);
  });
});
