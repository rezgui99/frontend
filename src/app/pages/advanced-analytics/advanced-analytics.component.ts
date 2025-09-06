import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { 
  AnalyticsOverview,
  DepartmentStatistics,

  SkillDemand,
  AnalyticsFilters
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
  @ViewChild('departmentChart') departmentChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contractChart') contractChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('skillsChart') skillsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendsChart') trendsChartRef!: ElementRef<HTMLCanvasElement>;

  analyticsOverview: AnalyticsOverview | null = null;
  departmentStats: DepartmentStatistics[] = [];
  skillsDemand: SkillDemand[] = [];

  departmentChart: Chart | null = null;
  contractChart: Chart | null = null;
  skillsChart: Chart | null = null;
  trendsChart: Chart | null = null;

  filters: AnalyticsFilters = {};
  selectedPeriod: string = 'month';
  selectedMetric: string = 'applications';
  loading: boolean = true;
  errorMessage: string | null = null;
  activeTab: 'overview' | 'departments' | 'skills' = 'overview';

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  ngAfterViewInit(): void {}

  loadAnalyticsData(): void {
    this.loading = true;
    this.errorMessage = null;

    Promise.all([
      this.analyticsService.getAnalyticsOverview(this.filters).toPromise(),
      this.analyticsService.getDepartmentStatistics(this.filters).toPromise(),
      this.analyticsService.getSkillsDemandAnalysis(this.filters).toPromise()
    ]).then(([overview, departments,  skills]) => {
      this.analyticsOverview = overview || null;
      this.departmentStats = departments || [];
      this.skillsDemand = skills || [];
      this.createCharts();
      this.loading = false;
    }).catch(err => {
      console.error('Error loading analytics:', err);
      this.errorMessage = 'Erreur lors du chargement des analytics. Données simulées affichées.';
      this.loading = false;
    });
  }


  setActiveTab(tab: 'overview' | 'departments'  | 'skills' ): void {
    this.activeTab = tab;
  }

  applyFilters(): void {
    this.loadAnalyticsData();
  }

  clearFilters(): void {
    this.filters = {};
    this.loadAnalyticsData();
  }

 

  createCharts(): void {
    setTimeout(() => {
      this.createDepartmentChart();
      this.createSkillsChart();
    }, 100);
  }

  createDepartmentChart(): void {
    if (this.departmentChart) this.departmentChart.destroy();

    const ctx = this.departmentChartRef?.nativeElement?.getContext('2d');
    if (ctx && this.departmentStats.length > 0) {
      this.departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.departmentStats.map(d => d.department),
          datasets: [
            { label: 'Candidatures totales', data: this.departmentStats.map(d => d.total_applications), backgroundColor: '#3B82F6' },
            { label: 'Candidatures réussies', data: this.departmentStats.map(d => d.successful_applications), backgroundColor: '#10B981' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });
    }
  }
  createSkillsChart(): void {
    if (this.skillsChart) this.skillsChart.destroy();

    const ctx = this.skillsChartRef?.nativeElement?.getContext('2d');
    if (ctx && this.skillsDemand.length > 0) {
      this.skillsChart = new Chart(ctx, {
        type: 'bar', // Chart.js v4
        data: {
          labels: this.skillsDemand.slice(0, 10).map(s => s.skill_name),
          datasets: [{ label: 'Demande', data: this.skillsDemand.slice(0, 10).map(s => s.demand_count), backgroundColor: '#8B5CF6' }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y', // horizontal
          scales: { x: { beginAtZero: true } }
        }
      });
    }
  }
  ngOnDestroy(): void {
    if (this.departmentChart) this.departmentChart.destroy();;
    if (this.skillsChart) this.skillsChart.destroy();
  }
}
