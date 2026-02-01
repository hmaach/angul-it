export interface CaptchaChallenge {
  id: number;
  type: CaptchaType;
  question: string;
  description: string;
  requiredCorrect: number;
  options: CaptchaOption[];
  hints: string[];
}

export interface CaptchaOption {
  id: string;
  imageUrl?: string;
  label?: string;
  isCorrect: boolean;
  isSelected?: boolean;
}

export enum CaptchaType {
  IMAGE_SELECTION = 'image_selection',
  TEXT_INPUT = 'text_input',
  SLIDER_PUZZLE = 'slider_puzzle',
  MATH_QUESTION = 'math_question'
}

export interface CaptchaState {
  currentStage: number;
  totalStages: number;
  completedStages: number[];
  answers: Map<number, any>;
  startTime: Date;
  sessionId: string;
  isComplete: boolean;
}

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
