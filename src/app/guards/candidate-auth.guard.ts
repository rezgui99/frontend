import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CandidateAuthService } from '../services/candidate-auth.service';

@Injectable({
  providedIn: 'root'
})
export class CandidateAuthGuard implements CanActivate {
  constructor(
    private candidateAuthService: CandidateAuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.candidateAuthService.isAuthenticated) {
      return true;
    }

    this.router.navigate(['/candidate/login']);
    return false;
  }
}