export type TriviaLadderLevel = {
  level: number;
  minimumScore: number;
  nickname: string;
  emoji: string;
  encouragement: string;
};

export type TriviaProfile = {
  score: number;
  bestScore: number;
  nickname: string;
  level: number;
  emoji: string;
  encouragement: string;
  pointsToNext: number;
  progressPercent: number;
  currentLevel: TriviaLadderLevel;
  nextLevel: TriviaLadderLevel | null;
  ladder: TriviaLadderLevel[];
};

export const DEFAULT_TRIVIA_LEVEL: TriviaLadderLevel = {
  level: 1,
  minimumScore: 0,
  nickname: "Curieux en herbe",
  emoji: "🌱",
  encouragement: "Toute grande légende commence par une question.",
};

export function getProgressFromServer(profile: TriviaProfile) {
  return {
    pointsNeeded: Math.max(0, profile.pointsToNext),
    percent: Math.max(0, Math.min(100, profile.progressPercent)),
  };
}
