import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  CandidateCV,
  Application,
  CandidateFavorite,
  JobApplicationRequest,
  JobOfferFilters,
  JobOffer
} from '../models/candidate.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  private apiUrl = environment.backendUrl;

  constructor(private http: HttpClient) { }

  // === GESTION DES CVS ===
  getCVs(): Observable<CandidateCV[]> {
    return this.http.get<CandidateCV[]>(`${this.apiUrl}/candidate/cvs`).pipe(
      catchError(this.handleError)
    );
  }

  uploadCV(cvData: FormData): Observable<CandidateCV> {
    return this.http.post<CandidateCV>(`${this.apiUrl}/candidate/cvs`, cvData).pipe(
      catchError(this.handleError)
    );
  }

  updateCV(id: number, cvData: FormData): Observable<CandidateCV> {
    return this.http.put<CandidateCV>(`${this.apiUrl}/candidate/cvs/${id}`, cvData).pipe(
      catchError(this.handleError)
    );
  }

  deleteCV(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/candidate/cvs/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  setPrimaryCV(id: number): Observable<{ message: string; cv: CandidateCV }> {
    return this.http.patch<{ message: string; cv: CandidateCV }>(`${this.apiUrl}/candidate/cvs/${id}/set-primary`, {}).pipe(
      catchError(this.handleError)
    );
  }

  downloadCV(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/candidate/cvs/${id}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // === CANDIDATURES ===
  applyToJobOffer(applicationData: any): Observable<{ message: string; application: Application }> {
    return this.http.post<{ message: string; application: Application }>(`${this.apiUrl}/candidate/applications/apply`, applicationData).pipe(
      catchError(this.handleError)
    );
  }

  getMyApplications(status?: string): Observable<Application[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Application[]>(`${this.apiUrl}/candidate/applications`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getApplicationById(id: number): Observable<Application> {
    return this.http.get<Application>(`${this.apiUrl}/candidate/applications/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // === FAVORIS ===
  getFavorites(): Observable<CandidateFavorite[]> {
    return this.http.get<CandidateFavorite[]>(`${this.apiUrl}/candidate/favorites`).pipe(
      catchError(this.handleError)
    );
  }

  addToFavorites(jobOfferId: number): Observable<{ message: string; favorite: CandidateFavorite }> {
    return this.http.post<{ message: string; favorite: CandidateFavorite }>(`${this.apiUrl}/candidate/favorites`, {
      job_offer_id: jobOfferId
    }).pipe(
      catchError(this.handleError)
    );
  }

  removeFromFavorites(jobOfferId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/candidate/favorites/${jobOfferId}`).pipe(
      catchError(this.handleError)
    );
  }

  isFavorite(jobOfferId: number): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(`${this.apiUrl}/candidate/favorites/${jobOfferId}/check`).pipe(
      catchError(this.handleError)
    );
  }

  // === OFFRES PUBLIQUES ===
  getPublicJobOffers(filters?: JobOfferFilters): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/public/job-offers`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getPublicJobOfferById(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/public/job-offers/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  getFilterOptions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/job-offers/filters`).pipe(
      catchError(this.handleError)
    );
  }

  getJobOfferStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/job-offers/stats`).pipe(
      catchError(this.handleError)
    );
  }

  // Retirer une candidature (à implémenter côté backend si nécessaire)
  withdrawApplication(applicationId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/candidate/applications/${applicationId}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError = (error: any): Observable<never> => {
    console.error('❌ CandidateService - Error:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    } else if (error.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
    } else if (error.status === 403) {
      errorMessage = 'Accès interdit.';
    } else if (error.status === 404) {
      errorMessage = 'Ressource non trouvée.';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur interne. Veuillez réessayer dans quelques instants.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}