import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CaptchaService } from '../../core/services/captcha.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
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
