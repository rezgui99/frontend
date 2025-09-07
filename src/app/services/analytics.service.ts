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
  
  // State management avec BehaviorSubject
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private dashboardSubject = new BehaviorSubject<AdvancedDashboard | null>(null);
  
  // Observables publics
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public dashboard$ = this.dashboardSubject.asObservable();
  
  // Cache pour les données
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly defaultTTL = 2 * 60 * 1000; // 2 minutes pour des données plus fraîches

  constructor(private http: HttpClient) {
    this.initializeErrorHandling();
  }

  // === GESTION D'ÉTAT ===
  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  setError(error: string | null): void {
    this.errorSubject.next(error);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  // === ANALYTICS DE BASE ===
  getAnalyticsOverview(filters?: AnalyticsFilters): Observable<AnalyticsOverview> {
    const cacheKey = `overview_${JSON.stringify(filters || {})}`;
    
    return this.getCachedOrFetch(cacheKey, () => {
      let params = this.buildHttpParams(filters);
      return this.http.get<AnalyticsOverview>(`${this.apiUrl}/overview`, { params })
        .pipe(
          timeout(10000), // 10 secondes timeout
          retry(2)
        );
    });
  }

  getDepartmentStatistics(filters?: AnalyticsFilters): Observable<DepartmentStatistics[]> {
    const cacheKey = `departments_${JSON.stringify(filters || {})}`;
    
    return this.getCachedOrFetch(cacheKey, () => {
      let params = this.buildHttpParams(filters);
      return this.http.get<DepartmentStatistics[]>(`${this.apiUrl}/departments`, { params })
        .pipe(
          timeout(10000),
          retry(2)
        );
    });
  }

  getContractTypeStatistics(filters?: AnalyticsFilters): Observable<ContractTypeStatistics[]> {
    const cacheKey = `contracts_${JSON.stringify(filters || {})}`;
    
    return this.getCachedOrFetch(cacheKey, () => {
      let params = this.buildHttpParams(filters);
      return this.http.get<ContractTypeStatistics[]>(`${this.apiUrl}/contract-types`, { params })
        .pipe(
          timeout(10000),
          retry(2)
        );
    });
  }

  getSkillsDemandAnalysis(filters?: AnalyticsFilters): Observable<SkillDemand[]> {
    const cacheKey = `skills_${JSON.stringify(filters || {})}`;
    
    return this.getCachedOrFetch(cacheKey, () => {
      let params = this.buildHttpParams(filters);
      return this.http.get<SkillDemand[]>(`${this.apiUrl}/skills-demand`, { params })
        .pipe(
          timeout(10000),
          retry(2)
        );
    });
  }

  // === DASHBOARD AVANCÉ ===
  getAdvancedDashboard(filters?: AnalyticsFilters): Observable<AdvancedDashboard> {
    this.setLoading(true);
    this.clearError();
    
    const cacheKey = `dashboard_${JSON.stringify(filters || {})}`;
    
    return this.getCachedOrFetch(cacheKey, () => {
      let params = this.buildHttpParams(filters);
      return this.http.get<AdvancedDashboard>(`${this.apiUrl}/dashboard`, { params })
        .pipe(
          timeout(15000), // 15 secondes pour le dashboard complet
          retry(1)
        );
    }, 1 * 60 * 1000).pipe( // Cache de 1 minute pour le dashboard
      tap(data => {
        this.dashboardSubject.next(data);
        this.setLoading(false);
      }),
      catchError(error => {
        const errorMessage = this.getErrorMessage(error);
        this.setError(errorMessage);
        this.setLoading(false);
        return throwError(error);
      })
    );
  }

  private getErrorMessage(error: any): string {
    if (error.name === 'TimeoutError') {
      return 'Timeout: Le serveur met trop de temps à répondre';
    }
    if (error.status === 0) {
      return 'Erreur de connexion: Vérifiez que le serveur backend est démarré';
    }
    if (error.status === 404) {
      return 'Endpoint non trouvé: Vérifiez la configuration de l\'API';
    }
    if (error.status >= 500) {
      return 'Erreur serveur: Problème côté backend';
    }
    return error.error?.message || error.message || 'Erreur lors du chargement du dashboard';
  }

  // === RECOMMANDATIONS ===
  getEmployeeSkillRecommendations(employeeId: number): Observable<EmployeeSkillRecommendation> {
    const cacheKey = `recommendations_${employeeId}`;
    
    return this.getCachedOrFetch(cacheKey, () => {
      return this.http.get<EmployeeSkillRecommendation>(`${this.apiUrl}/employee/${employeeId}/recommendations`)
        .pipe(
          timeout(10000),
          retry(2)
        );
    }, 10 * 60 * 1000); // Cache plus long pour les recommandations
  }

  getAllEmployeesRecommendations(filters?: AnalyticsFilters): Observable<EmployeeSkillRecommendation[]> {
    let params = this.buildHttpParams(filters);
    return this.http.get<EmployeeSkillRecommendation[]>(`${this.apiUrl}/employees/recommendations`, { params })
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
      );
  }

  // === PRÉDICTIONS ===
  predictApplicationSuccess(employeeId: number, jobDescriptionId: number): Observable<ApplicationSuccessPrediction> {
    return this.http.post<ApplicationSuccessPrediction>(`${this.apiUrl}/predict-success`, {
      employee_id: employeeId,
      job_description_id: jobDescriptionId
    }).pipe(
      timeout(10000),
      retry(1),
      catchError(this.handleError)
    );
  }

  predictMultipleApplications(
    predictions: Array<{employee_id: number, job_description_id: number}>
  ): Observable<ApplicationSuccessPrediction[]> {
    return this.http.post<ApplicationSuccessPrediction[]>(`${this.apiUrl}/predict-success/batch`, {
      predictions
    }).pipe(
      timeout(15000),
      retry(1),
      catchError(this.handleError)
    );
  }

  // === RAPPORTS IA ===
  generateAIReport(request: AIReportRequest): Observable<Blob> {
    this.setLoading(true);
    
    let params = new HttpParams()
      .set('reportType', request.reportType)
      .set('includeRecommendations', request.includeRecommendations.toString());

    if (request.filters) {
      params = this.buildHttpParams(request.filters, params);
    }

    if (request.employeeId) {
      params = params.set('employeeId', request.employeeId.toString());
    }

    return this.http.get(`${this.apiUrl}/reports/ai-generated`, {
      params,
      responseType: 'blob'
    }).pipe(
      timeout(30000), // 30 secondes pour la génération IA
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setError('Erreur lors de la génération du rapport IA');
        this.setLoading(false);
        return throwError(error);
      })
    );
  }

  generatePersonalizedReport(employeeId: number): Observable<Blob> {
    this.setLoading(true);
    
    return this.http.get(`${this.apiUrl}/employee/${employeeId}/ai-report`, {
      responseType: 'blob'
    }).pipe(
      timeout(30000),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setError('Erreur lors de la génération du rapport personnalisé');
        this.setLoading(false);
        return throwError(error);
      })
    );
  }

  // === DONNÉES EN TEMPS RÉEL ===
  getRealtimeStats(): Observable<RealtimeStats> {
    return this.http.get<RealtimeStats>(`${this.apiUrl}/realtime`)
      .pipe(
        timeout(5000),
        catchError(this.handleError)
      );
  }

  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${this.apiUrl}/health`)
      .pipe(
        timeout(5000),
        catchError(this.handleError)
      );
  }

  // === CONFIGURATION ===
  getAlertThresholds(): Observable<AlertThresholds> {
    return this.http.get<AlertThresholds>(`${this.apiUrl}/config/thresholds`)
      .pipe(
        timeout(5000),
        catchError(this.handleError)
      );
  }

  updateAlertThresholds(thresholds: AlertThresholds): Observable<any> {
    return this.http.put(`${this.apiUrl}/config/thresholds`, thresholds)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  // === EXPORT ===
  exportAnalyticsReport(options: ExportOptions): Observable<Blob> {
    let params = new HttpParams()
      .set('format', options.format)
      .set('type', options.type);

    if (options.filters) {
      params = this.buildHttpParams(options.filters, params);
    }

    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    }).pipe(
      timeout(20000),
      catchError(this.handleError)
    );
  }

  // === GESTION DU CACHE ===
  private getCachedOrFetch<T>(
    key: string, 
    fetchFn: () => Observable<T>, 
    ttl: number = this.defaultTTL
  ): Observable<T> {
    const cached = this.cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      console.log(`Utilisation du cache pour: ${key}`);
      return new Observable(observer => {
        observer.next(cached.data);
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
    if (score >= 50) return 'Moyen';
    if (score >= 30) return 'Faible';
    return 'Critique';
  }
}