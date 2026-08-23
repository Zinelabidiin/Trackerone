import { describe, expect, it } from "vitest";
import { getTriviaLadderLevel, getTriviaLadderProgress, TRIVIA_LADDER } from "./triviaLadder";

describe("trivia ladder", () => {
  it("maps scores to motivating levels and emoji states", () => {
    expect(getTriviaLadderLevel(0)).toMatchObject({ level: 1, nickname: "Curieux", emoji: "🌱" });
    expect(getTriviaLadderLevel(120)).toMatchObject({ level: 2, nickname: "Éclaireur du quiz", emoji: "🧭" });
    expect(getTriviaLadderLevel(3500)).toMatchObject({ level: 10, nickname: "Titan de la trivia", emoji: "👑" });
  });

  it("calculates progress toward the next level and caps at the top", () => {
    expect(getTriviaLadderProgress(120)).toMatchObject({ pointsNeeded: 30, percent: 70, next: TRIVIA_LADDER[2] });
    expect(getTriviaLadderProgress(4000)).toMatchObject({ pointsNeeded: 0, percent: 100, next: null });
  });
});
