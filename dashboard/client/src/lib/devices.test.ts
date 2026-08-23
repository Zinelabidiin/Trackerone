import { describe, expect, it } from "vitest";
import { getSelectedDevice } from "./devices";

describe("getSelectedDevice", () => {
  const devices = [{ id: 30001, name: "Phone n5" }, { id: 1, name: "Android one" }];

  it("defaults to the first registered device when no device is selected", () => {
    expect(getSelectedDevice(devices, null)?.name).toBe("Phone n5");
  });

  it("preserves an explicit device selection", () => {
    expect(getSelectedDevice(devices, 1)?.name).toBe("Android one");
  });
});
