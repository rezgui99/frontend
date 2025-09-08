import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Application } from '../models/candidate.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecruiterApplicationsService {
  private apiUrl = `${environment.backendUrl}/recruiter/applications`;

  constructor(private http: HttpClient) { }

  // Obtenir les candidatures pour une offre spécifique
  getApplicationsForJobOffer(jobOfferId: number, status?: string, page: number = 1, limit: number = 20): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get(`${this.apiUrl}/job-offer/${jobOfferId}`, { params });
  }

  // Obtenir toutes les candidatures
  getAllApplications(filters?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(this.apiUrl, { params });
  }

  // Mettre à jour le statut d'une candidature
  updateApplicationStatus(id: number, status: string, recruiterNotes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, {
      status,
      recruiter_notes: recruiterNotes
    });
  }

  // Programmer un entretien
  scheduleInterview(id: number, interviewData: {
    confirmed_interview_date: string;
    interview_link?: string;
    recruiter_notes?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/schedule-interview`, interviewData);
  }

  // Obtenir les statistiques des candidatures
  getApplicationStatistics(jobOfferId?: number): Observable<any> {
    let params = new HttpParams();
    if (jobOfferId) {
      params = params.set('job_offer_id', jobOfferId.toString());
    }

    return this.http.get(`${this.apiUrl}/statistics`, { params });
  }

  // Mise à jour en lot
  bulkUpdateApplications(applicationIds: number[], status: string, recruiterNotes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/bulk-update`, {
      application_ids: applicationIds,
      status,
      recruiter_notes: recruiterNotes
    });
  }
}