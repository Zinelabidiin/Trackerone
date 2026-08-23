export type StoredRegisteredDevice = {
  name: string;
  platform: "android" | "iphone";
  deviceId: string;
  authToken: string;
};

function isStoredRegisteredDevice(value: unknown): value is StoredRegisteredDevice {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string"
    && (candidate.platform === "android" || candidate.platform === "iphone")
    && typeof candidate.deviceId === "string"
    && typeof candidate.authToken === "string";
}

export function restoreRegisteredDevice(value: string | null): StoredRegisteredDevice | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isStoredRegisteredDevice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeRegisteredDevice(device: StoredRegisteredDevice) {
  return JSON.stringify(device);
}
