import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CaptchaType } from '../../core/models/captcha.model';
import { CaptchaService } from '../../core/services/captcha.service';

@Component({
  selector: 'app-captcha',
  imports: [CommonModule, FormsModule],
  templateUrl: './captcha.html',
  styleUrl: './captcha.css',
})
export class CaptchaComponent {
  CaptchaType = CaptchaType;

  currentStage = computed(() => this.captchaService.currentStage());
  totalStages = computed(() => this.captchaService.getChallenges().length);

  progressPercent = computed(() => {
    return Math.round(((this.currentStage() + 1) / this.totalStages()) * 100);
  });

  stages = computed(() => Array.from({ length: this.totalStages() }, (_, i) => i));

  currentChallenge = computed(() => {
    return this.captchaService.getCurrentChallenge();
  });

  showResults = signal(false);
  hasError = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  selectedImages = signal<string[]>([]);
  textAnswer = signal('');
  sliderValue = signal(0);

  private isDragging = false;

  constructor(
    private router: Router,
    private captchaService: CaptchaService,
  ) {}

  getChallengeTypeLabel(type: CaptchaType): string {
    const labels: Record<CaptchaType, string> = {
      [CaptchaType.IMAGE_SELECTION]: 'Image Selection',
      [CaptchaType.SLIDER_PUZZLE]: 'Slider Puzzle',
      [CaptchaType.MATH_QUESTION]: 'Math Challenge',
    };
    return labels[type] || type;
  }

  isOptionSelected(optionId: string): boolean {
    return this.selectedImages().includes(optionId);
  }

  toggleImageSelection(optionId: string): void {
    if (this.showResults()) return;

    this.selectedImages.update((selected) => {
      if (selected.includes(optionId)) {
        return selected.filter((id) => id !== optionId);
      } else {
        return [...selected, optionId];
      }
    });
    this.hasError.set(false);
  }

  onInputChange(): void {
    this.hasError.set(false);
  }

  canSubmit(): boolean {
    const challenge = this.currentChallenge();
    if (!challenge) return false;

    switch (challenge.type) {
      case CaptchaType.IMAGE_SELECTION:
        return this.selectedImages().length > 0;
      case CaptchaType.MATH_QUESTION:
        return this.textAnswer().toString().trim().length > 0;
      case CaptchaType.SLIDER_PUZZLE:
        return this.sliderValue() > 0;
      default:
        return false;
    }
  }

  submitAnswer(): void {
    const challenge = this.currentChallenge();
    if (!challenge) return;

    let answer: any;

    switch (challenge.type) {
      case CaptchaType.IMAGE_SELECTION:
        answer = this.selectedImages();
        break;
      case CaptchaType.MATH_QUESTION:
        answer = parseInt(this.textAnswer(), 10);
        break;
      case CaptchaType.SLIDER_PUZZLE:
        answer = this.sliderValue();
        break;
    }

    const isCorrect = this.captchaService.submitAnswer(challenge.id, answer);

    if (isCorrect) {
      this.successMessage.set('Correct! Well done.');
      this.hasError.set(false);
      this.showResults.set(true);
    } else {
      this.hasError.set(true);
      this.errorMessage.set(this.getErrorMessage(challenge.type));
    }
  }

  private getErrorMessage(type: CaptchaType): string {
    switch (type) {
      case CaptchaType.IMAGE_SELECTION:
        return 'Some selections are incorrect. Please try again.';
      case CaptchaType.MATH_QUESTION:
        return 'Incorrect answer. Please check your math.';
      case CaptchaType.SLIDER_PUZZLE:
        return 'The slider position is not correct. Try again.';
      default:
        return 'Incorrect answer. Please try again.';
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackById(index: number, item: { id: string }): string {
    return item.id;
  }

  trackByValue(index: number, item: string): string {
    return item;
  }

  goPrevious(): void {
    this.captchaService.goToPreviousStage();
    this.resetCurrentState();
  }

  goNext(): void {
    this.captchaService.goToNextStage();
    this.resetCurrentState();
  }

  goToStage(stage: number): void {
    if (stage < this.currentStage()) {
      this.captchaService.goToStage(stage);
      this.resetCurrentState();
    }
  }

  isLastStage(): boolean {
    return this.currentStage() === this.totalStages() - 1;
  }

  viewResults(): void {
    this.router.navigate(['/result']);
  }

  startDrag(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;

    const moveHandler = (e: MouseEvent | TouchEvent) => this.onDrag(e);
    const endHandler = () => this.stopDrag(moveHandler, endHandler);

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchend', endHandler);
  }

  private onDrag(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    const track = document.querySelector('.slider-track');
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;

    let percentage = ((clientX - rect.left) / rect.width) * 100;
    percentage = Math.max(0, Math.min(100, percentage));

    this.sliderValue.set(Math.round(percentage));
  }

  private stopDrag(moveHandler: any, endHandler: any): void {
    this.isDragging = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('mouseup', endHandler);
    document.removeEventListener('touchend', endHandler);
  }

  private resetCurrentState(): void {
    const challenge = this.currentChallenge();
    if (!challenge) return;

    this.showResults.set(false);
    this.hasError.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.selectedImages.set([]);
    this.textAnswer.set('');
    this.sliderValue.set(0);
  }
}
