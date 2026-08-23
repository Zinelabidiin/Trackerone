export type TriviaLadderLevel = {
  level: number;
  minimumScore: number;
  nickname: string;
  emoji: string;
  encouragement: string;
};

export const TRIVIA_LADDER: TriviaLadderLevel[] = [
  { level: 1, minimumScore: 0, nickname: "Curieux en herbe", emoji: "🌱", encouragement: "Toute grande légende commence par une question." },
  { level: 2, minimumScore: 50, nickname: "Détective du dimanche", emoji: "🕵️", encouragement: "Vous enquêtez déjà mieux que prévu." },
  { level: 3, minimumScore: 150, nickname: "Renard à neurones", emoji: "🦊", encouragement: "Rusé, mais pas encore impossible à battre." },
  { level: 4, minimumScore: 300, nickname: "Machine à devinettes", emoji: "🤖", encouragement: "Votre cerveau vient de passer en mode turbo." },
  { level: 5, minimumScore: 500, nickname: "Maître du presque-sûr", emoji: "😏", encouragement: "Vous dites “je le savais” avec une étonnante confiance." },
  { level: 6, minimumScore: 800, nickname: "Oracle du goûter", emoji: "🔮", encouragement: "Même les biscuits demandent votre avis." },
  { level: 7, minimumScore: 1200, nickname: "Sherlock du canapé", emoji: "🛋️", encouragement: "L’enquête avance, sans quitter votre zone de confort." },
  { level: 8, minimumScore: 1800, nickname: "Boss du quiz", emoji: "👑", encouragement: "Les mauvaises réponses commencent à vous éviter." },
  { level: 9, minimumScore: 2500, nickname: "Légende qui chipote", emoji: "🏆", encouragement: "Vous avez toujours un détail à ajouter." },
  { level: 10, minimumScore: 3500, nickname: "Grand maître du “je le savais”", emoji: "🧠", encouragement: "Personne ne vous croit avant la réponse." },
];

export function getTriviaLadderLevel(score: number) {
  return [...TRIVIA_LADDER].reverse().find(level => score >= level.minimumScore) ?? TRIVIA_LADDER[0];
}

export function getTriviaLadderProgress(score: number) {
  const current = getTriviaLadderLevel(score);
  const next = TRIVIA_LADDER.find(level => level.minimumScore > score) ?? null;
  if (!next) return { current, next: null, pointsNeeded: 0, percent: 100 };
  const span = next.minimumScore - current.minimumScore;
  return { current, next, pointsNeeded: next.minimumScore - score, percent: Math.min(100, Math.round(((score - current.minimumScore) / span) * 100)) };
}
