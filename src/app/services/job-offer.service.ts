import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface JobOffer {
  id?: number;
  title: string;
  company: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  contract_type: string;
  work_mode: string;
  application_deadline: string;
  description: string;
  requirements: string[];
  benefits: string[];
  job_description_id: number;
  status: 'draft' | 'published' | 'closed';
  created_by: number;
  published_at?: string;
  views_count?: number;
  applications_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobOfferFilters {
  status?: string;
  contract_type?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferService {
  private apiUrl = `${environment.backendUrl}/job-offers`;

  constructor(private http: HttpClient) { }

  getJobOffers(filters?: JobOfferFilters): Observable<JobOffer[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        // Handle both array response and paginated response
        if (Array.isArray(response)) {
          return response;
        } else if (response.jobOffers) {
          return response.jobOffers;
        }
        return [];
      })
    );
  }

  getJobOfferById(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/${id}`);
  }

  createJobOffer(jobOffer: Partial<JobOffer>): Observable<JobOffer> {
    console.log('Sending job offer data to backend:', jobOffer);
    return this.http.post<JobOffer>(this.apiUrl, jobOffer);
  }

  updateJobOffer(id: number, jobOffer: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.put<JobOffer>(`${this.apiUrl}/${id}`, jobOffer);
  }

  deleteJobOffer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  publishJobOffer(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.apiUrl}/${id}/publish`, {});
  }

  closeJobOffer(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.apiUrl}/${id}/close`, {});
  }

  getJobOfferStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics`);
  }

  duplicateJobOffer(id: number): Observable<JobOffer> {
    return this.http.post<JobOffer>(`${this.apiUrl}/${id}/duplicate`, {});
  }
}