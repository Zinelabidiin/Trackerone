import { describe, expect, it } from "vitest";
import { buildMariahSystemPrompt } from "./mariah";

const question = { category: "science", difficulty: "easy" as const, prompt: "Quelle planète est rouge ?", options: ["Mars", "Vénus", "Jupiter", "Mercure"], correctOptionIndex: 0, explanation: "Mars paraît rouge à cause de l'oxyde de fer.", active: 1 };

describe("Mariah trivia guardrails", () => {
  it("limits the pre-answer context to a non-revealing hint policy", () => {
    const prompt = buildMariahSystemPrompt(question, false);
    expect(prompt).toContain("only discuss the active trivia question");
    expect(prompt).toContain("do not reveal the solution");
    expect(prompt).not.toContain("Correct option: A");
    expect(prompt).not.toContain(question.explanation);
  });

  it("permits an explanation only after an answer has been recorded", () => {
    const prompt = buildMariahSystemPrompt(question, true);
    expect(prompt).toContain("Correct option: A");
    expect(prompt).toContain(question.explanation);
  });
});
