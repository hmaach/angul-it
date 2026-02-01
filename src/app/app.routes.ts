import { Routes } from '@angular/router';
import { ResultGuard } from './core/guards/result.guard';
import { ResultComponent } from './components/result/result';
import { HomeComponent } from './components/home/home';
import { CaptchaComponent } from './components/captcha/captcha';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'captcha', component: CaptchaComponent },
  {
    path: 'result',
    component: ResultComponent,
    canActivate: [ResultGuard],
  },
  { path: '**', redirectTo: '' },
];
