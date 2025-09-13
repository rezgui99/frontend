import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Interview {
  id?: number;
  application_id: number;
  interviewer_id: number;
  scheduled_date: string;
  duration_minutes: number;
  interview_type: string;
  status: string;
  meeting_link?: string;
  notes?: string;
  score?: number;
  feedback?: string;
  decision?: string;
  reminder_sent: boolean;
  application?: {
    candidate: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
    jobOffer: {
      title: string;
      company: string;
    };
  };
  interviewer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface InterviewFilters {
  status?: string;
  interview_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface InterviewStatistics {
  total_interviews: number;
  upcoming_interviews: number;
  status_breakdown: {
    scheduled: number;
    confirmed: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
  };
  type_breakdown: {
    phone: number;
    video: number;
    in_person: number;
    technical: number;
    hr: number;
    final: number;
  };
  interviewer_breakdown: Array<{
    interviewer_id: number;
    interviewer_name: string;
    count: number;
  }>;
  average_score: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private apiUrl = `${environment.backendUrl}/interviews`;

  constructor(private http: HttpClient) {}

  getInterviews(filters: InterviewFilters = {}): Observable<any> {
    let params = new HttpParams();
    
    // Ajouter les filtres aux paramètres de requête
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof InterviewFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
 
    return this.http.get(`${this.apiUrl}`, { params });
  }

  getStatistics(): Observable<InterviewStatistics> {
    return this.http.get<InterviewStatistics>(`${this.apiUrl}/statistics`);
  }

  getUpcomingInterviews(period: string = 'today'): Observable<Interview[]> {
    return this.http.get<Interview[]>(`${this.apiUrl}/upcoming?period=${period}`);
  }

  getInterviewTypeLabels(): Observable<any> {
    return this.http.get(`${this.apiUrl}/interview-types`);
  }

  scheduleInterview(interviewData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, interviewData);
  }

  updateInterview(interviewId: number, updateData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${interviewId}`, updateData);
  }

  cancelInterview(interviewId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${interviewId}/cancel`, { reason });
  }

  completeInterview(interviewId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${interviewId}/complete`, data);
  }

  rescheduleInterview(interviewId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${interviewId}/reschedule`, data);
  }

  sendInterviewConfirmation(interviewId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${interviewId}/send-confirmation`, {});
  }
}