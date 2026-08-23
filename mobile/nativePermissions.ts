import { Platform, PermissionsAndroid } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";

export type NativePermissionState = {
  callLog: "granted" | "denied" | "unavailable";
  contacts: "granted" | "denied" | "unavailable";
  phoneState: "granted" | "denied" | "unavailable";
  answerCalls: "granted" | "denied" | "unavailable";
  usageAccess: "settings" | "unavailable";
  callScreening: "settings" | "unavailable";
  notificationAccess: "settings" | "unavailable";
};

const CALL_SCREENING_SETTINGS = "android.telecom.action.CHANGE_DEFAULT_CALL_SCREENING_APP";

async function openSystemSetting(action: string) {
  try {
    await IntentLauncher.startActivityAsync(action as IntentLauncher.ActivityAction);
  } catch {
    // Some OEMs do not expose the optional settings activity.
  }
}

export async function prepareAndroidNativePermissions(): Promise<NativePermissionState> {
  if (Platform.OS !== "android") {
    return { callLog: "unavailable", contacts: "unavailable", phoneState: "unavailable", answerCalls: "unavailable", usageAccess: "unavailable", callScreening: "unavailable", notificationAccess: "unavailable" };
  }

  // Keep the user-facing first-run flow intentional: data readers first,
  // Android Usage Access second, and only then let the app request location.
  const callLog = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
  const contacts = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);

  await openSystemSetting(IntentLauncher.ActivityAction.USAGE_ACCESS_SETTINGS);
  await openSystemSetting(IntentLauncher.ActivityAction.NOTIFICATION_LISTENER_SETTINGS);

  return {
    callLog: callLog === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied",
    contacts: contacts === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied",
    phoneState: "unavailable",
    answerCalls: "unavailable",
    usageAccess: "settings",
    callScreening: "unavailable",
    notificationAccess: "settings",
  };
}
