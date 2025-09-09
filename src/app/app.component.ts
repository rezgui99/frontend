import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { GPECAlertWidgetComponent } from './components/gpec-alert-widget/gpec-alert-widget.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NotificationCenterComponent, GPECAlertWidgetComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showSidebar = true;
  title = 'Smarthire';

  constructor(private router: Router) {
    // Écoute uniquement les événements de fin de navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Masquer la sidebar sur certaines routes
        const authPages = [
          '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
          '/candidate/login', '/candidate/register', '/candidate/forgot-password', '/candidate/reset-password'
        ]; 
        this.showSidebar = !authPages.includes(event.urlAfterRedirects);
      });
  }

  getPageTitle(): string {
    const url = this.router.url;
    const titleMap: { [key: string]: string } = {
      '/home': 'Tableau de bord',
      '/employees': 'Gestion des employés',
      '/job-descriptions': 'Fiches de poste',
      '/matching': 'Matching intelligent',
      '/advanced-analytics': 'Analytics avancées',
      '/skills-management': 'Gestion des compétences',
      '/organigramme': 'Organigramme',
      '/gpec-alerts': 'Alertes GPEC',
      '/job-offers': 'Offres d\'emploi',
      '/admin/users-enhanced': 'Gestion des utilisateurs'
    };
    
    return titleMap[url] || 'Smarthire';
  }
}