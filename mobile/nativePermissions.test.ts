import { describe, expect, it, vi } from "vitest";

const request = vi.fn(async permission => permission === "READ_CALL_LOG" ? "granted" : "denied");
const startActivityAsync = vi.fn(async () => undefined);

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  PermissionsAndroid: {
    request,
    PERMISSIONS: { READ_CALL_LOG: "READ_CALL_LOG", READ_CONTACTS: "READ_CONTACTS" },
    RESULTS: { GRANTED: "granted" },
  },
}));
vi.mock("expo-intent-launcher", () => ({ ActivityAction: { USAGE_ACCESS_SETTINGS: "android.settings.USAGE_ACCESS_SETTINGS" }, startActivityAsync }));

const { prepareAndroidNativePermissions } = await import("./nativePermissions");

describe("Android native permission preparation", () => {
  it("requests call log, then contacts, and then opens Usage Access before location is requested by the app", async () => {
    const result = await prepareAndroidNativePermissions();
    expect(request.mock.invocationCallOrder[0]).toBeLessThan(request.mock.invocationCallOrder[1]);
    expect(request).toHaveBeenNthCalledWith(1, "READ_CALL_LOG");
    expect(request).toHaveBeenNthCalledWith(2, "READ_CONTACTS");
    expect(startActivityAsync).toHaveBeenCalledTimes(2);
    expect(startActivityAsync).toHaveBeenNthCalledWith(1, "android.settings.USAGE_ACCESS_SETTINGS");
    expect(startActivityAsync).toHaveBeenNthCalledWith(2, undefined);
    expect(result.callLog).toBe("granted");
    expect(result.contacts).toBe("denied");
    expect(result.phoneState).toBe("unavailable");
    expect(result.answerCalls).toBe("unavailable");
    expect(result.usageAccess).toBe("settings");
    expect(result.callScreening).toBe("unavailable");
    expect(result.notificationAccess).toBe("settings");
  });
});
