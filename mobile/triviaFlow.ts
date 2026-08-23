export type TriviaFlowQuestion = { id: number; options: string[] };

export function getTriviaCardState(input: { loading: boolean; error: string | null; question: TriviaFlowQuestion | null }) {
  if (input.loading) return "loading" as const;
  if (input.error) return "error" as const;
  if (input.question) return "question" as const;
  return "empty" as const;
}

export function getAnswerFeedback(input: { selectedOptionIndex: number; correctOptionIndex: number; pointsAwarded: number; explanation: string }) {
  const isCorrect = input.selectedOptionIndex === input.correctOptionIndex;
  return { isCorrect, pointsAwarded: isCorrect ? input.pointsAwarded : 0, explanation: input.explanation, correctOptionIndex: input.correctOptionIndex };
}
