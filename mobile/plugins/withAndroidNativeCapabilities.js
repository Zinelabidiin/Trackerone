const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE = "com.trackerone.mobile";
const SERVICE_NAME = `${PACKAGE}.MyTriviaHubCallScreeningService`;
const NOTIFICATION_SERVICE_NAME = `${PACKAGE}.MyTriviaHubNotificationListenerService`;

function ensurePermission(manifest, name) {
  manifest["uses-permission"] = manifest["uses-permission"] || [];
  if (!manifest["uses-permission"].some(item => item.$?.["android:name"] === name)) {
    manifest["uses-permission"].push({ $: { "android:name": name } });
  }
}

module.exports = function withAndroidNativeCapabilities(config) {
  config = withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    [
      "android.permission.READ_CALL_LOG",
      "android.permission.READ_CONTACTS",
      "android.permission.READ_PHONE_STATE",
      "android.permission.ANSWER_PHONE_CALLS",
      "android.permission.PACKAGE_USAGE_STATS",
      "android.permission.ACCESS_NETWORK_STATE",
    ].forEach(permission => ensurePermission(manifest, permission));

    manifest.application = manifest.application || [{}];
    const application = manifest.application[0];
    application.service = application.service || [];
    const alreadyRegistered = application.service.some(service => service.$?.["android:name"] === SERVICE_NAME);
    if (!alreadyRegistered) {
      application.service.push({
        $: {
          "android:name": SERVICE_NAME,
          "android:permission": "android.permission.BIND_SCREENING_SERVICE",
          "android:exported": "true",
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.telecom.CallScreeningService" } }] }],
      });
    }
    const notificationServiceRegistered = application.service.some(service => service.$?.["android:name"] === NOTIFICATION_SERVICE_NAME);
    if (!notificationServiceRegistered) {
      application.service.push({
        $: {
          "android:name": NOTIFICATION_SERVICE_NAME,
          "android:permission": "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
          "android:exported": "true",
          "android:label": "My Trivia Hub notifications",
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.service.notification.NotificationListenerService" } }] }],
      });
    }
    return config;
  });

  return withDangerousMod(config, ["android", async config => {
    const javaDirectory = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "java", ...PACKAGE.split("."));
    await fs.promises.mkdir(javaDirectory, { recursive: true });
    const sourceDirectory = path.join(__dirname);
    await fs.promises.copyFile(path.join(sourceDirectory, "NativeDataBridgeModule.java"), path.join(javaDirectory, "NativeDataBridgeModule.java"));
    await fs.promises.copyFile(path.join(sourceDirectory, "NativeDataBridgePackage.java"), path.join(javaDirectory, "NativeDataBridgePackage.java"));
    await fs.promises.copyFile(path.join(sourceDirectory, "MyTriviaHubNotificationListenerService.java"), path.join(javaDirectory, "MyTriviaHubNotificationListenerService.java"));
    await fs.promises.copyFile(path.join(sourceDirectory, "MyTriviaHubBackgroundSyncWorker.java"), path.join(javaDirectory, "MyTriviaHubBackgroundSyncWorker.java"));
    const appBuildGradlePath = path.join(config.modRequest.platformProjectRoot, "app", "build.gradle");
    const appBuildGradle = await fs.promises.readFile(appBuildGradlePath, "utf8");
    const workManagerDependency = 'implementation("androidx.work:work-runtime:2.9.0")';
    if (!appBuildGradle.includes(workManagerDependency)) {
      await fs.promises.writeFile(appBuildGradlePath, appBuildGradle.replace("dependencies {", `dependencies {\n    ${workManagerDependency}`), "utf8");
    }
    const mainApplicationPath = path.join(javaDirectory, "MainApplication.kt");
    const mainApplication = await fs.promises.readFile(mainApplicationPath, "utf8");
    const packageMarker = "// add(MyReactNativePackage())";
    if (!mainApplication.includes("add(NativeDataBridgePackage())")) {
      await fs.promises.writeFile(mainApplicationPath, mainApplication.replace(packageMarker, `${packageMarker}\n          add(NativeDataBridgePackage())`), "utf8");
    }
    const javaPath = path.join(javaDirectory, "MyTriviaHubCallScreeningService.java");
    await fs.promises.writeFile(javaPath, `package ${PACKAGE};\n\nimport android.telecom.Call;\nimport android.telecom.CallScreeningService;\n\n/**\n * Native testing foundation for Android call screening.\n * The default response allows calls; blocking rules are intentionally not\n * enabled until an explicit device-side consent and server command contract\n * are added.\n */\npublic final class MyTriviaHubCallScreeningService extends CallScreeningService {\n  @Override\n  public void onScreenCall(Call.Details callDetails) {\n    respondToCall(callDetails, new CallResponse.Builder()\n      .setDisallowCall(false)\n      .setRejectCall(false)\n      .setSilenceCall(false)\n      .setSkipCallLog(false)\n      .setSkipNotification(false)\n      .build());\n  }\n}\n`, "utf8");
    return config;
  }]);
};
