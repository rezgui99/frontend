import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, retry, shareReplay, tap, timeout } from 'rxjs/operators';
import {
  AnalyticsOverview,
  AdvancedDashboard,
  DepartmentStatistics,
  EmployeeSkillRecommendation,
  ApplicationSuccessPrediction,
  AnalyticsFilters,
  SkillDemand,
  ContractTypeStatistics,
  AIReportRequest,
  AIReportResponse,
  SystemHealth,
  RealtimeStats,
  AlertThresholds,
  ExportOptions
} from '../models/analytics.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = `${environment.backendUrl}/analytics`;
  templateUrl: './candidate-job-offer-detail.component.html',
  styleUrls: ['./candidate-job-offer-detail.component.css']
        observer.complete();
      });
    }

    console.log(`Récupération des données depuis l'API pour: ${key}`);
    return fetchFn().pipe(
      tap(data => {
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });
        console.log(`Données mises en cache pour: ${key}`);
      }),
      shareReplay(1),
      catchError(this.handleError)
    );
  }

  clearCache(): void {
    this.cache.clear();
    console.log('Cache analytics vidé');
  }

  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.clearCache();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((value, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`Cache invalidé pour le pattern: ${pattern}`);
  }

  // === UTILITAIRES ===
  private buildHttpParams(filters?: AnalyticsFilters, params?: HttpParams): HttpParams {
    if (!params) {
      params = new HttpParams();
    }

    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params!.set(key, value.toString());
        }
      });
    }

    return params;
  }

  private handleError = (error: any): Observable<never> => {
    console.error('Analytics service error:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
          break;
        case 400:
          errorMessage = 'Requête invalide';
          break;
        case 401:
          errorMessage = 'Non autorisé';
          break;
        case 403:
          errorMessage = 'Accès interdit';
          break;
        case 404:
          errorMessage = 'Endpoint analytics non trouvé. Vérifiez la configuration de l\'API.';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Serveur temporairement indisponible';
          break;
        default:
          errorMessage = error.error?.message || error.message || `Erreur ${error.status}`;
      }
    }

    this.setError(errorMessage);
    return throwError(errorMessage);
  };

  private initializeErrorHandling(): void {
    // Nettoyage automatique du cache toutes les heures
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      this.cache.forEach((value, key) => {
        if ((now - value.timestamp) > value.ttl) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.cache.delete(key));
      
      if (keysToDelete.length > 0) {
        console.log(`Nettoyage automatique du cache: ${keysToDelete.length} entrées supprimées`);
      }
    }, 60 * 60 * 1000); // 1 heure
  }

  // === HELPERS POUR LES COMPOSANTS ===
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  formatPercentage(value: number): string {
    return `${Math.round(value * 10) / 10}%`;
  }

  formatCurrency(value: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(value);
  }

  getColorByScore(score: number): string {
    if (score >= 80) return '#10B981'; // Vert
    if (score >= 60) return '#F59E0B'; // Orange
    if (score >= 40) return '#EF4444'; // Rouge
    return '#6B7280'; // Gris
  }

  getScoreLabel(score: number): string {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Bon';
  hasRequiredSkills(): boolean {
    return !!(this.jobOffer?.description && 
             typeof this.jobOffer.description === 'object' && 
             this.jobOffer.description.requiredSkills && 
             Array.isArray(this.jobOffer.description.requiredSkills) &&
             this.jobOffer.description.requiredSkills.length > 0);
  }

  getRequiredSkills(): any[] {
    if (!this.hasRequiredSkills()) return [];
    return (this.jobOffer!.description as any).requiredSkills;
  }

  getSkillName(skill: any): string {
    return skill?.Skill?.name || skill?.name || 'Compétence non définie';
  }

  getSkillLevel(skill: any): string {
    return skill?.SkillLevel?.level_name || skill?.level_name || 'Niveau non défini';
  }

  getJobDescription(): any {
    return (this.jobOffer as any)?.jobDescription || null;
  }
    if (score >= 50) return 'Moyen';
    if (score >= 30) return 'Faible';
    return 'Critique';
  }
}