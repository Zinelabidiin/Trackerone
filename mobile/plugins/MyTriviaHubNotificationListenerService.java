package com.trackerone.mobile;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

public final class MyTriviaHubNotificationListenerService extends NotificationListenerService {
  static final String PREFS = "mytriviahub_notification_feed";
  static final String EVENTS = "events";
  private static final int MAX_EVENTS = 500;

  @Override
  public void onNotificationPosted(StatusBarNotification sbn) {
    if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
    try {
      Notification notification = sbn.getNotification();
      if (notification == null || notification.extras == null) return;
      JSONObject event = new JSONObject();
      event.put("key", sbn.getKey());
      event.put("packageName", sbn.getPackageName());
      event.put("appName", resolveAppName(sbn.getPackageName()));
      event.put("title", stringValue(notification.extras.getCharSequence(Notification.EXTRA_TITLE)));
      event.put("body", stringValue(notification.extras.getCharSequence(Notification.EXTRA_TEXT)));
      event.put("postedAt", sbn.getPostTime());

      SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONArray previous = new JSONArray(prefs.getString(EVENTS, "[]"));
      JSONArray next = new JSONArray();
      next.put(event);
      for (int index = 0; index < previous.length() && next.length() < MAX_EVENTS; index++) {
        JSONObject candidate = previous.optJSONObject(index);
        if (candidate != null && !sbn.getKey().equals(candidate.optString("key"))) next.put(candidate);
      }
      prefs.edit().putString(EVENTS, next.toString()).apply();
      MyTriviaHubBackgroundSyncWorker.enqueueNotificationSync(getApplicationContext());
    } catch (Exception ignored) {
      // Notification access is optional; a malformed notification must not crash the listener.
    }
  }

  private String resolveAppName(String packageName) {
    try {
      PackageManager packageManager = getPackageManager();
      ApplicationInfo info = packageManager.getApplicationInfo(packageName, 0);
      CharSequence label = packageManager.getApplicationLabel(info);
      return stringValue(label);
    } catch (Exception ignored) {
      return packageName;
    }
  }

  private String stringValue(CharSequence value) {
    return value == null ? "" : value.toString();
  }
}
