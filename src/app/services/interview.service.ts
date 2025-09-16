import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  Interview, 
  InterviewFilters, 
  InterviewStatistics, 
  CreateInterviewRequest, 
  UpdateInterviewRequest,
  InterviewsResponse
} from '../models/candidate.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private apiUrl = `${environment.backendUrl}/interviews`;

  constructor(private http: HttpClient) {}

  getInterviews(filters: InterviewFilters = {}): Observable<InterviewsResponse> {
    let params = new HttpParams();
    
    // Ajouter les filtres aux paramètres de requête
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof InterviewFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
 
    return this.http.get<InterviewsResponse>(`${this.apiUrl}`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getStatistics(): Observable<InterviewStatistics> {
    return this.http.get<InterviewStatistics>(`${this.apiUrl}/statistics`).pipe(
      catchError(this.handleError)
    );
  }

  getUpcomingInterviews(period: string = 'today'): Observable<Interview[]> {
    return this.http.get<Interview[]>(`${this.apiUrl}/upcoming?period=${period}`).pipe(
      catchError(this.handleError)
    );
  }

  getInterviewTypeLabels(): Observable<{ [key: string]: string }> {
    return this.http.get<{ [key: string]: string }>(`${this.apiUrl}/interview-types`).pipe(
      catchError(this.handleError)
    );
  }

  scheduleInterview(interviewData: CreateInterviewRequest): Observable<{ message: string; interview: Interview }> {
    return this.http.post<{ message: string; interview: Interview }>(`${this.apiUrl}`, interviewData).pipe(
      catchError(this.handleError)
    );
  }

  updateInterview(interviewId: number, updateData: UpdateInterviewRequest): Observable<{ message: string; interview: Interview }> {
    return this.http.put<{ message: string; interview: Interview }>(`${this.apiUrl}/${interviewId}`, updateData).pipe(
      catchError(this.handleError)
    );
  }

  cancelInterview(interviewId: number, reason: string): Observable<{ message: string; interview: Interview }> {
    return this.http.patch<{ message: string; interview: Interview }>(`${this.apiUrl}/${interviewId}/cancel`, { reason }).pipe(
      catchError(this.handleError)
    );
  }

  completeInterview(interviewId: number, data: { score: number; feedback: string; decision: string }): Observable<{ message: string; interview: Interview }> {
    return this.http.patch<{ message: string; interview: Interview }>(`${this.apiUrl}/${interviewId}/complete`, data).pipe(
      catchError(this.handleError)
    );
  }

  rescheduleInterview(interviewId: number, data: { new_scheduled_date: string; reason: string }): Observable<{ message: string; interview: Interview }> {
    return this.http.patch<{ message: string; interview: Interview }>(`${this.apiUrl}/${interviewId}/reschedule`, data).pipe(
      catchError(this.handleError)
    );
  }

  sendInterviewConfirmation(interviewId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${interviewId}/send-confirmation`, {}).pipe(
      catchError(this.handleError)
    );
  }

  downloadCVFromInterview(interviewId: number, cvId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${interviewId}/cv/${cvId}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError = (error: any): Observable<never> => {
    console.error('❌ InterviewService - Error:', error);
    
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
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur interne. Vérifiez les logs du backend.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  };
}