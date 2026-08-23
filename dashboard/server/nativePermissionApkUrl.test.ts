import { describe, expect, it } from "vitest";

describe("My Trivia Hub 1.3.0 APK secret", () => {
  it("points to the reachable managed native-permission artifact", async () => {
    const configuredPath = "/manus-storage/my-trivia-hub-1.3.0_54f17410.apk";
    expect(configuredPath).toMatch(/my-trivia-hub-1\.3\.0_.*\.apk$/);
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
