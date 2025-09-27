import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CandidateAuthService } from '../../services/candidate-auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {
  constructor(
    private authService: AuthService,
    private candidateAuthService: CandidateAuthService
  ) {}

  get isRecruiterAuthenticated(): boolean {
    return this.authService.isAuthenticated;
  }

  get isCandidateAuthenticated(): boolean {
    return this.candidateAuthService.isAuthenticated;
  }
}