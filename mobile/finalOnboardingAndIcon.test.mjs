import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = path => readFileSync(new URL(path, import.meta.url), "utf8");

describe("final Android onboarding and icon configuration", () => {
  it("runs authorized native-data setup before initiating the location permission flow", () => {
    const app = source("./App.tsx");
    const setupIndex = app.indexOf("await prepareAndroidNativePermissions()");
    const locationIndex = app.indexOf("await startBackgroundTracking()", setupIndex);
    expect(app).toContain('NATIVE_PERMISSION_PROBE_KEY = "mytriviahub_native_permission_probe_v3"');
    expect(setupIndex).toBeGreaterThan(-1);
    expect(locationIndex).toBeGreaterThan(setupIndex);
  });

  it("uses the generated cube assets for launcher and adaptive Android icon paths", () => {
    const config = JSON.parse(source("./app.json"));
    expect(config.expo.icon).toBe("./assets/icon.png");
    expect(config.expo.android.adaptiveIcon.foregroundImage).toBe("./assets/android-icon-foreground.png");
    expect(config.expo.android.adaptiveIcon.backgroundImage).toBe("./assets/android-icon-background.png");
    expect(config.expo.android.adaptiveIcon.monochromeImage).toBe("./assets/android-icon-monochrome.png");
    ["assets/icon.png", "assets/android-icon-foreground.png", "assets/android-icon-background.png", "assets/android-icon-monochrome.png"].forEach(asset => {
      const file = new URL(`./${asset}`, import.meta.url);
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file).subarray(1, 4).toString("ascii")).toBe("PNG");
    });
  });
});
