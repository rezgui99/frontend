import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { GPECAlertsService } from '../../services/gpec-alerts.service';
import { GPECAlert } from '../../models/gpec-alerts.model';

@Component({
  selector: 'app-gpec-alert-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
          <span class="text-red-500 mr-2">🚨</span>
          Alertes GPEC
        </h3>
        <a routerLink="/gpec-alerts" 
           class="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Voir tout →
        </a>
      </div>

      <div *ngIf="loading" class="text-center py-4">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
      </div>

      <div *ngIf="!loading && criticalAlerts.length === 0" class="text-center py-4 text-gray-500">
        <div class="text-2xl mb-2">✅</div>
        <p class="text-sm">Aucune alerte critique</p>
      </div>

      <div *ngIf="!loading && criticalAlerts.length > 0" class="space-y-3">
        <div *ngFor="let alert of criticalAlerts.slice(0, 3)" 
             class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="font-medium text-red-800 text-sm">{{ alert.title }}</h4>
              <p class="text-red-600 text-xs mt-1">{{ alert.description }}</p>
              <div class="flex items-center mt-2 space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {{ getSeverityIcon(alert.severity) }} {{ alert.severity.toUpperCase() }}
                </span>
                <span class="text-xs text-gray-500">{{ getTimeAgo(alert.createdAt) }}</span>
              </div>
            </div>
            <button (click)="acknowledgeAlert(alert)" 
                    class="text-red-600 hover:text-red-800 text-xs ml-2">
              ✓
            </button>
          </div>
        </div>

        <div *ngIf="criticalAlerts.length > 3" class="text-center">
          <a routerLink="/gpec-alerts" 
             class="text-sm text-red-600 hover:text-red-800 font-medium">
            +{{ criticalAlerts.length - 3 }} autres alertes critiques
          </a>
        </div>
      </div>

      <!-- Statistiques rapides -->
      <div class="mt-4 pt-3 border-t border-gray-200">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="text-lg font-bold text-red-600">{{ totalCritical }}</div>
            <div class="text-xs text-gray-500">Critiques</div>
          </div>
          <div>
            <div class="text-lg font-bold text-orange-600">{{ totalHigh }}</div>
            <div class="text-xs text-gray-500">Élevées</div>
          </div>
          <div>
            <div class="text-lg font-bold text-green-600">{{ resolvedToday }}</div>
            <div class="text-xs text-gray-500">Résolues</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class GPECAlertWidgetComponent implements OnInit, OnDestroy {
  criticalAlerts: GPECAlert[] = [];
  totalCritical = 0;
  totalHigh = 0;
  resolvedToday = 0;
  loading = true;

  private subscriptions: Subscription[] = [];

  constructor(private gpecService: GPECAlertsService) {}

  ngOnInit(): void {
    this.loadAlerts();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadAlerts(): void {
    this.subscriptions.push(
      this.gpecService.loadAlerts().subscribe({
        next: (alerts) => {
          this.criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'active');
          this.totalCritical = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;
          this.totalHigh = alerts.filter(a => a.severity === 'high' && a.status === 'active').length;
          this.resolvedToday = alerts.filter(a => 
            a.status === 'resolved' && 
            this.isToday(a.resolvedAt)
          ).length;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur chargement alertes widget:', error);
          this.loading = false;
          // Charger des données de démonstration
          this.loadDemoData();
        }
      })
    );
  }

  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.gpecService.criticalAlerts$.subscribe(alerts => {
        this.criticalAlerts = alerts;
        this.totalCritical = alerts.length;
      })
    );
  }

  private loadDemoData(): void {
    this.criticalAlerts = [
      {
        id: 'GPEC-001',
        type: 'critical_skills_shortage',
        severity: 'critical',
        title: 'Pénurie IA critique',
        description: 'Besoin urgent de 3 experts IA supplémentaires',
        impact: 'Retard projets stratégiques',
        recommendations: ['Recrutement urgent', 'Formation équipe'],
        affectedEntities: [],
        metrics: {
          current_value: 2,
          threshold_value: 5,
          trend: 'decreasing',
          confidence_level: 85
        },
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'skills',
        priority: 'urgent',
        tags: ['ia']
      }
    ];
    
    this.totalCritical = 1;
    this.totalHigh = 2;
    this.resolvedToday = 3;
    this.loading = false;
  }

  acknowledgeAlert(alert: GPECAlert): void {
    this.gpecService.acknowledgeAlert(alert.id).subscribe({
      next: () => {
        console.log('Alerte prise en charge depuis le widget');
      },
      error: (error) => {
        console.error('Erreur prise en charge:', error);
      }
    });
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

  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const alertDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - alertDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}j`;
  }

  private isToday(date?: Date): boolean {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  }
}