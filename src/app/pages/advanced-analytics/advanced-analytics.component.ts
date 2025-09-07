import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

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
  @ViewChild('trendsChart') trendsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contractChart') contractChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('exportMenu') exportMenuRef!: ElementRef;

  // État du composant
  dashboard: AdvancedDashboard | null = null;
  loading = false;
  error: string | null = null;
  
  // Graphiques
  private charts: { [key: string]: Chart } = {};
  
  // Filtres et configuration
  filters: AnalyticsFilters = {};
  activeTab: 'overview' | 'departments' | 'skills' | 'contracts' | 'trends' = 'overview';
  
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
  tabs: { key: 'overview' | 'departments' | 'skills' | 'contracts' | 'trends', label: string, icon: string }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { key: 'departments', label: 'Départements', icon: '🏢' },
    { key: 'skills', label: 'Compétences', icon: '🎯' },
    { key: 'contracts', label: 'Contrats', icon: '📝' },
    { key: 'trends', label: 'Tendances', icon: '📈' }
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
  onDocumentClick(event: Event) {
    if (this.showExportMenu && this.exportMenuRef && !this.exportMenuRef.nativeElement.contains(event.target)) {
      this.showExportMenu = false;
    }
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.subscribeToAnalyticsState();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
  }

  // === GESTION DES DONNÉES ===
  private loadDashboardData(): void {
    this.loading = true;
    this.analyticsService.getAdvancedDashboard(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
          this.processData();
          this.createAllCharts();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur chargement dashboard:', error);
          this.error = 'Erreur lors du chargement du dashboard';
          this.loading = false;
          this.cdr.detectChanges();
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

    // Traitement des cartes métriques
    this.metricCards = [
      {
        title: 'Employés Totaux',
        value: this.dashboard.metrics.totalEmployees,
        icon: '👥',
        color: this.colorPalette.primary,
        change: 5.2,
        changeType: 'increase'
      },
      {
        title: 'Offres d\'emploi',
        value: this.dashboard.metrics.totalJobOffers,
        icon: '💼',
        color: this.colorPalette.secondary,
        change: 12.4,
        changeType: 'increase'
      },
      {
        title: 'Taux de succès',
        value: `${this.dashboard.metrics.overallSuccessRate}%`,
        icon: '📈',
        color: this.colorPalette.success,
        change: 2.1,
        changeType: 'increase'
      },
      {
        title: 'Temps d\'embauche moyen',
        value: `${this.dashboard.metrics.avgTimeToHire}j`,
        icon: '⏱️',
        color: this.colorPalette.warning,
        change: -3.2,
        changeType: 'decrease'
      }
    ];

    // Extraction des données pour les graphiques
    this.departmentStats = this.dashboard.departmentAnalysis?.stats || [];
    this.skillsDemand = this.dashboard.skillsAnalysis?.demand || [];
    this.contractStats = this.dashboard.contractAnalysis?.breakdown || [];
  }

  // === GESTION DES ONGLETS ===
  setActiveTab(tab: 'overview' | 'departments' | 'skills' | 'contracts' | 'trends'): void {
    this.activeTab = tab;

    // Redessiner les graphiques après changement d'onglet
    setTimeout(() => {
      this.resizeCharts();
    }, 100);
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
  private createAllCharts(): void {
    setTimeout(() => {
      this.createMetricsChart();
      this.createDepartmentChart();
      this.createSkillsChart();
      this.createTrendsChart();
      this.createContractChart();
    }, 100);
  }

  private createMetricsChart(): void {
    const ctx = this.metricsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.dashboard) return;

    this.destroyChart('metrics');

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Employés', 'Offres actives', 'Candidatures', 'Postes pourvus'],
        datasets: [{
          data: [
            this.dashboard.metrics.totalEmployees,
            this.dashboard.metrics.publishedOffers,
            this.dashboard.metrics.totalJobOffers,
            Math.floor(this.dashboard.metrics.totalJobOffers * (this.dashboard.metrics.overallSuccessRate / 100))
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
    if (!ctx || !this.departmentStats.length) return;

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
    if (!ctx || !this.skillsDemand.length) return;

    this.destroyChart('skills');

    const topSkills = this.skillsDemand.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topSkills.map(s => s.skill_name),
        datasets: [{
          label: 'Demande',
          data: topSkills.map(s => s.demand_count),
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
                  `Demande: ${skill.demand_count}`,
                  `Type: ${skill.skill_type}`,
                  `Score marché: ${skill.market_value_score}`
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

  private createTrendsChart(): void {
    const ctx = this.trendsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.dashboard?.trends?.historical) return;

    this.destroyChart('trends');

    const trendsData = this.dashboard.trends.historical;
    const uniqueMetrics = [...new Set(trendsData.map(t => t.metric))];
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: trendsData.filter(t => t.metric === uniqueMetrics[0]).map(t => t.period),
        datasets: uniqueMetrics.map((metric, index) => ({
          label: metric,
          data: trendsData.filter(t => t.metric === metric).map(t => t.value),
          borderColor: this.colorPalette.gradient[index % this.colorPalette.gradient.length],
          backgroundColor: this.colorPalette.gradient[index % this.colorPalette.gradient.length] + '20',
          fill: false,
          tension: 0.4
        }))
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
          x: {
            display: true,
            title: {
              display: true,
              text: 'Période'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Valeur'
            }
          }
        }
      }
    };

    this.charts['trends'] = new Chart(ctx, config);
  }

  private createContractChart(): void {
    const ctx = this.contractChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.contractStats.length) return;

    this.destroyChart('contract');

    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: this.contractStats.map(c => c.contract_type),
        datasets: [
          {
            label: 'Taux de succès (%)',
            data: this.contractStats.map(c => c.success_rate),
            backgroundColor: this.colorPalette.primary + '30',
            borderColor: this.colorPalette.primary,
            pointBackgroundColor: this.colorPalette.primary,
          },
          {
            label: 'Satisfaction (%)',
            data: this.contractStats.map(c => c.satisfaction_rate),
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