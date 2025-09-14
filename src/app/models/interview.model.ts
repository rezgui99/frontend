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
    cover_letter?: string;
    applied_at?: string;
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
    cv?: {
      id: number;
      title: string;
      file_name: string;
      file_size: number;
      file_path: string;
      created_at?: string;
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

// === INTERFACES STATISTIQUES ===
export interface InterviewStatistics {
  total_interviews: number;
  upcoming_interviews: number;
  status_breakdown: { [key in InterviewStatus]: number };
  type_breakdown: { [key in InterviewType]: number };
  interviewer_breakdown: Array<{
    interviewer_id: number;
    interviewer_name: string;
    count: number;
  }>;
  average_score: number | null;
}

export interface InterviewFilters {
  status?: InterviewStatus;
  interview_type?: InterviewType;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// === INTERFACES POUR LES RÉPONSES API ===
export interface InterviewsResponse {
  interviews: Interview[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AvailableApplication {
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
  status: string;
  applied_at: string;
}