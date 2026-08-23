import { describe, expect, it } from "vitest";
import { formatLiveCoordinate, getLocationCardState } from "./location";

describe("location display mapping", () => {
  it("formats persisted GPS coordinates for the dashboard", () => {
    expect(formatLiveCoordinate("48.856613", "2.352222")).toBe("48.85661, 2.35222");
  });

  it("maps persisted telemetry to a visible live-location card", () => {
    expect(getLocationCardState({ latitude: "48.856613", longitude: "2.352222", recordedAt: "2026-08-15T18:00:00.000Z" })).toMatchObject({
      hasPosition: true,
      label: "Position actuelle",
      coordinate: "48.85661, 2.35222",
    });
  });

  it("returns the waiting state when telemetry has no usable coordinates", () => {
    expect(getLocationCardState({ latitude: null, longitude: null })).toMatchObject({
      hasPosition: false,
      label: "En attente du GPS",
      coordinate: "—",
    });
  });
});
