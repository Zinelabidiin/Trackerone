import { describe, expect, it } from "vitest";

describe("OpenRouter server credential", () => {
  it("authenticates against the model catalog", async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    expect(apiKey).toBeTruthy();
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.ok).toBe(true);
    const payload = await response.json() as { data?: unknown[] };
    expect(Array.isArray(payload.data)).toBe(true);
  }, 30_000);
});
