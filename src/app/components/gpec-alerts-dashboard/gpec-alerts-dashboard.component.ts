import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { GPECAlertsService } from '../../services/gpec-alerts.service';
import { 
  GPECAlert, 
  GPECDashboard, 
  DepartureRiskPrediction, 
  SkillGapAnalysis,
  ActionPlan 
} from '../../models/gpec-alerts.model';

@Component({
  selector: 'app-gpec-alerts-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gpec-alerts-dashboard.component.html',
  styleUrls: ['./gpec-alerts-dashboard.component.css']
})
export class GPECAlertsDashboardComponent implements OnInit, OnDestroy {
  // État des données
  alerts: GPECAlert[] = [];
  dashboard: GPECDashboard | null = null;
  departureRisks: DepartureRiskPrediction[] = [];
  skillGaps: SkillGapAnalysis[] = [];
  actionPlans: ActionPlan[] = [];
  
  // États de l'interface
  loading = false;
  selectedTab = 'overview';
  selectedAlert: GPECAlert | null = null;
  showAlertDetails = false;
  showActionPlanModal = false;
  
  // Filtres
  selectedSeverity = '';
  selectedCategory = '';
  selectedStatus = '';
  searchQuery = '';
  
  // Statistiques calculées
  alertStats = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved_today: 0,
    avg_resolution_time: 0
  };

  private subscriptions: Subscription[] = [];

  constructor(private gpecService: GPECAlertsService) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadInitialData(): void {
    this.loading = true;
    
    // Charger toutes les données en parallèle
    combineLatest([
      this.gpecService.loadAlerts(),
      this.gpecService.getDashboard(),
      this.gpecService.analyzeDepartureRisks(),
      this.gpecService.analyzeSkillGaps(),
      this.gpecService.getActionPlans()
    ]).subscribe({
      next: ([alerts, dashboard, departureRisks, skillGaps, actionPlans]) => {
        this.alerts = alerts;
        this.dashboard = dashboard;
        this.departureRisks = departureRisks;
        this.skillGaps = skillGaps;
        this.actionPlans = actionPlans;
        this.calculateStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement données GPEC:', error);
        this.loading = false;
        // Charger des données de démonstration en cas d'erreur
        this.loadDemoData();
      }
    });
  }

  private setupSubscriptions(): void {
    // S'abonner aux alertes en temps réel
    this.subscriptions.push(
      this.gpecService.alerts$.subscribe(alerts => {
        this.alerts = alerts;
        this.calculateStats();
      })
    );

    // S'abonner au dashboard
    this.subscriptions.push(
      this.gpecService.dashboard$.subscribe(dashboard => {
        this.dashboard = dashboard;
      })
    );
  }

  private calculateStats(): void {
    this.alertStats = {
      total: this.alerts.length,
      critical: this.alerts.filter(a => a.severity === 'critical').length,
      high: this.alerts.filter(a => a.severity === 'high').length,
      medium: this.alerts.filter(a => a.severity === 'medium').length,
      low: this.alerts.filter(a => a.severity === 'low').length,
      resolved_today: this.alerts.filter(a => 
        a.status === 'resolved' && 
        this.isToday(a.resolvedAt)
      ).length,
      avg_resolution_time: this.calculateAverageResolutionTime()
    };
  }

  private calculateAverageResolutionTime(): number {
    const resolvedAlerts = this.alerts.filter(a => a.status === 'resolved' && a.resolvedAt);
    if (resolvedAlerts.length === 0) return 0;
    
    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      const createdTime = new Date(alert.createdAt).getTime();
      const resolvedTime = new Date(alert.resolvedAt!).getTime();
      return sum + (resolvedTime - createdTime);
    }, 0);
    
    return Math.round(totalTime / (resolvedAlerts.length * 24 * 60 * 60 * 1000)); // en jours
  }

  private isToday(date?: Date): boolean {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  }

  // === ACTIONS UTILISATEUR ===
  
  acknowledgeAlert(alert: GPECAlert): void {
    this.gpecService.acknowledgeAlert(alert.id, 'Pris en charge par l\'utilisateur').subscribe({
      next: (updatedAlert) => {
        console.log('Alerte prise en charge:', updatedAlert);
      },
      error: (error) => {
        console.error('Erreur prise en charge:', error);
      }
    });
  }

  resolveAlert(alert: GPECAlert): void {
    const resolution = prompt('Décrivez la résolution de cette alerte:');
    if (resolution) {
      this.gpecService.resolveAlert(alert.id, resolution, ['Action manuelle']).subscribe({
        next: (updatedAlert) => {
          console.log('Alerte résolue:', updatedAlert);
        },
        error: (error) => {
          console.error('Erreur résolution:', error);
        }
      });
    }
  }

  dismissAlert(alert: GPECAlert): void {
    const reason = prompt('Raison du rejet de cette alerte:');
    if (reason) {
      this.gpecService.dismissAlert(alert.id, reason).subscribe({
        next: (updatedAlert) => {
          console.log('Alerte rejetée:', updatedAlert);
        },
        error: (error) => {
          console.error('Erreur rejet:', error);
        }
      });
    }
  }

  showAlertDetail(alert: GPECAlert): void {
    this.selectedAlert = alert;
    this.showAlertDetails = true;
  }

  closeAlertDetails(): void {
    this.showAlertDetails = false;
    this.selectedAlert = null;
  }

  createActionPlan(alert: GPECAlert): void {
    this.selectedAlert = alert;
    this.showActionPlanModal = true;
  }

  closeActionPlanModal(): void {
    this.showActionPlanModal = false;
    this.selectedAlert = null;
  }

  // === FILTRES ===
  
  get filteredAlerts(): GPECAlert[] {
    return this.alerts.filter(alert => {
      const matchesSeverity = !this.selectedSeverity || alert.severity === this.selectedSeverity;
      const matchesCategory = !this.selectedCategory || alert.category === this.selectedCategory;
      const matchesStatus = !this.selectedStatus || alert.status === this.selectedStatus;
      const matchesSearch = !this.searchQuery || 
        alert.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      return matchesSeverity && matchesCategory && matchesStatus && matchesSearch;
    });
  }

  clearFilters(): void {
    this.selectedSeverity = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.searchQuery = '';
  }

  // === ACTIONS GLOBALES ===
  
  runAnalysis(): void {
    this.gpecService.runAutomaticAnalysis().subscribe({
      next: (result) => {
        console.log('Analyse terminée:', result);
      },
      error: (error) => {
        console.error('Erreur analyse:', error);
      }
    });
  }

  generateReport(): void {
    const period = {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
      end_date: new Date()
    };

    this.gpecService.generateGPECReport(period).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport-gpec-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erreur génération rapport:', error);
      }
    });
  }

  simulateAlerts(): void {
    this.gpecService.simulateAlerts();
  }

  // === UTILITAIRES D'AFFICHAGE ===
  
  getSeverityClass(severity: string): string {
    const classes = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return classes[severity as keyof typeof classes] || classes.low;
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    return icons[severity as keyof typeof icons] || 'ℹ️';
  }

  getCategoryIcon(category: string): string {
    const icons = {
      skills: '🎯',
      retention: '👥',
      performance: '📊',
      compliance: '✅',
      strategic: '🎯'
    };
    return icons[category as keyof typeof icons] || '📋';
  }

  getStatusClass(status: string): string {
    const classes = {
      active: 'bg-red-100 text-red-800',
      acknowledged: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800'
    };
    return classes[status as keyof typeof classes] || classes.active;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const alertDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - alertDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)} j`;
  }

  // === DONNÉES DE DÉMONSTRATION ===
  
  private loadDemoData(): void {
    // Données de démonstration pour tester l'interface
    this.alerts = [
      {
        id: 'GPEC-001',
        type: 'critical_skills_shortage',
        severity: 'critical',
        title: 'Pénurie critique: Intelligence Artificielle',
        description: 'Nous avons besoin de 5 experts IA mais nous n\'en avons que 2. Gap de 60%.',
        impact: '60% des besoins non couverts',
        recommendations: [
          'Lancer un recrutement urgent',
          'Former les développeurs seniors existants',
          'Externaliser temporairement certains projets IA'
        ],
        affectedEntities: [],
        metrics: {
          current_value: 2,
          threshold_value: 5,
          target_value: 5,
          trend: 'decreasing',
          confidence_level: 85,
          time_to_critical: 30
        },
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'skills',
        priority: 'urgent',
        tags: ['ia', 'recrutement', 'formation']
      },
      {
        id: 'GPEC-002',
        type: 'departure_risk',
        severity: 'high',
        title: 'Risque de départ: Marie Martin',
        description: 'Marie Martin (Lead Developer) a 80% de risque de partir dans les 6 prochains mois.',
        impact: 'Perte d\'expertise technique critique',
        recommendations: [
          'Entretien de rétention immédiat',
          'Révision salariale',
          'Plan de carrière personnalisé',
          'Amélioration conditions de travail'
        ],
        affectedEntities: [],
        metrics: {
          current_value: 80,
          threshold_value: 70,
          trend: 'increasing',
          confidence_level: 75
        },
        status: 'active',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'retention',
        priority: 'high',
        tags: ['rétention', 'lead-developer', 'expertise-critique']
      },
      {
        id: 'GPEC-003',
        type: 'department_gap',
        severity: 'high',
        title: 'Gap départemental: IT',
        description: 'Le département IT a 45% de compétences manquantes en technologies cloud.',
        impact: 'Retard sur les projets de transformation digitale',
        recommendations: [
          'Formation massive en cloud computing',
          'Recrutement d\'experts cloud',
          'Partenariat avec des consultants',
          'Certification AWS/Azure pour l\'équipe'
        ],
        affectedEntities: [],
        metrics: {
          current_value: 45,
          threshold_value: 40,
          trend: 'increasing',
          confidence_level: 90
        },
        status: 'acknowledged',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'skills',
        priority: 'high',
        tags: ['cloud', 'formation', 'it']
      },
      {
        id: 'GPEC-004',
        type: 'training_needed',
        severity: 'medium',
        title: 'Formation urgente: Cybersécurité',
        description: '12 employés ont besoin d\'une formation urgente en cybersécurité suite aux nouvelles réglementations.',
        impact: 'Risque de non-conformité RGPD',
        recommendations: [
          'Organiser une session de formation RGPD',
          'Certification en cybersécurité',
          'Mise à jour des procédures',
          'Audit de sécurité'
        ],
        affectedEntities: [],
        metrics: {
          current_value: 12,
          threshold_value: 10,
          trend: 'stable',
          confidence_level: 95
        },
        status: 'in_progress',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'compliance',
        priority: 'medium',
        tags: ['cybersécurité', 'rgpd', 'formation']
      }
    ];

    this.dashboard = {
      overview: {
        total_alerts: this.alerts.length,
        critical_alerts: this.alerts.filter(a => a.severity === 'critical').length,
        resolved_this_month: 8,
        average_resolution_time: 3.5
      },
      alerts_by_category: {
        skills: 2,
        retention: 1,
        performance: 0,
        compliance: 1,
        strategic: 0
      },
      alerts_by_severity: {
        critical: 1,
        high: 2,
        medium: 1,
        low: 0
      },
      trending_risks: [
        {
          type: 'critical_skills_shortage',
          trend: 'increasing',
          change_percentage: 25,
          affected_count: 3,
          description: 'Augmentation des pénuries de compétences techniques'
        }
      ],
      upcoming_deadlines: [
        {
          alert_id: 'GPEC-001',
          title: 'Recrutement IA urgent',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          days_remaining: 7,
          priority: 'urgent',
          assigned_to: 'Équipe RH'
        }
      ],
      success_stories: [
        {
          title: 'Formation DevOps réussie',
          description: 'Formation de 8 développeurs en DevOps, réduction du time-to-market de 30%',
          metrics_improved: ['Déploiements', 'Qualité', 'Vélocité'],
          time_to_resolution: 45,
          cost_saved: 25000,
          date_resolved: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        }
      ]
    };

    this.calculateStats();
    this.loading = false;
  }

  // === MÉTHODES D'AFFICHAGE ===
  
  setActiveTab(tab: string): void {
    this.selectedTab = tab;
  }

  refreshData(): void {
    this.loadInitialData();
  }

  exportAlerts(): void {
    const csvData = this.generateAlertsCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertes-gpec-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateAlertsCSV(): string {
    const headers = ['ID', 'Type', 'Sévérité', 'Titre', 'Statut', 'Créé le', 'Priorité'];
    const rows = this.alerts.map(alert => [
      alert.id,
      alert.type,
      alert.severity,
      alert.title,
      alert.status,
      this.formatDate(alert.createdAt),
      alert.priority
    ]);

    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  }

  // === GESTION DES SEUILS ===
  
  updateThresholds(): void {
    // Ouvrir un modal de configuration des seuils
    console.log('Ouverture configuration seuils');
  }

  // === ACTIONS AUTOMATIQUES ===
  
  enableAutoActions(): void {
    console.log('Activation des actions automatiques');
  }

  configureNotifications(): void {
    console.log('Configuration des notifications');
  }
}