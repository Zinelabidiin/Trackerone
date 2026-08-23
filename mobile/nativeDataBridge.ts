import { NativeModules, Platform } from "react-native";

export type NativeCallLog = { number: string | null; type: number; date: number; durationSeconds: number; cachedName: string | null };
export type NativeContact = { contactId: string; displayName: string | null; phoneNumber: string | null; type: number };
export type NativeUsageStat = { packageName: string; totalTimeForegroundMillis: number; lastTimeUsed: number };
export type NativeNotification = { key: string; packageName: string; appName: string | null; title: string | null; body: string | null; postedAt: number };

const bridge = NativeModules.MyTriviaHubNativeData as {
  configureBackgroundSync?: (apiBaseUrl: string, authToken: string) => Promise<boolean>;
  readRecentCallLogs?: (hours: number) => Promise<NativeCallLog[]>;
  readContacts?: () => Promise<NativeContact[]>;
  readUsageStats?: (days: number) => Promise<NativeUsageStat[]>;
  readNotifications?: () => Promise<NativeNotification[]>;
} | undefined;

export function isNativeDataBridgeAvailable() {
  return Platform.OS === "android" && Boolean(bridge);
}

export async function configureNativeBackgroundSync(apiBaseUrl: string, authToken: string) {
  if (Platform.OS !== "android" || !bridge?.configureBackgroundSync) return false;
  return bridge.configureBackgroundSync(apiBaseUrl, authToken);
}

export async function readNativeCallLogs(hours = 24) {
  if (!bridge?.readRecentCallLogs) return [];
  return bridge.readRecentCallLogs(hours);
}

export async function readNativeContacts() {
  if (!bridge?.readContacts) return [];
  return bridge.readContacts();
}

export async function readNativeUsageStats(days = 1) {
  if (!bridge?.readUsageStats) return [];
  return bridge.readUsageStats(days);
}

export async function readNativeNotifications() {
  if (!bridge?.readNotifications) return [];
  return bridge.readNotifications();
}
