export interface ChallengeResult {
  challengeId: number;
  isCorrect: boolean;
  attempts: number;
  completedAt: Date;
}

export interface SessionResult {
  sessionId: string;
  totalChallenges: number;
  completedChallenges: number;
  correctAnswers: number;
  incorrectAnswers: number;
  completionTime: Date;
  startTime: Date;
  results: ChallengeResult[];
}
