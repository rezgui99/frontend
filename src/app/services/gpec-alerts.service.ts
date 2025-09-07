import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, catchError, tap, switchMap, filter } from 'rxjs/operators';
import { 
  GPECAlert, 
  GPECDashboard, 
  DepartureRiskPrediction, 
  SkillGapAnalysis,
  ActionPlan,
  GPECConfiguration,
  GPECThresholds,
  GPECReport
} from '../models/gpec-alerts.model';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GPECAlertsService {
  private apiUrl = `${environment.backendUrl}/gpec-alerts`;
  
  // State management
  private alertsSubject = new BehaviorSubject<GPECAlert[]>([]);
  private dashboardSubject = new BehaviorSubject<GPECDashboard | null>(null);
  private configurationSubject = new BehaviorSubject<GPECConfiguration | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  // Observables publics
  public alerts$ = this.alertsSubject.asObservable();
  public dashboard$ = this.dashboardSubject.asObservable();
  public configuration$ = this.configurationSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  
  // Alertes par catégorie
  public criticalAlerts$ = this.alerts$.pipe(
    map(alerts => alerts.filter(alert => alert.severity === 'critical' && alert.status === 'active'))
  );
  
  public skillsAlerts$ = this.alerts$.pipe(
    map(alerts => alerts.filter(alert => alert.category === 'skills' && alert.status === 'active'))
  );
  
  public retentionAlerts$ = this.alerts$.pipe(
    map(alerts => alerts.filter(alert => alert.category === 'retention' && alert.status === 'active'))
  );

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    // Charger la configuration initiale
    this.loadConfiguration();
    
    // Démarrer la surveillance en temps réel
    this.startRealTimeMonitoring();
    
    // Charger les alertes initiales
    this.loadAlerts();
  }

  // === GESTION DES ALERTES ===
  
  loadAlerts(filters?: any): Observable<GPECAlert[]> {
    this.setLoading(true);
    
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<GPECAlert[]>(`${this.apiUrl}/alerts`, { params }).pipe(
      tap(alerts => {
        this.alertsSubject.next(alerts);
        this.setLoading(false);
      }),
      catchError(error => {
        console.error('Erreur chargement alertes GPEC:', error);
        this.setLoading(false);
        throw error;
      })
    );
  }

  getDashboard(): Observable<GPECDashboard> {
    return this.http.get<GPECDashboard>(`${this.apiUrl}/dashboard`).pipe(
      tap(dashboard => this.dashboardSubject.next(dashboard)),
      catchError(error => {
        console.error('Erreur chargement dashboard GPEC:', error);
        throw error;
      })
    );
  }

  acknowledgeAlert(alertId: string, comment?: string): Observable<GPECAlert> {
    return this.http.patch<GPECAlert>(`${this.apiUrl}/alerts/${alertId}/acknowledge`, {
      comment,
      acknowledged_by: this.authService.currentUser?.id,
      acknowledged_at: new Date()
    }).pipe(
      tap(updatedAlert => this.updateAlertInState(updatedAlert)),
      catchError(error => {
        console.error('Erreur acknowledgment alerte:', error);
        throw error;
      })
    );
  }

  resolveAlert(alertId: string, resolution: string, actionsTaken: string[]): Observable<GPECAlert> {
    return this.http.patch<GPECAlert>(`${this.apiUrl}/alerts/${alertId}/resolve`, {
      resolution,
      actions_taken: actionsTaken,
      resolved_by: this.authService.currentUser?.id,
      resolved_at: new Date()
    }).pipe(
      tap(updatedAlert => this.updateAlertInState(updatedAlert)),
      catchError(error => {
        console.error('Erreur résolution alerte:', error);
        throw error;
      })
    );
  }

  dismissAlert(alertId: string, reason: string): Observable<GPECAlert> {
    return this.http.patch<GPECAlert>(`${this.apiUrl}/alerts/${alertId}/dismiss`, {
      reason,
      dismissed_by: this.authService.currentUser?.id,
      dismissed_at: new Date()
    }).pipe(
      tap(updatedAlert => this.updateAlertInState(updatedAlert)),
      catchError(error => {
        console.error('Erreur dismiss alerte:', error);
        throw error;
      })
    );
  }

  // === ANALYSES PRÉDICTIVES ===
  
  analyzeDepartureRisks(): Observable<DepartureRiskPrediction[]> {
    return this.http.get<DepartureRiskPrediction[]>(`${this.apiUrl}/predictions/departure-risks`).pipe(
      catchError(error => {
        console.error('Erreur analyse risques départ:', error);
        throw error;
      })
    );
  }

  analyzeSkillGaps(): Observable<SkillGapAnalysis[]> {
    return this.http.get<SkillGapAnalysis[]>(`${this.apiUrl}/analysis/skill-gaps`).pipe(
      catchError(error => {
        console.error('Erreur analyse gaps compétences:', error);
        throw error;
      })
    );
  }

  predictTrainingNeeds(departmentId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (departmentId) {
      params = params.set('department_id', departmentId.toString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/predictions/training-needs`, { params }).pipe(
      catchError(error => {
        console.error('Erreur prédiction besoins formation:', error);
        throw error;
      })
    );
  }

  // === PLANS D'ACTION ===
  
  createActionPlan(alertId: string, planData: Partial<ActionPlan>): Observable<ActionPlan> {
    return this.http.post<ActionPlan>(`${this.apiUrl}/alerts/${alertId}/action-plan`, {
      ...planData,
      created_by: this.authService.currentUser?.id,
      created_at: new Date()
    }).pipe(
      catchError(error => {
        console.error('Erreur création plan d\'action:', error);
        throw error;
      })
    );
  }

  getActionPlans(alertId?: string): Observable<ActionPlan[]> {
    let url = `${this.apiUrl}/action-plans`;
    if (alertId) {
      url += `?alert_id=${alertId}`;
    }

    return this.http.get<ActionPlan[]>(url).pipe(
      catchError(error => {
        console.error('Erreur chargement plans d\'action:', error);
        throw error;
      })
    );
  }

  updateActionPlan(planId: string, updates: Partial<ActionPlan>): Observable<ActionPlan> {
    return this.http.put<ActionPlan>(`${this.apiUrl}/action-plans/${planId}`, {
      ...updates,
      updated_at: new Date()
    }).pipe(
      catchError(error => {
        console.error('Erreur mise à jour plan d\'action:', error);
        throw error;
      })
    );
  }

  // === CONFIGURATION ===
  
  loadConfiguration(): Observable<GPECConfiguration> {
    return this.http.get<GPECConfiguration>(`${this.apiUrl}/configuration`).pipe(
      tap(config => this.configurationSubject.next(config)),
      catchError(error => {
        console.error('Erreur chargement configuration GPEC:', error);
        // Configuration par défaut en cas d'erreur
        const defaultConfig = this.getDefaultConfiguration();
        this.configurationSubject.next(defaultConfig);
        return [defaultConfig];
      })
    );
  }

  updateConfiguration(config: Partial<GPECConfiguration>): Observable<GPECConfiguration> {
    return this.http.put<GPECConfiguration>(`${this.apiUrl}/configuration`, config).pipe(
      tap(updatedConfig => this.configurationSubject.next(updatedConfig)),
      catchError(error => {
        console.error('Erreur mise à jour configuration:', error);
        throw error;
      })
    );
  }

  updateThresholds(thresholds: Partial<GPECThresholds>): Observable<GPECThresholds> {
    return this.http.put<GPECThresholds>(`${this.apiUrl}/configuration/thresholds`, thresholds).pipe(
      catchError(error => {
        console.error('Erreur mise à jour seuils:', error);
        throw error;
      })
    );
  }

  // === SURVEILLANCE EN TEMPS RÉEL ===
  
  private startRealTimeMonitoring(): void {
    // Vérification périodique des nouvelles alertes (toutes les 5 minutes)
    interval(5 * 60 * 1000).pipe(
      filter(() => this.authService.isAuthenticated),
      switchMap(() => this.checkForNewAlerts())
    ).subscribe();

    // Vérification des alertes critiques (toutes les minutes)
    interval(60 * 1000).pipe(
      filter(() => this.authService.isAuthenticated),
      switchMap(() => this.checkCriticalAlerts())
    ).subscribe();
  }

  private checkForNewAlerts(): Observable<GPECAlert[]> {
    return this.http.get<GPECAlert[]>(`${this.apiUrl}/alerts/new`).pipe(
      tap(newAlerts => {
        if (newAlerts.length > 0) {
          // Ajouter les nouvelles alertes à l'état
          const currentAlerts = this.alertsSubject.value;
          const updatedAlerts = [...newAlerts, ...currentAlerts];
          this.alertsSubject.next(updatedAlerts);

          // Notifier l'utilisateur des nouvelles alertes critiques
          newAlerts
            .filter(alert => alert.severity === 'critical')
            .forEach(alert => {
              this.notificationService.addGpecNotification('warning', 
                `🚨 Alerte GPEC Critique: ${alert.title}`, 
                alert.description,
                {
                  category: 'gpec_alert',
                  alertId: alert.id
                }
              );
            });
        }
      }),
      catchError(error => {
        console.error('Erreur vérification nouvelles alertes:', error);
        return [];
      })
    );
  }

  private checkCriticalAlerts(): Observable<GPECAlert[]> {
    return this.criticalAlerts$.pipe(
      tap(criticalAlerts => {
        // Logique de notification pour alertes critiques non traitées
        const unacknowledgedCritical = criticalAlerts.filter(
          alert => alert.status === 'active' && 
          this.getTimeSinceCreation(alert.createdAt) > 30 // 30 minutes
        );

        unacknowledgedCritical.forEach(alert => {
          this.escalateCriticalAlert(alert);
        });
      })
    );
  }

  private escalateCriticalAlert(alert: GPECAlert): void {
    // Escalade vers les managers/admins
    this.notificationService.addGpecNotification('error',
      `🚨 ESCALADE: Alerte critique non traitée`,
      `L'alerte "${alert.title}" nécessite une attention immédiate depuis ${this.getTimeSinceCreation(alert.createdAt)} minutes.`,
      {
        category: 'gpec_alert',
        alertId: alert.id
      }
    );
  }

  // === GÉNÉRATION D'ALERTES ===
  
  generateSkillShortageAlert(skillName: string, currentSupply: number, requiredDemand: number): void {
    const gapPercentage = ((requiredDemand - currentSupply) / requiredDemand) * 100;
    
    const alert: Partial<GPECAlert> = {
      type: 'critical_skills_shortage',
      severity: gapPercentage > 70 ? 'critical' : gapPercentage > 50 ? 'high' : 'medium',
      title: `Pénurie critique: ${skillName}`,
      description: `Nous avons besoin de ${requiredDemand} experts en ${skillName} mais nous n'en avons que ${currentSupply}. Gap de ${Math.round(gapPercentage)}%.`,
      impact: `${Math.round(gapPercentage)}% des besoins non couverts`,
      recommendations: [
        'Lancer un recrutement urgent',
        'Former les employés existants',
        'Externaliser temporairement',
        'Revoir les priorités projets'
      ],
      category: 'skills',
      priority: gapPercentage > 70 ? 'urgent' : 'high',
      tags: ['compétences', 'recrutement', 'formation']
    };

    this.createAlert(alert);
  }

  generateDepartureRiskAlert(prediction: DepartureRiskPrediction): void {
    const alert: Partial<GPECAlert> = {
      type: 'departure_risk',
      severity: prediction.risk_score > 80 ? 'critical' : prediction.risk_score > 60 ? 'high' : 'medium',
      title: `Risque de départ: ${prediction.employee_name}`,
      description: `${prediction.employee_name} (${prediction.position}) a ${prediction.risk_score}% de risque de partir dans les 6 prochains mois.`,
      impact: `Perte potentielle d'expertise clé dans ${prediction.department}`,
      recommendations: prediction.mitigation_strategies,
      affectedEntities: [{
        type: 'employee',
        id: prediction.employee_id,
        name: prediction.employee_name,
        impact_level: prediction.risk_score
      }],
      category: 'retention',
      priority: prediction.risk_score > 80 ? 'urgent' : 'high',
      tags: ['rétention', 'risque-départ', prediction.department.toLowerCase()]
    };

    this.createAlert(alert);
  }

  generateDepartmentGapAlert(department: string, gapPercentage: number, missingSkills: string[]): void {
    const alert: Partial<GPECAlert> = {
      type: 'department_gap',
      severity: gapPercentage > 60 ? 'critical' : gapPercentage > 40 ? 'high' : 'medium',
      title: `Gap départemental: ${department}`,
      description: `Le département ${department} a ${Math.round(gapPercentage)}% de compétences manquantes.`,
      impact: `Capacité réduite du département, risque sur les projets`,
      recommendations: [
        'Audit complet des compétences',
        'Plan de formation ciblé',
        'Recrutement stratégique',
        'Réorganisation temporaire'
      ],
      category: 'skills',
      priority: gapPercentage > 60 ? 'urgent' : 'high',
      tags: ['département', 'gap-compétences', department.toLowerCase()]
    };

    this.createAlert(alert);
  }

  generateTrainingAlert(employeeCount: number, skillName: string, urgencyLevel: 'low' | 'medium' | 'high' | 'critical'): void {
    const alert: Partial<GPECAlert> = {
      type: 'training_needed',
      severity: urgencyLevel,
      title: `Formation urgente: ${skillName}`,
      description: `${employeeCount} employés ont besoin d'une formation urgente en ${skillName}.`,
      impact: `Risque de non-conformité ou de perte de compétitivité`,
      recommendations: [
        'Organiser une session de formation',
        'Identifier des formateurs internes',
        'Budgéter la formation externe',
        'Planifier le calendrier'
      ],
      category: 'skills',
      priority: urgencyLevel === 'critical' ? 'urgent' : 'high',
      tags: ['formation', 'compétences', skillName.toLowerCase()]
    };

    this.createAlert(alert);
  }

  private createAlert(alertData: Partial<GPECAlert>): Observable<GPECAlert> {
    const fullAlert: Partial<GPECAlert> = {
      ...alertData,
      id: this.generateAlertId(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.http.post<GPECAlert>(`${this.apiUrl}/alerts`, fullAlert).pipe(
      tap(newAlert => {
        // Ajouter à l'état local
        const currentAlerts = this.alertsSubject.value;
        this.alertsSubject.next([newAlert, ...currentAlerts]);

        // Notifier selon la sévérité
        this.notifyNewAlert(newAlert);
      }),
      catchError(error => {
        console.error('Erreur création alerte:', error);
        throw error;
      })
    );
  }

  // === ANALYSES AUTOMATIQUES ===
  
  runAutomaticAnalysis(): Observable<any> {
    this.setLoading(true);
    
    return this.http.post(`${this.apiUrl}/analysis/run-automatic`, {
      triggered_by: this.authService.currentUser?.id,
      timestamp: new Date()
    }).pipe(
      tap(result => {
        console.log('Analyse automatique terminée:', result);
        this.setLoading(false);
        
        // Recharger les alertes après l'analyse
        this.loadAlerts().subscribe();
      }),
      catchError(error => {
        console.error('Erreur analyse automatique:', error);
        this.setLoading(false);
        throw error;
      })
    );
  }

  scheduleAnalysis(frequency: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.post(`${this.apiUrl}/analysis/schedule`, {
      frequency,
      enabled: true,
      next_run: this.calculateNextRun(frequency)
    }).pipe(
      catchError(error => {
        console.error('Erreur programmation analyse:', error);
        throw error;
      })
    );
  }

  // === RAPPORTS ===
  
  generateGPECReport(period: { start_date: Date; end_date: Date }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/reports/generate`, period, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Erreur génération rapport GPEC:', error);
        throw error;
      })
    );
  }

  getReportHistory(): Observable<GPECReport[]> {
    return this.http.get<GPECReport[]>(`${this.apiUrl}/reports/history`).pipe(
      catchError(error => {
        console.error('Erreur historique rapports:', error);
        throw error;
      })
    );
  }

  // === UTILITAIRES ===
  
  private updateAlertInState(updatedAlert: GPECAlert): void {
    const currentAlerts = this.alertsSubject.value;
    const index = currentAlerts.findIndex(alert => alert.id === updatedAlert.id);
    
    if (index !== -1) {
      currentAlerts[index] = updatedAlert;
      this.alertsSubject.next([...currentAlerts]);
    }
  }

  private notifyNewAlert(alert: GPECAlert): void {
    const notificationType = this.getNotificationTypeFromSeverity(alert.severity);
    
    this.notificationService.addGpecNotification(
      notificationType,
      `🚨 ${alert.title}`,
      alert.description,
      {
        category: 'gpec_alert',
        alertId: alert.id,
        severity: alert.severity,
        actions: [
          {
            label: 'Voir détails',
            action: 'view_alert',
            data: { alertId: alert.id }
          },
          {
            label: 'Prendre en charge',
            action: 'acknowledge_alert',
            data: { alertId: alert.id }
          }
        ]
      }
    );
  }

  private getNotificationTypeFromSeverity(severity: string): 'success' | 'info' | 'warning' | 'error' {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'info';
    }
  }

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private generateAlertId(): string {
    return `GPEC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private getTimeSinceCreation(createdAt: Date): number {
    return Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60));
  }

  private calculateNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private getDefaultConfiguration(): GPECConfiguration {
    return {
      thresholds: {
        skills: {
          critical_shortage_ratio: 0.3,
          obsolescence_months: 24,
          demand_supply_ratio: 3.0
        },
        retention: {
          departure_risk_threshold: 0.7,
          tenure_risk_months: 6,
          performance_decline_threshold: 0.2
        },
        departments: {
          skill_gap_threshold: 0.4,
          understaffing_ratio: 0.8,
          training_backlog_threshold: 10
        }
      },
      alert_frequency: {
        critical: 1,
        high: 5,
        medium: 30,
        low: 60
      },
      notification_settings: {
        email_enabled: true,
        sms_enabled: false,
        in_app_enabled: true,
        recipients_by_severity: {
          critical: [],
          high: [],
          medium: [],
          low: []
        }
      },
      auto_actions: {
        enabled: true,
        actions: []
      }
    };
  }

  // === MÉTHODES PUBLIQUES POUR LES COMPOSANTS ===
  
  getAlertsByCategory(category: string): Observable<GPECAlert[]> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.category === category))
    );
  }

  getAlertsBySeverity(severity: string): Observable<GPECAlert[]> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.severity === severity))
    );
  }

  getActiveAlertsCount(): Observable<number> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.status === 'active').length)
    );
  }

  getCriticalAlertsCount(): Observable<number> {
    return this.criticalAlerts$.pipe(
      map(alerts => alerts.length)
    );
  }

  // Simulation de données pour démonstration
  simulateAlerts(): void {
    // Générer quelques alertes de démonstration
    this.generateSkillShortageAlert('Intelligence Artificielle', 2, 5);
    
    setTimeout(() => {
      this.generateDepartmentGapAlert('Développement', 45, ['React', 'Node.js', 'DevOps']);
    }, 2000);

    setTimeout(() => {
      this.generateTrainingAlert(8, 'Cybersécurité', 'high');
    }, 4000);
  }
}