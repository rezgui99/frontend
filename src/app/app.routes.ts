import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EmployeesComponent } from './pages/employees/employees.component';
import { MatchingComponent } from './pages/matching/matching.component';
import { CvLibraryComponent } from './pages/cv-library/cv-library.component';
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

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  
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
  { path: 'cv-library', component: CvLibraryComponent, canActivate: [AuthGuard] },
  { path: 'skills-management', component: SkillsManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'hr'] } },
  { path: 'organigramme', component: OrganigrammeComponent, canActivate: [AuthGuard] },
  { path: 'job-offer/create', component: JobOfferComponent, canActivate: [AuthGuard] },
  { path: 'job-offers', component: JobOfferComponent, canActivate: [AuthGuard] },
   { path: 'job-offer-list', component: JobOffersListComponent, canActivate: [AuthGuard] },
  { path: 'admin/users-enhanced', component: EnhancedUserManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  // Unauthorized page
  { path: 'unauthorized', loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
  
  { path: '**', redirectTo: '/home' }
];