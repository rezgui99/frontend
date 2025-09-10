export interface Interview {
  id?: number;
  application_id: number;
  interviewer_id: number;
  scheduled_date: string;
  duration_minutes: number;
  interview_type: InterviewType;
  location?: string;
  meeting_link?: string;
  status: InterviewStatus;
  notes?: string;
  score?: number;
  feedback?: string;
  decision: InterviewDecision;
  reminder_sent: boolean;
  createdAt?: string;
  updatedAt?: string;
  
  // Relations
  application?: {
    id: number;
    candidate?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
    jobOffer?: {
      id: number;
      title: string;
      company: string;
    };
  };
  interviewer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export type InterviewType = 'phone' | 'video' | 'in_person' | 'technical' | 'hr' | 'final';
export type InterviewStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
export type InterviewDecision = 'pending' | 'pass' | 'fail' | 'on_hold';

export interface CreateInterviewRequest {
  application_id: number;
  scheduled_date: string;
  duration_minutes?: number;
  interview_type?: InterviewType;
  location?: string;
  meeting_link?: string;
  notes?: string;
}

export interface UpdateInterviewRequest {
  scheduled_date?: string;
  duration_minutes?: number;
  interview_type?: InterviewType;
  location?: string;
  meeting_link?: string;
  status?: InterviewStatus;
  notes?: string;
  score?: number;
  feedback?: string;
  decision?: InterviewDecision;
}

export interface InterviewStatistics {
  totalInterviews: number;
  statusBreakdown: { [key in InterviewStatus]: number };
  typeBreakdown: { [key in InterviewType]: number };
  averageScore: number;
  upcomingInterviews: number;
}

export interface InterviewFilters {
  status?: InterviewStatus;
  interview_type?: InterviewType;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}