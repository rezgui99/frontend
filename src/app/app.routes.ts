import { Routes } from '@angular/router';
import { WelcomeComponent } from './pages/welcome/welcome.component';
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

// Candidate routes
import { CandidateLoginComponent } from './pages/candidate/login/candidate-login.component';
import { CandidateRegisterComponent } from './pages/candidate/register/candidate-register.component';
import { CandidateDashboardComponent } from './pages/candidate/dashboard/candidate-dashboard.component';
import { CandidateJobOffersComponent } from './pages/candidate/job-offers/candidate-job-offers.component';
import { CandidateAuthGuard } from './guards/candidate-auth.guard';
import { CandidateGuestGuard } from './guards/candidate-guest.guard';
import { CandidateJobOfferDetailComponent } from './pages/candidate/job-offer-detail/candidate-job-offer-detail.component';
import { CandidateApplyComponent } from './pages/candidate/apply/candidate-apply.component';
import { CandidateApplicationsComponent } from './pages/candidate/applications/candidate-applications.component';
import { CandidateCVsComponent } from './pages/candidate/cvs/candidate-cvs.component';
import { CandidateFavoritesComponent } from './pages/candidate/favorites/candidate-favorites.component';
import { CandidateJobOfferDetailComponent } from './pages/candidate/job-offer-detail/candidate-job-offer-detail.component';
import { CandidateApplyComponent } from './pages/candidate/apply/candidate-apply.component';
import { CandidateApplicationsComponent } from './pages/candidate/applications/candidate-applications.component';
import { CandidateCVsComponent } from './pages/candidate/cvs/candidate-cvs.component';
import { CandidateFavoritesComponent } from './pages/candidate/favorites/candidate-favorites.component';
import { CandidateJobOfferDetailComponent } from './pages/candidate/job-offer-detail/candidate-job-offer-detail.component';
import { CandidateApplyComponent } from './pages/candidate/apply/candidate-apply.component';
import { CandidateApplicationsComponent } from './pages/candidate/applications/candidate-applications.component';
import { CandidateCVsComponent } from './pages/candidate/cvs/candidate-cvs.component';
import { CandidateFavoritesComponent } from './pages/candidate/favorites/candidate-favorites.component';
import { CandidateJobOfferDetailComponent } from './pages/candidate/job-offer-detail/candidate-job-offer-detail.component';
import { CandidateApplyComponent } from './pages/candidate/apply/candidate-apply.component';
import { CandidateApplicationsComponent } from './pages/candidate/applications/candidate-applications.component';
import { CandidateCVsComponent } from './pages/candidate/cvs/candidate-cvs.component';
import { CandidateFavoritesComponent } from './pages/candidate/favorites/candidate-favorites.component';
import { CandidateJobOfferDetailComponent } from './pages/candidate/job-offer-detail/candidate-job-offer-detail.component';
import { CandidateApplyComponent } from './pages/candidate/apply/candidate-apply.component';
import { CandidateApplicationsComponent } from './pages/candidate/applications/candidate-applications.component';
import { CandidateCVsComponent } from './pages/candidate/cvs/candidate-cvs.component';
import { CandidateFavoritesComponent } from './pages/candidate/favorites/candidate-favorites.component';
import { CandidateJobOfferDetailComponent } from './pages/candidate/job-offer-detail/candidate-job-offer-detail.component';
import { CandidateApplyComponent } from './pages/candidate/apply/candidate-apply.component';
import { CandidateApplicationsComponent } from './pages/candidate/applications/candidate-applications.component';
import { CandidateCVsComponent } from './pages/candidate/cvs/candidate-cvs.component';
import { CandidateFavoritesComponent } from './pages/candidate/favorites/candidate-favorites.component';
import { CandidateJobOfferDetailComponent } from './pages/candidate/job-offer-detail/candidate-job-offer-detail.component';
import { CandidateApplyComponent } from './pages/candidate/apply/candidate-apply.component';
import { CandidateApplicationsComponent } from './pages/candidate/applications/candidate-applications.component';
import { CandidateCVsComponent } from './pages/candidate/cvs/candidate-cvs.component';
import { CandidateFavoritesComponent } from './pages/candidate/favorites/candidate-favorites.component';
import { RecruiterApplicationsComponent } from './pages/recruiter/applications/recruiter-applications.component';
import { GPECAlertsComponent } from './pages/gpec-alerts/gpec-alerts.component';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
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
  { path: 'job-offer-list', component: JobOffersListComponent, canActivate: [AuthGuard] },
  { path: 'admin/users-enhanced', component: EnhancedUserManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'gpec-alerts', component: GPECAlertsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'recruiter/applications', component: RecruiterApplicationsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'recruiter/applications', component: RecruiterApplicationsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'recruiter/applications', component: RecruiterApplicationsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'recruiter/applications', component: RecruiterApplicationsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'recruiter/applications', component: RecruiterApplicationsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'recruiter/applications', component: RecruiterApplicationsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'recruiter/applications', component: RecruiterApplicationsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },

  // Unauthorized page
  { path: 'unauthorized', loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
  
  // Candidate routes (public access)
  { path: 'candidate/login', component: CandidateLoginComponent, canActivate: [CandidateGuestGuard] },
  { path: 'candidate/register', component: CandidateRegisterComponent, canActivate: [CandidateGuestGuard] },
  
  // Protected candidate routes
  { path: 'candidate/dashboard', component: CandidateDashboardComponent, canActivate: [CandidateAuthGuard] },
  { path: 'candidate/job-offers', component: CandidateJobOffersComponent, canActivate: [CandidateAuthGuard] },
  { path: 'candidate/job-offers/:id', component: CandidateJobOfferDetailComponent, canActivate: [CandidateAuthGuard] },
  { path: 'candidate/apply/:id', component: CandidateApplyComponent, canActivate: [CandidateAuthGuard] },
  { path: 'candidate/applications', component: CandidateApplicationsComponent, canActivate: [CandidateAuthGuard] },
  { path: 'candidate/cvs', component: CandidateCVsComponent, canActivate: [CandidateAuthGuard] },
  { path: 'candidate/favorites', component: CandidateFavoritesComponent, canActivate: [CandidateAuthGuard] },
  