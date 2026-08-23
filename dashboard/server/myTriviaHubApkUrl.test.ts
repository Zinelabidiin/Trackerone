import { describe, expect, it } from "vitest";

describe("My Trivia Hub APK download URL", () => {
  it("is configured as a managed APK artifact path", () => {
    const value = process.env.VITE_ANDROID_DOWNLOAD_URL;
    expect(value).toMatch(/^\/manus-storage\/my-trivia-hub-.*\.apk$/);
  });
});
