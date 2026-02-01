import { Injectable, signal, computed, effect } from '@angular/core';
import {
  CaptchaChallenge,
  CaptchaType,
  CaptchaState,
  CaptchaOption,
  SessionResult,
  ChallengeResult,
} from '../models/captcha.model';

@Injectable({
  providedIn: 'root',
})
export class CaptchaService {
  private readonly STORAGE_KEY = 'angul_it_captcha_state';
  private readonly RESULTS_KEY = 'angul_it_results';

  private stateSignal = signal<CaptchaState>(this.getInitialState());

  readonly currentStage = computed(() => this.stateSignal().currentStage);
  readonly completedStages = computed(() => this.stateSignal().completedStages);
  readonly isComplete = computed(() => this.stateSignal().isComplete);
  readonly sessionId = computed(() => this.stateSignal().sessionId);

  private challenges: CaptchaChallenge[] = this.generateChallenges();

  constructor() {
    this.loadState();

    effect(() => {
      this.saveState(this.stateSignal());
    });
  }

  private getInitialState(): CaptchaState {
    return {
      currentStage: 0,
      totalStages: this.challenges?.length | 0,
      completedStages: [],
      answers: new Map(),
      startTime: new Date(),
      sessionId: this.generateSessionId(),
      isComplete: false,
    };
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private loadState(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.stateSignal.set({
          ...parsed,
          startTime: new Date(parsed.startTime),
          answers: new Map(Object.entries(parsed.answers || {})),
        });
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }

  private saveState(state: CaptchaState): void {
    try {
      const stateToSave = {
        ...state,
        answers: Object.fromEntries(state.answers),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  getChallenges(): CaptchaChallenge[] {
    return this.challenges;
  }

  getCurrentChallenge(): CaptchaChallenge {
    const stage = this.stateSignal().currentStage;
    return this.challenges[stage] || this.challenges[0];
  }

  submitAnswer(stageId: number, answer: any): boolean {
    const challenge = this.challenges[stageId];
    if (!challenge) return false;

    console.log(answer);
    

    const isCorrect = this.validateAnswer(challenge, answer);
    const currentAnswers = this.stateSignal().answers;
    currentAnswers.set(stageId, answer);

    const newCompletedStages = new Set(this.stateSignal().completedStages);
    newCompletedStages.add(stageId);

    this.stateSignal.update((state) => ({
      ...state,
      answers: new Map(currentAnswers),
      completedStages: Array.from(newCompletedStages),
      isComplete: newCompletedStages.size === this.challenges.length,
    }));

    return isCorrect;
  }

  private validateAnswer(challenge: CaptchaChallenge, answer: any): boolean {
    switch (challenge.type) {
      case CaptchaType.IMAGE_SELECTION:
        return this.validateImageSelection(challenge, answer);
      case CaptchaType.SLIDER_PUZZLE:
        return this.validateSliderPuzzle(challenge, answer);
      case CaptchaType.MATH_QUESTION:
        return this.validateMathQuestion(challenge, answer);
      default:
        return false;
    }
  }

  private validateImageSelection(challenge: CaptchaChallenge, selectedIds: string[]): boolean {
    const correctIds = challenge.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);

    if (selectedIds.length !== correctIds.length) return false;
    return correctIds.every((id) => selectedIds.includes(id));
  }

  private validateSliderPuzzle(challenge: CaptchaChallenge, position: number): boolean {
    console.log(position);

    const targetPosition = challenge.options.find((opt) => opt.isCorrect)?.label;
    if (!targetPosition) return false;
    const target = parseInt(targetPosition, 10);
    return Math.abs(position - target) <= 5;
  }

  private validateMathQuestion(challenge: CaptchaChallenge, answer: number): boolean {
    const correctAnswer = challenge.options.find((opt) => opt.isCorrect)?.label;
    return answer === parseInt(correctAnswer || '0', 10);
  }

  goToNextStage(): boolean {
    const current = this.stateSignal().currentStage;
    if (current < this.challenges.length - 1) {
      this.goToStage(current + 1);
      return true;
    }
    return false;
  }

  goToPreviousStage(): boolean {
    const current = this.stateSignal().currentStage;
    if (current > 0) {
      this.goToStage(current - 1);
      return true;
    }
    return false;
  }

  goToStage(stage: number): void {
    this.stateSignal.update((state) => ({
      ...state,
      currentStage: stage,
    }));
  }

  resetChallenge(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.RESULTS_KEY);
    this.stateSignal.set(this.getInitialState());
    this.challenges = this.generateChallenges();
  }

  getResults(): SessionResult | null {
    const state = this.stateSignal();
    const stored = localStorage.getItem(this.RESULTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    if (!state.isComplete) return null;

    const results: ChallengeResult[] = [];
    let correctCount = 0;

    state.completedStages.forEach((stageId) => {
      const answer = state.answers.get(stageId);
      const challenge = this.challenges[stageId];
      const isCorrect = this.validateAnswer(challenge, answer);
      if (isCorrect) correctCount++;

      results.push({
        challengeId: stageId,
        isCorrect,
        attempts: 1,
        completedAt: new Date(),
      });
    });

    const sessionResult: SessionResult = {
      sessionId: state.sessionId,
      totalChallenges: this.challenges.length,
      completedChallenges: state.completedStages.length,
      correctAnswers: correctCount,
      incorrectAnswers: state.completedStages.length - correctCount,
      startTime: state.startTime,
      completionTime: new Date(),
      results,
    };

    localStorage.setItem(this.RESULTS_KEY, JSON.stringify(sessionResult));
    return sessionResult;
  }

  isStageCompleted(stageId: number): boolean {
    return this.stateSignal().completedStages.includes(stageId);
  }

  canAccessResult(): boolean {
    return this.stateSignal().isComplete;
  }

  private generateChallenges(): CaptchaChallenge[] {
    return [
      {
        id: 0,
        type: CaptchaType.IMAGE_SELECTION,
        question: 'Select all images with CATS',
        description: 'Click on all pictures that contain cats to prove you are human',
        requiredCorrect: 2,
        options: [
          { id: 'img1', imageUrl: '🐱', label: 'Cat Image 1', isCorrect: true },
          { id: 'img2', imageUrl: '🐶', label: 'Dog Image 1', isCorrect: false },
          { id: 'img3', imageUrl: '🐱', label: 'Cat Image 2', isCorrect: true },
          { id: 'img4', imageUrl: '🐦', label: 'Bird Image 1', isCorrect: false },
          { id: 'img5', imageUrl: '🚗', label: 'Car Image 1', isCorrect: false },
          { id: 'img6', imageUrl: '🐱', label: 'Cat Image 3', isCorrect: true },
        ],
      },
      {
        id: 1,
        type: CaptchaType.MATH_QUESTION,
        question: 'Simple Math Verification',
        description: 'Solve this simple math problem to continue',
        requiredCorrect: 1,
        options: [{ id: 'math1', label: '7', isCorrect: true }],
      },
      {
        id: 4,
        type: CaptchaType.SLIDER_PUZZLE,
        question: 'Slider Verification',
        description: 'Slide the handle to match the target position (target: 50%)',
        requiredCorrect: 1,
        options: [{ id: 'slider1', label: '50', isCorrect: true }],
      },
    ];
  }
}
