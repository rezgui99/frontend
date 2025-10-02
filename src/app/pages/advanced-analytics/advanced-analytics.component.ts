import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef, HostListener, ChangeDetectionStrategy, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, finalize, timeout } from 'rxjs';

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
  styleUrls: ['./advanced-analytics.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  
  // Optimisations performance
  private resizeObserver?: ResizeObserver;
  private chartCreationQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  
  // Filtres et configuration
  filters: AnalyticsFilters = {};
  activeTab: 'overview' | 'departments' | 'skills' | 'contracts' = 'overview';
  
  // Données traitées
  metricCards: MetricCard[] = [];
  departmentStats: DepartmentStatistics[] = [];
  skillsDemand: SkillDemand[] = [];
  contractStats: ContractTypeStatistics[] = [];
  
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
  
  // TrackBy functions pour optimiser *ngFor
  trackByDepartment: TrackByFunction<DepartmentStatistics> = (index, dept) => dept.department;
  trackBySkill: TrackByFunction<SkillDemand> = (index, skill) => skill.skill_id;
  trackByContract: TrackByFunction<ContractTypeStatistics> = (index, contract) => contract.contract_type;

  private resizeTimeout: any;

  constructor(
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {
    this.setupFiltersDebounce();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.subscribeToAnalyticsState();
    this.setupResizeObserver();
    
    // Si les données sont déjà chargées, créer les graphiques avec un délai
    if (this.dashboard && !this.chartsInitialized) {
      setTimeout(() => {
        this.scheduleChartCreation(() => this.createChartsOptimized());
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
    this.resizeObserver?.disconnect();
  }

  // === OPTIMISATIONS PERFORMANCE ===
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleChartCreation(() => this.resizeCharts());
      });
      
      const containers = [
        this.metricsChartRef?.nativeElement,
        this.departmentChartRef?.nativeElement,
        this.skillsChartRef?.nativeElement,
        this.contractChartRef?.nativeElement
      ].filter(Boolean);
      
      containers.forEach(container => {
        if (container) this.resizeObserver!.observe(container);
      });
    }
  }

  private scheduleChartCreation(task: () => void): void {
    this.chartCreationQueue.push(task);
    if (!this.isProcessingQueue) {
      this.processChartQueue();
    }
  }

  private async processChartQueue(): Promise<void> {
    this.isProcessingQueue = true;
    
    while (this.chartCreationQueue.length > 0) {
      const task = this.chartCreationQueue.shift();
      if (task) {
        await this.runWhenIdle(task);
      }
    }
    
    this.isProcessingQueue = false;
  }

  private runWhenIdle(task: () => void): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          task();
          resolve();
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          task();
          resolve();
        }, 16);
      }
    });
  }

  // === GESTION DES DONNÉES ===
  private loadDashboardData(): void {
    this.loading = true;
    this.error = null;
    
    this.analyticsService.getAdvancedDashboard(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (dashboard: AdvancedDashboard) => {
          this.dashboard = dashboard;
          this.processDataInChunks();
          
          if (this.viewInitialized) {
            setTimeout(() => {
              this.scheduleChartCreation(() => this.createChartsOptimized());
            }, 100);
          }
        },
        error: (error: any) => {
          console.error('Erreur chargement dashboard:', error);
          this.error = 'Erreur lors du chargement du dashboard';
          this.cdr.markForCheck();
        }
      });
  }

  private async processDataInChunks(): Promise<void> {
    if (!this.dashboard) return;

    await this.runWhenIdle(() => {
      this.metricCards = this.calculateMetricCards();
    });

    await this.runWhenIdle(() => {
      this.departmentStats = this.dashboard!.departmentAnalysis?.stats || [];
    });

    await this.runWhenIdle(() => {
      this.skillsDemand = this.dashboard!.skillsAnalysis?.demand || [];
    });

    await this.runWhenIdle(() => {
      this.contractStats = this.dashboard!.contractAnalysis?.breakdown || [];
    });

    this.chartsInitialized = false;
    this.cdr.markForCheck();
  }

  private subscribeToAnalyticsState(): void {
    this.analyticsService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    this.analyticsService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
        this.cdr.markForCheck();
      });
  }

  private setupFiltersDebounce(): void {
    this.filtersChanged$.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          this.filters = filters;
          this.loadDashboardData();
        });
      } else {
        setTimeout(() => {
          this.filters = filters;
          this.loadDashboardData();
        }, 0);
      }
    });
  }

  private calculateMetricCards(): MetricCard[] {
    if (!this.dashboard) return [];

    return [
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
  }

  private calculateChange(currentValue: number, type: string): number {
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
    this.cdr.markForCheck();

    // Attendre que le DOM soit mis à jour avant de créer les graphiques
    setTimeout(() => {
      this.scheduleChartCreation(() => this.createChartsOptimized());
    }, 0);
  }

  // === GESTION DES FILTRES ===
  onFiltersChange(): void {
    this.filtersChanged$.next({ ...this.filters });
  }

  clearFilters(): void {
    this.filters = {};
    this.onFiltersChange();
  }

  // === CRÉATION DES GRAPHIQUES ===
  private async createChartsOptimized(): Promise<void> {
    if (!this.dashboard || !this.viewInitialized) {
      return;
    }

    // Vérifier que les éléments canvas existent avant de créer les graphiques
    const requiredElements = this.getRequiredCanvasElements();
    if (!this.areCanvasElementsReady(requiredElements)) {
      // Réessayer après un court délai si les éléments ne sont pas prêts
      setTimeout(() => this.createChartsOptimized(), 100);
      return;
    }

    // Créer les graphiques de manière asynchrone
    await this.runWhenIdle(() => {
      this.createChartsForActiveTab();
    });
  }

  private getRequiredCanvasElements(): { key: string, ref: ElementRef<HTMLCanvasElement> | undefined }[] {
    const allElements = [
      { key: 'metrics', ref: this.metricsChartRef },
      { key: 'department', ref: this.departmentChartRef },
      { key: 'skills', ref: this.skillsChartRef },
      { key: 'contract', ref: this.contractChartRef }
    ];

    switch (this.activeTab) {
      case 'overview':
        return [allElements[0]];
      case 'departments':
        return [allElements[1]];
      case 'skills':
        return [allElements[2]];
      case 'contracts':
        return [allElements[3]];
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

  private async createChartsForActiveTab(): Promise<void> {
    // Détruire les anciens graphiques avant d'en créer de nouveaux
    this.destroyAllCharts();
    
    switch (this.activeTab) {
      case 'overview':
        await this.runWhenIdle(() => this.createMetricsChart());
        break;
      case 'departments':
        await this.runWhenIdle(() => this.createDepartmentChart());
        break;
      case 'skills':
        await this.runWhenIdle(() => this.createSkillsChart());
        break;
      case 'contracts':
        await this.runWhenIdle(() => this.createContractChart());
        break;
    }
    
    this.chartsInitialized = true;
    this.cdr.markForCheck();
  }

  private createMetricsChart(): void {
    const ctx = this.metricsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.dashboard) {
      console.warn('Canvas non disponible pour le graphique metrics');
      return;
    }

    this.destroyChart('metrics');

    const { totalEmployees = 0, publishedOffers = 0, totalJobOffers = 0, overallSuccessRate = 0 } = this.dashboard.metrics;
    const successfulHires = Math.floor(totalJobOffers * (overallSuccessRate / 100));

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Employés', 'Offres publiées', 'Total offres', 'Embauches réussies'],
        datasets: [{
          data: [totalEmployees, publishedOffers, totalJobOffers, successfulHires],
          backgroundColor: this.colorPalette.gradient.slice(0, 4),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300
        },
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

    try {
      this.charts['metrics'] = new Chart(ctx, config);
      console.log('Graphique metrics créé avec succès');
    } catch (error) {
      console.error('Erreur création graphique metrics:', error);
    }
  }

  private createDepartmentChart(): void {
    const ctx = this.departmentChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.departmentStats || this.departmentStats.length === 0) {
      console.warn('Canvas ou données départements non disponibles');
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

    try {
      this.charts['department'] = new Chart(ctx, config);
      console.log('Graphique département créé avec succès');
    } catch (error) {
      console.error('Erreur création graphique département:', error);
    }
  }

  private createSkillsChart(): void {
    const ctx = this.skillsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.skillsDemand || this.skillsDemand.length === 0) {
      console.warn('Canvas ou données compétences non disponibles');
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

    try {
      this.charts['skills'] = new Chart(ctx, config);
      console.log('Graphique compétences créé avec succès');
    } catch (error) {
      console.error('Erreur création graphique compétences:', error);
    }
  }

  private createContractChart(): void {
    const ctx = this.contractChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.contractStats || this.contractStats.length === 0) {
      console.warn('Canvas ou données contrats non disponibles');
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

    try {
      this.charts['contract'] = new Chart(ctx, config);
      console.log('Graphique contrats créé avec succès');
    } catch (error) {
      console.error('Erreur création graphique contrats:', error);
    }
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

  // === OPTIMISATIONS SUPPLÉMENTAIRES ===
  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      this.scheduleChartCreation(() => this.resizeCharts());
    }, 250);
  }
}