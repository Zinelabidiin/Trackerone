import { describe, expect, it } from "vitest";

describe("restored 1.8.0 Android artifact", () => {
  it("uses the stable 1.8.0 download path and serves the managed package", async () => {
    const path = process.env.VITE_ANDROID_DOWNLOAD_URL;
    expect(path).toBe("/manus-storage/my-trivia-hub-1.8.0_a910beff.apk");

    const response = await fetch(`https://trackdash-hxav5snp.manus.space${path}`, { method: "HEAD" });
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type") ?? "").toMatch(/application\/vnd\.android\.package-archive|application\/octet-stream|binary/);
  }, 30_000);
});
