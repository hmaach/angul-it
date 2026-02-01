import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CaptchaService } from '../../core/services/captcha.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { gamePadlock, gameBlaster, gameOnTarget } from '@ng-icons/game-icons';

@Component({
  selector: 'app-home',
  imports: [CommonModule, NgIcon],
  templateUrl: './home.html',
  styleUrl: './home.css',
  viewProviders: [
    provideIcons({
      gamePadlock,
      gameBlaster,
      gameOnTarget,
    }),
  ],
})
export class HomeComponent {
  isLoading = false;

  constructor(
    private router: Router,
    private captchaService: CaptchaService,
  ) {}

  startChallenge(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.captchaService.resetChallenge();
      this.router.navigate(['/captcha']);
      this.isLoading = false;
    }, 500);
  }
}
