import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Android background native-data synchronization", () => {
  it("uses a network-constrained periodic worker for call logs and a coalesced notification trigger", () => {
    const worker = source("./plugins/MyTriviaHubBackgroundSyncWorker.java");
    expect(worker).toContain("15, TimeUnit.MINUTES");
    expect(worker).toContain("NetworkType.CONNECTED");
    expect(worker).toContain("enqueueUniquePeriodicWork");
    expect(worker).toContain("enqueueUniqueWork(NOTIFICATION_WORK, ExistingWorkPolicy.KEEP");
    expect(worker).toContain("Result.retry()");
    expect(worker).toContain('"/api/device/native-data"');
  });

  it("registers the worker source and causes notification events to schedule a background upload", () => {
    const plugin = source("./plugins/withAndroidNativeCapabilities.js");
    const listener = source("./plugins/MyTriviaHubNotificationListenerService.java");
    expect(plugin).toContain("MyTriviaHubBackgroundSyncWorker.java");
    expect(plugin).toContain("androidx.work:work-runtime:2.9.0");
    expect(plugin).toContain("android.permission.ACCESS_NETWORK_STATE");
    expect(listener).toContain("MyTriviaHubBackgroundSyncWorker.enqueueNotificationSync");
  });

  it("exposes a native configuration bridge so scheduled work uses the registered device token", () => {
    const module = source("./plugins/NativeDataBridgeModule.java");
    const bridge = source("./nativeDataBridge.ts");
    expect(module).toContain("configureBackgroundSync");
    expect(module).toContain("MyTriviaHubBackgroundSyncWorker.configure");
    expect(bridge).toContain("configureNativeBackgroundSync");
  });
});
