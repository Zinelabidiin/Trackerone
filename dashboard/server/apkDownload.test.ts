import { describe, expect, it } from "vitest";

describe("configured Android APK download", () => {
  it("resolves the configured public artifact path", async () => {
    const configured = process.env.VITE_ANDROID_DOWNLOAD_URL;
    expect(configured).toBeTruthy();
    const url = configured?.startsWith("http") ? configured : `https://trackdash-hxav5snp.manus.space${configured}`;
    const response = await fetch(url!, { method: "HEAD" });
    expect(response.ok).toBe(true);
  }, 30_000);
});
