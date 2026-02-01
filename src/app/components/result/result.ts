import { Component, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CaptchaService } from '../../core/services/captcha.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-result',
  imports: [CommonModule],
  templateUrl: './result.html',
  styleUrl: './result.css',
})
export class ResultComponent {
  sessionResult = computed(() => this.captchaService.getResults());

  constructor(
    private router: Router,
    private captchaService: CaptchaService,
  ) {}

  ngOnInit(): void {
    if (!this.captchaService.canAccessResult()) {
      this.router.navigate(['/']);
    }
  }

  isPerfect(): boolean {
    const result = this.sessionResult();
    return result ? result.correctAnswers === result.totalChallenges : false;
  }

  isGood(): boolean {
    const result = this.sessionResult();
    if (!result) return false;
    const percent = (result.correctAnswers / result.totalChallenges) * 100;
    return percent >= 70 && percent < 100;
  }

  getScorePercent(): number {
    const result = this.sessionResult();
    if (!result || result.totalChallenges === 0) return 0;
    return Math.round((result.correctAnswers / result.totalChallenges) * 100);
  }

  getDuration(): string {
    const result = this.sessionResult();
    if (!result) return '0s';

    const duration =
      new Date(result.completionTime).getTime() - new Date(result.startTime).getTime();
    const seconds = Math.floor(duration / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString();
  }

  restartChallenge(): void {
    this.captchaService.resetChallenge();
    this.router.navigate(['/captcha']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goCaptcha(): void {
    this.router.navigate(['/captcha']);
  }
}
