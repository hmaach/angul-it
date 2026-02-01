import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CaptchaService } from '../services/captcha.service';

@Injectable({
  providedIn: 'root',
})
export class ResultGuard implements CanActivate {
  private router = inject(Router);
  private captchaService = inject(CaptchaService);

  canActivate(): boolean {
    if (this.captchaService.canAccessResult()) {
      return true;
    }
    this.router.navigate(['/']);
    return false;
  }
}
