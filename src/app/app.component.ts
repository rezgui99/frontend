import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent,CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showSidebar = true;

  constructor(private router: Router) {
    // Écoute uniquement les événements de fin de navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Masquer la sidebar sur certaines routes
        const authPages = [
          '/login-selector', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
          '/welcome', '/candidate/login', '/candidate/register', '/candidate/dashboard',
          '/candidate/job-offers', '/candidate/apply', '/candidate/applications', 
          '/candidate/cvs', '/candidate/favorites','/candidate/forgot-password'
        ]; 
        this.showSidebar = !authPages.some(page => event.urlAfterRedirects.startsWith(page));
      });
  }
  title = 'Smarthire';
}