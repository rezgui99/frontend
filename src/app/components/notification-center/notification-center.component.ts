import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, Notification, NotificationAction } from '../../services/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.css']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount: number = 0;
  isOpen: boolean = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
      })
    );

    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleNotificationPanel(): void {
    this.isOpen = !this.isOpen;
  }

  markAsRead(notification: Notification): void {
    this.notificationService.markAsRead(notification.id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(notification: Notification): void {
    this.notificationService.deleteNotification(notification.id);
  }

  clearAll(): void {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications ?')) {
      this.notificationService.clearAllNotifications();
    }
  }

  executeAction(action: NotificationAction, notification: Notification): void {
    // Marquer comme lu quand on clique sur une action
    this.markAsRead(notification);
    
    switch (action.action) {
      case 'view_profile':
        this.router.navigate(['/profile', action.data.employeeId]);
        break;
      case 'start_matching':
        this.router.navigate(['/matching'], { queryParams: { jobId: action.data.jobId } });
        break;
      case 'assign_job':
        this.router.navigate(['/matching'], { 
          queryParams: { 
            jobId: action.data.jobId, 
            employeeId: action.data.employeeId 
          } 
        });
        break;
      case 'view_job_offer':
        this.router.navigate(['/job-offers']);
        break;
      case 'view_job_description':
        this.router.navigate(['/job-descriptions']);
        break;
      case 'create_job_offer':
        this.router.navigate(['/job-offer/create'], { 
          queryParams: { jobDescriptionId: action.data.jobDescriptionId } 
        });
        break;
      case 'view_user':
        this.router.navigate(['/admin/users']);
        break;
      case 'manage_roles':
        this.router.navigate(['/admin/users']);
        break;
      case 'validate_job_description':
        this.router.navigate(['/job-descriptions']);
        break;
    }
    
    // Fermer le panneau après navigation
    this.isOpen = false;
  }

  getNotificationIcon(type: string): string {
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  getCategoryIcon(category: string): string {
    const icons = {
      matching: '🎯',
      job_offer: '📝',
      user_management: '👥',
      system: '⚙️'
    };
    return icons[category as keyof typeof icons] || '📢';
  }

  getActionButtonClass(style: string): string {
    const classes = {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white',
      secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
      success: 'bg-green-500 hover:bg-green-600 text-white',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      danger: 'bg-red-500 hover:bg-red-600 text-white'
    };
    return classes[style as keyof typeof classes] || classes.primary;
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }
}