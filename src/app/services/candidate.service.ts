import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<CandidateCV[]>(`${this.apiUrl}/candidate/cvs`);
  }

  uploadCV(cvData: FormData): Observable<CandidateCV> {
    return this.http.post<CandidateCV>(`${this.apiUrl}/candidate/cvs`, cvData);
  }

  updateCV(id: number, cvData: FormData): Observable<CandidateCV> {
    return this.http.put<CandidateCV>(`${this.apiUrl}/candidate/cvs/${id}`, cvData);
  }

  deleteCV(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/candidate/cvs/${id}`);
  }

  setPrimaryCV(id: number): Observable<{ message: string; cv: CandidateCV }> {
    return this.http.patch<{ message: string; cv: CandidateCV }>(`${this.apiUrl}/candidate/cvs/${id}/set-primary`, {});
  }

  downloadCV(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/candidate/cvs/${id}/download`, {
      responseType: 'blob'
    });
  }

  // === CANDIDATURES ===
  applyToJobOffer(applicationData: any): Observable<{ message: string; application: Application }> {
    return this.http.post<{ message: string; application: Application }>(`${this.apiUrl}/candidate/applications/apply`, applicationData);
  }

  getMyApplications(status?: string): Observable<Application[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Application[]>(`${this.apiUrl}/candidate/applications`, { params });
  }

  getApplicationById(id: number): Observable<Application> {
    return this.http.get<Application>(`${this.apiUrl}/candidate/applications/${id}`);
  }

  // === FAVORIS ===
  getFavorites(): Observable<CandidateFavorite[]> {
    return this.http.get<CandidateFavorite[]>(`${this.apiUrl}/candidate/favorites`);
  }

  addToFavorites(jobOfferId: number): Observable<{ message: string; favorite: CandidateFavorite }> {
    return this.http.post<{ message: string; favorite: CandidateFavorite }>(`${this.apiUrl}/candidate/favorites`, {
      job_offer_id: jobOfferId
    });
  }

  removeFromFavorites(jobOfferId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/candidate/favorites/${jobOfferId}`);
  }

  isFavorite(jobOfferId: number): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(`${this.apiUrl}/candidate/favorites/${jobOfferId}/check`);
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

    return this.http.get<any>(`${this.apiUrl}/public/job-offers`, { params });
  }

  getPublicJobOfferById(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/public/job-offers/${id}`);
  }

  getFilterOptions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/job-offers/filters`);
  }

  getJobOfferStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/job-offers/stats`);
  }

  // Retirer une candidature (à implémenter côté backend si nécessaire)
  withdrawApplication(applicationId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/candidate/applications/${applicationId}`);
  }
}