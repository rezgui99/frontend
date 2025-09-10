import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Interview, 
  CreateInterviewRequest, 
  UpdateInterviewRequest,
  InterviewStatistics,
  InterviewFilters
} from '../models/interview.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private apiUrl = `${environment.backendUrl}/interviews`;

  constructor(private http: HttpClient) { }

  // Get all interviews with filters
  getInterviews(filters?: InterviewFilters): Observable<{
    interviews: Interview[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    console.log('🔍 InterviewService - Making request to:', `${this.apiUrl}`);
    console.log('🔍 InterviewService - With params:', params.toString());

    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  // Get upcoming interviews
  getUpcomingInterviews(period: 'today' | 'week' = 'today'): Observable<Interview[]> {
    const params = new HttpParams().set('period', period);
    console.log('🔍 InterviewService - Getting upcoming interviews:', period);
    return this.http.get<Interview[]>(`${this.apiUrl}/upcoming`, { params });
  }

  // Schedule new interview
  scheduleInterview(interviewData: CreateInterviewRequest): Observable<any> {
    console.log('🔍 InterviewService - Scheduling interview:', interviewData);
    return this.http.post(`${this.apiUrl}`, interviewData);
  }

  // Update interview
  updateInterview(id: number, updateData: UpdateInterviewRequest): Observable<any> {
    console.log('🔍 InterviewService - Updating interview:', id, updateData);
    return this.http.put(`${this.apiUrl}/${id}`, updateData);
  }

  // Complete interview with feedback
  completeInterview(id: number, completionData: {
    score?: number;
    feedback?: string;
    decision: 'pass' | 'fail' | 'on_hold';
    notes?: string;
  }): Observable<any> {
    console.log('🔍 InterviewService - Completing interview:', id, completionData);
    return this.http.patch(`${this.apiUrl}/${id}/complete`, completionData);
  }

  // Reschedule interview
  rescheduleInterview(id: number, rescheduleData: {
    new_scheduled_date: string;
    reason: string;
  }): Observable<any> {
    console.log('🔍 InterviewService - Rescheduling interview:', id, rescheduleData);
    return this.http.patch(`${this.apiUrl}/${id}/reschedule`, rescheduleData);
  }

  // Cancel interview
  cancelInterview(id: number, reason: string): Observable<any> {
    console.log('🔍 InterviewService - Cancelling interview:', id, reason);
    return this.http.patch(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  // Get interview statistics
  getStatistics(dateFrom?: string, dateTo?: string): Observable<InterviewStatistics> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('date_from', dateFrom);
    if (dateTo) params = params.set('date_to', dateTo);

    console.log('🔍 InterviewService - Getting statistics with params:', params.toString());
    return this.http.get<InterviewStatistics>(`${this.apiUrl}/statistics`, { params });
  }
}