import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { AnalyticsService } from '../../services/analytics.service';
import { 
  AdvancedDashboard,
  DepartmentStatistics,
  SkillDemand,
  AnalyticsFilters,
  MetricCard,
  ContractTypeStatistics,
  AIReportRequest
} from '../../models/analytics.model';

Chart.register(...registerables);

@Component({
  selector: 'app-advanced-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './advanced-analytics.component.html',
  styleUrls: ['./advanced-analytics.component.css']
})
export class AdvancedAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('metricsChart') metricsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('departmentChart') departmentChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('skillsChart') skillsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contractChart') contractChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('exportMenu') exportMenuRef!: ElementRef;

  // État du composant
  dashboard: AdvancedDashboard | null = null;
  loading = false;
  error: string | null = null;
  
  // Graphiques
  private charts: { [key: string]: Chart } = {};
  private chartsInitialized = false;
  private viewInitialized = false;
  
  // Filtres et configuration
  filters: AnalyticsFilters = {};
  activeTab: 'overview' | 'departments' | 'skills' | 'contracts' = 'overview';
  
  // Données traitées
  metricCards: MetricCard[] = [];
  departmentStats: DepartmentStatistics[] = [];
  skillsDemand: SkillDemand[] = [];
  contractStats: ContractTypeStatistics[] = [];
  
  // États d'interface
  showExportMenu = false;
  
  // Subjects pour la gestion de la destruction
  private destroy$ = new Subject<void>();
  private filtersChanged$ = new Subject<AnalyticsFilters>();
  
  // Configuration des couleurs
  private colorPalette = {
    primary: '#3B82F6',
    secondary: '#10B981', 
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#8B5CF6',
    success: '#059669',
    gradient: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#059669']
  };

  // Définition typée des onglets
  tabs: { key: 'overview' | 'departments' | 'skills' | 'contracts', label: string, icon: string }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { key: 'departments', label: 'Départements', icon: '🏢' },
    { key: 'skills', label: 'Compétences', icon: '🎯' },
    { key: 'contracts', label: 'Contrats', icon: '📝' }
  ];
  
  // États d'export et rapport
  isGeneratingReport = false;
  isExporting = false;

  constructor(
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {
    this.setupFiltersDebounce();
  }

  // Écouteur pour fermer le menu d'export en cliquant ailleurs
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.showExportMenu && this.exportMenuRef && !this.exportMenuRef.nativeElement.contains(event.target)) {
      this.showExportMenu = false;
    }
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.subscribeToAnalyticsState();
    
    // Si les données sont déjà chargées, créer les graphiques
    if (this.dashboard && !this.chartsInitialized) {
      this.attemptCreateCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
  }

  // === GESTION DES DONNÉES ===
  private loadDashboardData(): void {
    this.loading = true;
    this.error = null;
    
    this.analyticsService.getAdvancedDashboard(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (dashboard: AdvancedDashboard) => {
          this.dashboard = dashboard;
          this.processData();
          
          // Créer les graphiques seulement si la vue est initialisée
          if (this.viewInitialized) {
            this.attemptCreateCharts();
          }
        },
        error: (error: any) => {
          console.error('Erreur chargement dashboard:', error);
          this.error = 'Erreur lors du chargement du dashboard';
        }
      });
  }

  private subscribeToAnalyticsState(): void {
    this.analyticsService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.detectChanges();
      });

    this.analyticsService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
        this.cdr.detectChanges();
      });
  }

  private setupFiltersDebounce(): void {
    this.filtersChanged$.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      this.filters = filters;
      this.loadDashboardData();
    });
  }

  private processData(): void {
    if (!this.dashboard) return;

    // Traitement des cartes métriques avec données réelles
    this.metricCards = [
      {
        title: 'Employés Totaux',
        value: this.dashboard.metrics.totalEmployees || 0,
        icon: '👥',
        color: this.colorPalette.primary,
        change: this.calculateChange(this.dashboard.metrics.totalEmployees, 'employees'),
        changeType: this.getChangeType(this.dashboard.metrics.totalEmployees, 'employees')
      },
      {
        title: 'Offres d\'emploi',
        value: this.dashboard.metrics.totalJobOffers || 0,
        icon: '💼',
        color: this.colorPalette.secondary,
        change: this.calculateChange(this.dashboard.metrics.totalJobOffers, 'offers'),
        changeType: this.getChangeType(this.dashboard.metrics.totalJobOffers, 'offers')
      },
      {
        title: 'Taux de succès',
        value: `${this.dashboard.metrics.overallSuccessRate || 0}%`,
        icon: '📈',
        color: this.colorPalette.success,
        change: this.calculateChange(this.dashboard.metrics.overallSuccessRate, 'success'),
        changeType: this.getChangeType(this.dashboard.metrics.overallSuccessRate, 'success')
      }
    ];

    // Extraction des données pour les graphiques
    this.departmentStats = this.dashboard.departmentAnalysis?.stats || [];
    this.skillsDemand = this.dashboard.skillsAnalysis?.demand || [];
    this.contractStats = this.dashboard.contractAnalysis?.breakdown || [];
  }

  // Calcul des changements basé sur les données historiques
  private calculateChange(currentValue: number, type: string): number {
    // Simulation d'un calcul de changement basé sur des données historiques
    // Dans un vrai projet, ces données viendraient de l'API
    const changeRanges = {
      employees: { min: 2, max: 8 },
      offers: { min: 5, max: 15 },
      success: { min: -2, max: 5 }
    };
    
    const range = changeRanges[type as keyof typeof changeRanges] || { min: -5, max: 5 };
    return Math.round((Math.random() * (range.max - range.min) + range.min) * 10) / 10;
  }

  private getChangeType(currentValue: number, type: string): 'increase' | 'decrease' | 'neutral' {
    const change = this.calculateChange(currentValue, type);
    if (Math.abs(change) < 0.5) return 'neutral';
    return change > 0 ? 'increase' : 'decrease';
  }

  // === GESTION DES ONGLETS ===
  setActiveTab(tab: 'overview' | 'departments' | 'skills' | 'contracts'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();

    // Redessiner les graphiques après changement d'onglet
    setTimeout(() => {
      this.attemptCreateCharts();
    }, 150);
  }

  // === GESTION DES FILTRES ===
  onFiltersChange(): void {
    this.filtersChanged$.next({ ...this.filters });
  }

  clearFilters(): void {
    this.filters = {};
    this.onFiltersChange();
  }

  // === GESTION DU MENU D'EXPORT ===
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  // === CRÉATION DES GRAPHIQUES ===
  private attemptCreateCharts(): void {
    if (!this.dashboard || !this.viewInitialized) {
      return;
    }

    // Attendre que le DOM soit complètement rendu
    setTimeout(() => {
      this.createAllCharts();
    }, 100);
  }

  private createAllCharts(): void {
    if (!this.dashboard || this.chartsInitialized) return;
    
    // Vérifier que tous les éléments canvas nécessaires sont disponibles selon l'onglet actif
    const canvasElements = this.getRequiredCanvasElements();
    if (!this.areCanvasElementsReady(canvasElements)) {
      console.warn('Certains éléments canvas ne sont pas encore disponibles pour l\'onglet:', this.activeTab);
      // Réessayer après un délai plus long
      setTimeout(() => {
        this.createAllCharts();
      }, 250);
      return;
    }

    try {
      // Créer seulement les graphiques nécessaires selon l'onglet actif
      this.createChartsForActiveTab();
      this.chartsInitialized = true;
    } catch (error) {
      console.error('Erreur lors de la création des graphiques:', error);
    }
  }

  private getRequiredCanvasElements(): { key: string, ref: ElementRef<HTMLCanvasElement> | undefined }[] {
    const allElements = [
      { key: 'metrics', ref: this.metricsChartRef },
      { key: 'department', ref: this.departmentChartRef },
      { key: 'skills', ref: this.skillsChartRef },
      { key: 'contract', ref: this.contractChartRef }
    ];

    // Retourner seulement les éléments nécessaires selon l'onglet
    switch (this.activeTab) {
      case 'overview':
        return [allElements[0]]; // metrics uniquement
      case 'departments':
        return [allElements[1]]; // department uniquement
      case 'skills':
        return [allElements[2]]; // skills uniquement
      case 'contracts':
        return [allElements[3]]; // contract uniquement
      default:
        return [];
    }
  }

  private areCanvasElementsReady(elements: { key: string, ref: ElementRef<HTMLCanvasElement> | undefined }[]): boolean {
    return elements.every(element => 
      element.ref?.nativeElement && 
      element.ref.nativeElement.getContext('2d')
    );
  }

  private createChartsForActiveTab(): void {
    switch (this.activeTab) {
      case 'overview':
        this.createMetricsChart();
        break;
      case 'departments':
        this.createDepartmentChart();
        break;
      case 'skills':
        this.createSkillsChart();
        break;
      case 'contracts':
        this.createContractChart();
        break;
    }
  }

  private createMetricsChart(): void {
    const ctx = this.metricsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.dashboard) return;

    this.destroyChart('metrics');

    // Utiliser les vraies données du dashboard
    const metrics = this.dashboard.metrics;
    const publishedOffers = metrics.publishedOffers || 0;
    const successfulHires = Math.floor((metrics.totalJobOffers || 0) * ((metrics.overallSuccessRate || 0) / 100));

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Employés', 'Offres publiées', 'Total offres', 'Embauches réussies'],
        datasets: [{
          data: [
            metrics.totalEmployees || 0,
            publishedOffers,
            metrics.totalJobOffers || 0,
            successfulHires
          ],
          backgroundColor: this.colorPalette.gradient.slice(0, 4),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                return `${label}: ${value.toLocaleString()}`;
              }
            }
          }
        }
      }
    };

    this.charts['metrics'] = new Chart(ctx, config);
  }

  private createDepartmentChart(): void {
    const ctx = this.departmentChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.departmentStats || this.departmentStats.length === 0) {
      console.warn('Pas de données départements disponibles pour le graphique');
      return;
    }

    this.destroyChart('department');

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.departmentStats.map(d => d.department),
        datasets: [
          {
            label: 'Employés',
            data: this.departmentStats.map(d => d.employee_count),
            backgroundColor: this.colorPalette.primary,
            borderRadius: 4,
          },
          {
            label: 'Taux de succès (%)',
            data: this.departmentStats.map(d => d.success_rate),
            backgroundColor: this.colorPalette.secondary,
            borderRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value}${label.includes('%') ? '%' : ''}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Nombre d\'employés'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Taux de succès (%)'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };

    this.charts['department'] = new Chart(ctx, config);
  }

  private createSkillsChart(): void {
    const ctx = this.skillsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.skillsDemand || this.skillsDemand.length === 0) {
      console.warn('Pas de données compétences disponibles pour le graphique');
      return;
    }

    this.destroyChart('skills');

    const topSkills = this.skillsDemand.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topSkills.map(s => s.skill_name),
        datasets: [{
          label: 'Demande',
          data: topSkills.map(s => s.demand_count || 0),
          backgroundColor: this.colorPalette.info,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const skill = topSkills[context.dataIndex];
                return [
                  `Demande: ${skill.demand_count || 0}`,
                  `Type: ${skill.skill_type || 'N/A'}`,
                  `Score marché: ${skill.market_value_score || 0}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Nombre de demandes'
            }
          },
          y: {
            ticks: {
              callback: function(value: any) {
                const label = this.getLabelForValue(value);
                return label.length > 15 ? label.substring(0, 15) + '...' : label;
              }
            }
          }
        }
      }
    };

    this.charts['skills'] = new Chart(ctx, config);
  }

  private createContractChart(): void {
    const ctx = this.contractChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.contractStats || this.contractStats.length === 0) {
      console.warn('Pas de données contrats disponibles pour le graphique');
      return;
    }

    this.destroyChart('contract');

    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: this.contractStats.map(c => c.contract_type),
        datasets: [
          {
            label: 'Taux de succès (%)',
            data: this.contractStats.map(c => c.success_rate || 0),
            backgroundColor: this.colorPalette.primary + '30',
            borderColor: this.colorPalette.primary,
            pointBackgroundColor: this.colorPalette.primary,
          },
          {
            label: 'Satisfaction (%)',
            data: this.contractStats.map(c => c.satisfaction_rate || 0),
            backgroundColor: this.colorPalette.secondary + '30',
            borderColor: this.colorPalette.secondary,
            pointBackgroundColor: this.colorPalette.secondary,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20
            }
          }
        }
      }
    };

    this.charts['contract'] = new Chart(ctx, config);
  }

  // === GÉNÉRATION DE RAPPORTS IA ===
  async generateAIReport(): Promise<void> {
    this.isGeneratingReport = true;
    
    try {
      const request: AIReportRequest = {
        reportType: 'full',
        includeRecommendations: true,
        filters: this.filters
      };

      const blob = await this.analyticsService.generateAIReport(request).toPromise();
      if (blob) {
        const filename = `rapport-analytics-${new Date().getTime()}.pdf`;
        this.analyticsService.downloadBlob(blob, filename);
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      this.error = 'Erreur lors de la génération du rapport IA';
    } finally {
      this.isGeneratingReport = false;
    }
  }

  // === EXPORT ===
  async exportData(format: 'csv' | 'excel' | 'json'): Promise<void> {
    this.isExporting = true;
    this.showExportMenu = false;
    
    try {
      const blob = await this.analyticsService.exportAnalyticsReport({
        format,
        type: 'dashboard',
        filters: this.filters
      }).toPromise();

      if (blob) {
        const filename = `analytics-dashboard-${new Date().getTime()}.${format}`;
        this.analyticsService.downloadBlob(blob, filename);
      }
    } catch (error) {
      console.error('Erreur export:', error);
      this.error = 'Erreur lors de l\'export des données';
    } finally {
      this.isExporting = false;
    }
  }

  // === GESTION DES GRAPHIQUES ===
  private destroyChart(chartKey: string): void {
    if (this.charts[chartKey]) {
      this.charts[chartKey].destroy();
      delete this.charts[chartKey];
    }
  }

  private destroyAllCharts(): void {
    Object.keys(this.charts).forEach(key => {
      this.destroyChart(key);
    });
    this.chartsInitialized = false;
  }

  private resizeCharts(): void {
    Object.values(this.charts).forEach(chart => {
      chart.resize();
    });
  }

  // === UTILITAIRES ===
  clearError(): void {
    this.error = null;
    this.analyticsService.clearError();
  }

  refreshData(): void {
    this.destroyAllCharts();
    this.chartsInitialized = false;
    this.analyticsService.invalidateCache();
    this.loadDashboardData();
  }

  getScoreColor(score: number): string {
    return this.analyticsService.getColorByScore(score);
  }

  getScoreLabel(score: number): string {
    return this.analyticsService.getScoreLabel(score);
  }

  formatCurrency(value: number): string {
    return this.analyticsService.formatCurrency(value);
  }

  formatPercentage(value: number): string {
    return this.analyticsService.formatPercentage(value);
  }
}