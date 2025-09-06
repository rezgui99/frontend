import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  AnalyticsOverview,
  DepartmentStatistics,
  EmployeeSkillRecommendation,
  ApplicationSuccessPrediction,
  AnalyticsFilters,
  SkillDemand
} from '../models/analytics.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = `${environment.backendUrl}/analytics`;

  constructor(private http: HttpClient) { }

  // Statistiques générales
  getAnalyticsOverview(filters?: AnalyticsFilters): Observable<AnalyticsOverview> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value) params = params.set(key, value);
      });
    }
    return this.http.get<AnalyticsOverview>(`${this.apiUrl}/overview`, { params });
  }

  // Statistiques par département
  getDepartmentStatistics(filters?: AnalyticsFilters): Observable<DepartmentStatistics[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value) params = params.set(key, value);
      });
    }
    return this.http.get<DepartmentStatistics[]>(`${this.apiUrl}/departments`, { params });
  }



  // Compétences en demande
  getSkillsDemandAnalysis(filters?: AnalyticsFilters): Observable<SkillDemand[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value) params = params.set(key, value);
      });
    }
    return this.http.get<SkillDemand[]>(`${this.apiUrl}/skills-demand`, { params });
  }

  // Recommandations de compétences pour un employé
  getEmployeeSkillRecommendations(employeeId: number): Observable<EmployeeSkillRecommendation> {
    return this.http.get<EmployeeSkillRecommendation>(`${this.apiUrl}/employee/${employeeId}/recommendations`);
  }

  // Recommandations pour tous les employés
  getAllEmployeesRecommendations(filters?: AnalyticsFilters): Observable<EmployeeSkillRecommendation[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value) params = params.set(key, value);
      });
    }
    return this.http.get<EmployeeSkillRecommendation[]>(`${this.apiUrl}/employees/recommendations`, { params });
  }

  // Prédiction de succès pour une candidature
  predictApplicationSuccess(employeeId: number, jobDescriptionId: number): Observable<ApplicationSuccessPrediction> {
    return this.http.post<ApplicationSuccessPrediction>(`${this.apiUrl}/predict-success`, {
      employee_id: employeeId,
      job_description_id: jobDescriptionId
    });
  }

  // Prédictions en lot
  predictMultipleApplications(predictions: Array<{employee_id: number, job_description_id: number}>): Observable<ApplicationSuccessPrediction[]> {
    return this.http.post<ApplicationSuccessPrediction[]>(`${this.apiUrl}/predict-success/batch`, {
      predictions
    });
  }

  // Export des données analytics
  exportAnalyticsReport(format: 'pdf' | 'excel' | 'csv', filters?: AnalyticsFilters): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value) params = params.set(key, value);
      });
    }
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }

 
}