import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId: number;
  category: 'matching' | 'job_offer' | 'user_management' | 'system';
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  data?: any;
  style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private apiUrl = `${environment.backendUrl}/notifications`;
  private notifications: Notification[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initializeNotifications();
  }

  private initializeNotifications(): void {
    // Charger les notifications existantes
    this.loadNotifications();
    
    // Simuler des notifications en temps réel (en attendant WebSocket)
    this.startNotificationSimulation();
  }

  private loadNotifications(): void {
    // Pour l'instant, on simule des notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: 'Matching élevé détecté',
        message: 'Jean Dupont correspond à 92% pour le poste de Développeur Full Stack',
        timestamp: new Date(),
        read: false,
        userId: this.authService.currentUser?.id || 1,
        category: 'matching',
        data: { employeeId: 1, jobId: 1, score: 92 },
        actions: [
          { label: 'Voir le profil', action: 'view_profile', data: { employeeId: 1 }, style: 'primary' },
          { label: 'Lancer matching', action: 'start_matching', data: { jobId: 1 }, style: 'secondary' }
        ]
      }
    ];

    this.notifications = mockNotifications;
    this.notificationsSubject.next(this.notifications);
    this.updateUnreadCount();
  }

  private startNotificationSimulation(): void {
    // Simuler des notifications périodiques pour démonstration
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% de chance toutes les 30 secondes
        this.generateRandomNotification();
      }
    }, 30000);
  }

  private generateRandomNotification(): void {
    const notificationTypes: Array<{
      type: 'success' | 'info' | 'warning' | 'error';
      title: string;
      message: string;
      category: 'matching' | 'job_offer' | 'user_management';
      data: any;
      actions: NotificationAction[];
    }> = [
      {
        type: 'success',
        title: 'Matching élevé détecté',
        message: 'Marie Martin correspond à 89% pour le poste de Chef de Projet',
        category: 'matching',
        data: { employeeId: 2, jobId: 2, score: 89 },
        actions: [
          { label: 'Voir le profil', action: 'view_profile', data: { employeeId: 2 }, style: 'primary' },
          { label: 'Affecter au poste', action: 'assign_job', data: { employeeId: 2, jobId: 2 }, style: 'success' }
        ]
      },
      {
        type: 'info',
        title: 'Nouvelle offre publiée',
        message: 'L\'offre "Développeur React Senior" a été publiée avec succès',
        category: 'job_offer',
        data: { jobOfferId: 3 },
        actions: [
          { label: 'Voir l\'offre', action: 'view_job_offer', data: { jobOfferId: 3 }, style: 'primary' }
        ]
      },
      {
        type: 'warning',
        title: 'Fiche de poste en attente',
        message: 'La fiche "Analyste Business" nécessite une validation',
        category: 'job_offer',
        data: { jobDescriptionId: 4 },
        actions: [
          { label: 'Valider', action: 'validate_job_description', data: { jobDescriptionId: 4 }, style: 'success' }
        ]
      }
    ];

    if (this.authService.isAdmin) {
      notificationTypes.push({
        type: 'info',
        title: 'Nouvel utilisateur RH',
        message: 'Sophie Dubois a été ajoutée avec le rôle HR',
        category: 'user_management',
        data: { userId: 5 },
        actions: [
          { label: 'Voir le profil', action: 'view_user', data: { userId: 5 }, style: 'primary' }
        ]
      });
    }

    const randomNotification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    
    this.addNotification({
      ...randomNotification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
      userId: this.authService.currentUser?.id || 1
    });
  }

  // Méthodes publiques pour ajouter des notifications spécifiques
  notifyHighMatching(employeeName: string, jobTitle: string, score: number, employeeId: number, jobId: number): void {
    this.addNotification({
      id: this.generateId(),
      type: 'success',
      title: 'Matching élevé détecté',
      message: `${employeeName} correspond à ${score}% pour le poste de ${jobTitle}`,
      timestamp: new Date(),
      read: false,
      userId: this.authService.currentUser?.id || 1,
      category: 'matching',
      data: { employeeId, jobId, score },
      actions: [
        { label: 'Voir le profil', action: 'view_profile', data: { employeeId }, style: 'primary' },
        { label: 'Affecter au poste', action: 'assign_job', data: { employeeId, jobId }, style: 'success' }
      ]
    });
  }

  notifyJobOfferPublished(jobTitle: string, jobOfferId: number): void {
    this.addNotification({
      id: this.generateId(),
      type: 'info',
      title: 'Offre d\'emploi publiée',
      message: `L'offre "${jobTitle}" a été publiée avec succès`,
      timestamp: new Date(),
      read: false,
      userId: this.authService.currentUser?.id || 1,
      category: 'job_offer',
      data: { jobOfferId },
      actions: [
        { label: 'Voir l\'offre', action: 'view_job_offer', data: { jobOfferId }, style: 'primary' }
      ]
    });
  }

  notifyJobDescriptionValidated(jobTitle: string, jobDescriptionId: number): void {
    this.addNotification({
      id: this.generateId(),
      type: 'success',
      title: 'Fiche de poste validée',
      message: `La fiche "${jobTitle}" a été validée et est prête à l'emploi`,
      timestamp: new Date(),
      read: false,
      userId: this.authService.currentUser?.id || 1,
      category: 'job_offer',
      data: { jobDescriptionId },
      actions: [
        { label: 'Voir la fiche', action: 'view_job_description', data: { jobDescriptionId }, style: 'primary' },
        { label: 'Créer une offre', action: 'create_job_offer', data: { jobDescriptionId }, style: 'success' }
      ]
    });
  }

  notifyNewUserAdded(userName: string, userRole: string, userId: number): void {
    if (this.authService.isAdmin) {
      this.addNotification({
        id: this.generateId(),
        type: 'info',
        title: 'Nouvel utilisateur ajouté',
        message: `${userName} a été ajouté avec le rôle ${userRole}`,
        timestamp: new Date(),
        read: false,
        userId: this.authService.currentUser?.id || 1,
        category: 'user_management',
        data: { userId, userRole },
        actions: [
          { label: 'Voir le profil', action: 'view_user', data: { userId }, style: 'primary' },
          { label: 'Gérer les rôles', action: 'manage_roles', data: { userId }, style: 'secondary' }
        ]
      });
    }
  }

  public addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    
    // Limiter à 50 notifications max
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    this.notificationsSubject.next(this.notifications);
    this.updateUnreadCount();
    
    // Afficher une notification toast
    this.showToast(notification);
  }

  private showToast(notification: Notification): void {
    // Créer un élément toast temporaire
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${this.getToastClass(notification.type)}`;
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${this.getToastIcon(notification.type)}
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium">${notification.title}</p>
          <p class="text-sm mt-1">${notification.message}</p>
        </div>
        <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // Animation d'entrée
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);

    // Auto-suppression après 5 secondes
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  // Surcharge pour les alertes GPEC avec plus d'options
  addGpecNotification(type: 'success' | 'info' | 'warning' | 'error', title: string, message: string, options?: any): void {
    const id = this.generateId();
    const notification: Notification = { 
      id, 
      type: type === 'warning' ? 'info' : type, 
      title,
      message,
      timestamp: new Date(),
      read: false,
      userId: this.authService.currentUser?.id || 1,
      category: 'system',
      ...options 
    };
    
    this.notifications.push(notification);
    this.notificationsSubject.next(this.notifications);
    
    // Auto-remove after 8 seconds for GPEC alerts (longer for important alerts)
    const timeout = options?.category === 'gpec_alert' ? 8000 : 5000;
    setTimeout(() => {
      this.deleteNotification(id);
    }, timeout);
  }

  private getToastClass(type: string): string {
    const classes = {
      success: 'bg-green-100 border border-green-400 text-green-700',
      info: 'bg-blue-100 border border-blue-400 text-blue-700',
      warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
      error: 'bg-red-100 border border-red-400 text-red-700'
    };
    return classes[type as keyof typeof classes] || classes.info;
  }

  private getToastIcon(type: string): string {
    const icons = {
      success: '<svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
      info: '<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>',
      warning: '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
      error: '<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>'
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.notificationsSubject.next(this.notifications);
      this.updateUnreadCount();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notificationsSubject.next(this.notifications);
    this.updateUnreadCount();
  }

  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notificationsSubject.next(this.notifications);
    this.updateUnreadCount();
  }

  clearAllNotifications(): void {
    this.notifications = [];
    this.notificationsSubject.next(this.notifications);
    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Méthodes pour déclencher des notifications depuis d'autres services
  triggerMatchingNotification(employeeName: string, jobTitle: string, score: number, employeeId: number, jobId: number): void {
    if (score >= 85) { // Seuil pour notification de matching élevé
      this.notifyHighMatching(employeeName, jobTitle, score, employeeId, jobId);
    }
  }

  triggerJobOfferNotification(jobTitle: string, jobOfferId: number): void {
    this.notifyJobOfferPublished(jobTitle, jobOfferId);
  }

  triggerUserCreationNotification(userName: string, userRole: string, userId: number): void {
    this.notifyNewUserAdded(userName, userRole, userId);
  }

  triggerJobDescriptionValidation(jobTitle: string, jobDescriptionId: number): void {
    this.notifyJobDescriptionValidated(jobTitle, jobDescriptionId);
  }
}