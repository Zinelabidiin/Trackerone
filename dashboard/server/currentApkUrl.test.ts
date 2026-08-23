import { describe, expect, it } from "vitest";

describe("current My Trivia Hub APK secret", () => {
  it("points to a reachable managed APK artifact", async () => {
    const configuredPath = process.env.VITE_ANDROID_DOWNLOAD_URL;
    expect(configuredPath).toMatch(/^\/manus-storage\/my-trivia-hub-\d+\.\d+\.\d+_[a-z0-9]+\.apk$/);
    const response = await fetch(`https://trackdash-hxav5snp.manus.space${configuredPath}`, { method: "HEAD" });
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type") ?? "").toMatch(/application\/vnd\.android\.package-archive|application\/octet-stream|binary/);
  }, 30_000);
});
