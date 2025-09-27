import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CandidateAuthService } from '../services/candidate-auth.service';

@Injectable({
  providedIn: 'root'
})
export class CandidateGuestGuard implements CanActivate {
  constructor(
    private candidateAuthService: CandidateAuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.candidateAuthService.isAuthenticated) {
      this.router.navigate(['/candidate/dashboard']);
      return false;
    }
    return true;
  }
}