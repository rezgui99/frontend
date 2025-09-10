import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EmployeesComponent } from './pages/employees/employees.component';
import { MatchingComponent } from './pages/matching/matching.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { JobDescriptionsComponent } from './pages/job-descriptions/job-descriptions.component';
import { SkillsManagementComponent } from './pages/skills-management/skills-management.component';
import { OrganigrammeComponent } from './pages/organigramme/organigramme.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { EditProfileComponent } from './pages/auth/edit-profile/edit-profile.component';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';
import { JobOfferComponent } from './pages/job-offer/job-offer.component';
import { EnhancedUserManagementComponent } from './pages/enhanced-user-management/enhanced-user-management.component';
import { AdvancedAnalyticsComponent } from './pages/advanced-analytics/advanced-analytics.component';
import { JobOffersListComponent } from './pages/job-offers-list/job-offers-list.component';
import { GPECAlertsComponent } from './pages/gpec-alerts/gpec-alerts.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { CandidateAuthGuard } from './guards/candidate-auth.guard';
import { CandidateGuestGuard } from './guards/candidate-guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  
  // Page d'accueil publique
  { path: 'welcome', component: WelcomeComponent },
  
  // Auth routes (accessible only to guests)
  { path: 'auth/login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'auth/register', component: RegisterComponent, canActivate: [GuestGuard] },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent, canActivate: [GuestGuard] },
  { path: 'auth/reset-password', component: ResetPasswordComponent, canActivate: [GuestGuard] },
  
  // Protected routes (require authentication)
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'employees', component: EmployeesComponent, canActivate: [AuthGuard] },
  { path: 'profile/:id', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'edit-profile', component: EditProfileComponent, canActivate: [AuthGuard] },
  { path: 'job-descriptions', component: JobDescriptionsComponent, canActivate: [AuthGuard] },
  { path: 'matching', component: MatchingComponent, canActivate: [AuthGuard] },
  { path: 'advanced-analytics', component: AdvancedAnalyticsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'skills-management', component: SkillsManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'organigramme', component: OrganigrammeComponent, canActivate: [AuthGuard] },
  { path: 'job-offer/create', component: JobOfferComponent, canActivate: [AuthGuard] },
  { path: 'job-offers', component: JobOfferComponent, canActivate: [AuthGuard] },
  { path: 'job-offer-list', component: JobOffersListComponent, canActivate: [AuthGuard] },
  { path: 'admin/users-enhanced', component: EnhancedUserManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'gpec-alerts', component: GPECAlertsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  
  // Routes candidats
  { 
    path: 'candidate/login', 
    loadComponent: () => import('./pages/candidate/login/candidate-login.component').then(m => m.CandidateLoginComponent),
    canActivate: [CandidateGuestGuard] 
  },
  { 
    path: 'candidate/register', 
    loadComponent: () => import('./pages/candidate/register/candidate-register.component').then(m => m.CandidateRegisterComponent),
    canActivate: [CandidateGuestGuard] 
  },
  { 
    path: 'candidate/dashboard', 
    loadComponent: () => import('./pages/candidate/dashboard/candidate-dashboard.component').then(m => m.CandidateDashboardComponent),
    canActivate: [CandidateAuthGuard] 
  },
  { 
    path: 'candidate/job-offers', 
    loadComponent: () => import('./pages/candidate/job-offers/candidate-job-offers.component').then(m => m.CandidateJobOffersComponent),
    canActivate: [CandidateAuthGuard] 
  },
  { 
    path: 'candidate/job-offers/:id', 
    loadComponent: () => import('./pages/candidate/job-offer-detail/candidate-job-offer-detail.component').then(m => m.CandidateJobOfferDetailComponent),
    canActivate: [CandidateAuthGuard] 
  },
  { 
    path: 'candidate/apply/:id', 
    loadComponent: () => import('./pages/candidate/apply/candidate-apply.component').then(m => m.CandidateApplyComponent),
    canActivate: [CandidateAuthGuard] 
  },
  { 
    path: 'candidate/applications', 
    loadComponent: () => import('./pages/candidate/applications/candidate-applications.component').then(m => m.CandidateApplicationsComponent),
    canActivate: [CandidateAuthGuard] 
  },
  { 
    path: 'candidate/cvs', 
    loadComponent: () => import('./pages/candidate/cvs/candidate-cvs.component').then(m => m.CandidateCVsComponent),
    canActivate: [CandidateAuthGuard] 
  },
  { 
    path: 'candidate/favorites', 
    loadComponent: () => import('./pages/candidate/favorites/candidate-favorites.component').then(m => m.CandidateFavoritesComponent),
    canActivate: [CandidateAuthGuard] 
  },
  
  // Unauthorized page
  { path: 'unauthorized', loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
  
  { path: '**', redirectTo: '/home' }
];