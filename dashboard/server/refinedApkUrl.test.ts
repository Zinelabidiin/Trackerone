import { describe, expect, it } from "vitest";

describe("refined My Trivia Hub APK secret", () => {
  it("points to the reachable current managed APK artifact", async () => {
    const configuredPath = process.env.VITE_ANDROID_DOWNLOAD_URL;
    expect(configuredPath).toMatch(/^\/manus-storage\/my-trivia-hub-\d+\.\d+\.\d+_[a-z0-9]+\.apk$/);
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(`https://trackdash-hxav5snp.manus.space${configuredPath}`, { method: "HEAD" });
        if (response.ok) break;
      } catch (error) {
        lastError = error;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
    if (!response) throw lastError ?? new Error("APK endpoint did not respond");
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type") ?? "").toMatch(/application\/vnd\.android\.package-archive|application\/octet-stream|binary/);
  }, 30_000);
});
