import { Injectable, signal, computed, effect } from '@angular/core';
import {
  CaptchaChallenge,
  CaptchaType,
  CaptchaState,
  CaptchaOption,
} from '../models/captcha.model';
import { ChallengeResult, SessionResult } from '../models/result.model';

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
      isComplete: newCompletedStages.size === this.challenges?.length,
    }));

    return isCorrect;
  }

  private validateAnswer(challenge: CaptchaChallenge, answer: any): boolean {
    console.log('challenge: ', challenge);
    console.log('answer: ', answer);

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

  private validateImageSelection(
    challenge: CaptchaChallenge,
    selectedIds: string[] | undefined,
  ): boolean {
    if (!Array.isArray(selectedIds)) {
      return false;
    }

    const correctIds = challenge.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);

    if (selectedIds.length !== correctIds.length) return false;
    return correctIds.every((id) => selectedIds.includes(id));
  }

  private validateSliderPuzzle(challenge: CaptchaChallenge, position: number | undefined): boolean {
    if (typeof position !== 'number') return false;

    const targetPosition = challenge.options.find((opt) => opt.isCorrect)?.label;
    if (!targetPosition) return false;

    const target = parseInt(targetPosition, 10);
    return Math.abs(position - target) <= 5;
  }

  private validateMathQuestion(challenge: CaptchaChallenge, answer: number | undefined): boolean {
    if (typeof answer !== 'number') return false;

    const correctAnswer = challenge.options.find((opt) => opt.isCorrect)?.label;
    return answer === parseInt(correctAnswer || '0', 10);
  }

  goToNextStage(): boolean {
    const current = this.stateSignal().currentStage;
    if (current < this.challenges?.length - 1) {
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
      totalChallenges: this.challenges?.length,
      completedChallenges: state.completedStages?.length,
      correctAnswers: correctCount,
      incorrectAnswers: state.completedStages?.length - correctCount,
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
    // Random number of cat images (2-4)
    const numCats = Math.floor(Math.random() * 3) + 2;
    // Total images (6)
    const totalImages = 6;

    // Generate random cat indices (which positions will have cats)
    const catPositions = new Set<number>();
    while (catPositions.size < numCats) {
      catPositions.add(Math.floor(Math.random() * totalImages));
    }

    // Generate random cat numbers (1-10)
    const catNumbers: number[] = [];
    for (let i = 0; i < numCats; i++) {
      catNumbers.push(Math.floor(Math.random() * 10) + 1);
    }

    // Generate random non-cat numbers (1-10)
    const nonCatNumbers: number[] = [];
    for (let i = 0; i < totalImages - numCats; i++) {
      let num;
      do {
        num = Math.floor(Math.random() * 10) + 1;
      } while (catNumbers.includes(num));
      nonCatNumbers.push(num);
    }

    // Build options array
    const options: CaptchaOption[] = [];
    let catIndex = 0;
    let nonCatIndex = 0;

    for (let i = 0; i < totalImages; i++) {
      const isCat = catPositions.has(i);
      const imageNum = isCat ? catNumbers[catIndex++] : nonCatNumbers[nonCatIndex++];
      options.push({
        id: `img${i + 1}`,
        imageUrl: isCat ? `/images/cat${imageNum}.png` : `/images/random${imageNum}.png`,
        label: 'Image',
        isCorrect: isCat,
      });
    }

    // Generate random math problem (a + b = ? where a, b are 1-9)
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    const mathAnswer = num1 + num2;

    // Generate random slider position (20-80)
    const sliderTarget = Math.floor(Math.random() * 61) + 20;

    return [
      {
        id: 0,
        type: CaptchaType.IMAGE_SELECTION,
        question: 'Select all images with CATS',
        description: 'Click on all pictures that contain cats to prove you are human',
        requiredCorrect: numCats,
        options,
      },
      {
        id: 1,
        type: CaptchaType.MATH_QUESTION,
        question: `${num1} + ${num2} = ?`,
        description: 'Solve this simple math problem to continue',
        requiredCorrect: 1,
        options: [{ id: 'math1', label: mathAnswer.toString(), isCorrect: true }],
      },
      {
        id: 2,
        type: CaptchaType.SLIDER_PUZZLE,
        question: `Slide the handle to match the target position`,
        description: `Slide to ${sliderTarget}%`,
        requiredCorrect: 1,
        options: [{ id: 'slider1', label: sliderTarget.toString(), isCorrect: true }],
      },
    ];
  }
}
