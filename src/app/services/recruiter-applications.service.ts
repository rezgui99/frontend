import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { 
  Application, 
  ApplicationsResponse, 
  ApplicationStatistics,
  AvailableApplication 
} from '../models/candidate.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecruiterApplicationsService {
  private apiUrl = `${environment.backendUrl}/recruiter/applications`;

  constructor(private http: HttpClient) { }

  // Test de connectivité
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`).pipe(
      tap(response => console.log('🧪 Connection test response:', response)),
      catchError(error => {
        console.error('❌ Connection test failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtenir les candidatures pour une offre spécifique
  getApplicationsForJobOffer(jobOfferId: number, status?: string, page: number = 1, limit: number = 20): Observable<ApplicationsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ApplicationsResponse>(`${this.apiUrl}/job-offer/${jobOfferId}`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir toutes les candidatures
  getAllApplications(filters?: any): Observable<ApplicationsResponse> {
    console.log('🔍 RecruiterApplicationsService - Getting all applications with filters:', filters);
    
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    console.log('🔍 RecruiterApplicationsService - Making request to:', this.apiUrl);
    console.log('🔍 RecruiterApplicationsService - With params:', params.toString());
    
    return this.http.get<ApplicationsResponse>(this.apiUrl, { params }).pipe(
      tap(response => console.log('📋 RecruiterApplicationsService - Response:', response)),
      catchError(this.handleError)
    );
  }

  // Mettre à jour le statut d'une candidature
  updateApplicationStatus(id: number, status: string, recruiterNotes?: string): Observable<{ message: string; application: Application }> {
    return this.http.put<{ message: string; application: Application }>(`${this.apiUrl}/${id}/status`, {
      status,
      recruiter_notes: recruiterNotes
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Programmer un entretien
  scheduleInterview(id: number, interviewData: {
    confirmed_interview_date: string;
    interview_type?: string;
    location?: string;
    interview_link?: string;
    recruiter_notes?: string;
  }): Observable<{ message: string; application: Application; interview: any }> {
    return this.http.put<{ message: string; application: Application; interview: any }>(`${this.apiUrl}/${id}/schedule-interview`, interviewData).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les statistiques des candidatures
  getApplicationStatistics(jobOfferId?: number): Observable<ApplicationStatistics> {
    let params = new HttpParams();
    if (jobOfferId) {
      params = params.set('job_offer_id', jobOfferId.toString());
    }

    return this.http.get<ApplicationStatistics>(`${this.apiUrl}/statistics`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // Mise à jour en lot
  bulkUpdateApplications(applicationIds: number[], status: string, recruiterNotes?: string): Observable<{ message: string; updated_count: number }> {
    return this.http.put<{ message: string; updated_count: number }>(`${this.apiUrl}/bulk-update`, {
      application_ids: applicationIds,
      status,
      recruiter_notes: recruiterNotes
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Télécharger le CV d'un candidat
  downloadCV(cvId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/cv/${cvId}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les détails complets d'une candidature
  getApplicationDetails(applicationId: number): Observable<Application> {
    return this.http.get<Application>(`${this.apiUrl}/${applicationId}/details`).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les candidatures disponibles pour programmer des entretiens
  getAvailableApplicationsForInterview(): Observable<AvailableApplication[]> {
    console.log('🔍 RecruiterApplicationsService - Getting available applications for interview');
    
    return this.http.get<{ applications: AvailableApplication[] } | AvailableApplication[]>(`${this.apiUrl}/available-for-interview`).pipe(
      tap(response => console.log('📋 Available applications for interview:', response)),
      map(response => {
        // Gérer la réponse qui peut être un objet avec applications ou un array direct
        if (response && typeof response === 'object' && 'applications' in response) {
          return (response as { applications: AvailableApplication[] }).applications;
        } else if (Array.isArray(response)) {
          return response as AvailableApplication[];
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  private handleError = (error: any): Observable<never> => {
    console.error('❌ RecruiterApplicationsService - Error:', error);
    console.error('❌ RecruiterApplicationsService - Error status:', error.status);
    console.error('❌ RecruiterApplicationsService - Error message:', error.message);
    console.error('❌ RecruiterApplicationsService - Error details:', error.error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
    } else if (error.status === 401) {
      errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
    } else if (error.status === 403) {
      errorMessage = 'Accès interdit. Permissions insuffisantes.';
    } else if (error.status === 404) {
      errorMessage = 'Ressource non trouvée.';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur interne. Veuillez réessayer dans quelques instants.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  };
}

export type { ApplicationStatistics, ApplicationsResponse };
