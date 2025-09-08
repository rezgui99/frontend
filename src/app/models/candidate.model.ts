// Interfaces pour les types
export interface Skill {
  id?: number;
  name: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface RequiredSkill {
  id?: number;
  job_offer_id?: number;
  skill_id?: number;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  Skill?: Skill;
  name?: string; // Pour compatibilité
}

export interface JobOffer {
  id?: number;
  title: string;
  company: string;
  location: string;
  department?: string;
  contract_type: string;
  work_mode: string;
  description: string | {
    requiredSkills?: RequiredSkill[];
    [key: string]: any;
  };
  requirements?: string;
  benefits?: string;
  salary_min?: number;
  salary_max?: number;
  application_deadline: string;
  required_skills?: RequiredSkill[] | string[] | any[];
  views_count?: number;
  applications_count?: number;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  recruiter_id?: number;
}

export interface JobOfferFilters {
  search?: string;
  location?: string;
  department?: string;
  contract_type?: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  skills?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface FilterOptions {
  contractTypes: string[];
  workModes: string[];
  departments: string[];
  locations: string[];
  experienceLevels: string[];
}

export interface Favorite {
  id?: number;
  candidate_id: number;
  job_offer_id: number;
  created_at?: string;
  JobOffer?: JobOffer;
}

// Alias pour compatibilité
export interface CandidateFavorite extends Favorite {}

export interface CandidateCV {
  id?: number;
  candidate_id?: number;
  title: string;
  file_name: string;
  file_path?: string;
  file_size: number;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Application {
  id?: number;
  candidate_id?: number;
  job_offer_id: number;
  cv_id: number;
  cover_letter: string;
  status: 'applied' | 'under_review' | 'interview_scheduled' | 'interview_completed' | 'accepted' | 'rejected';
  proposed_interview_slots?: string[];
  confirmed_interview_date?: string;
  interview_link?: string;
  recruiter_notes?: string;
  candidate_notes?: string;
  applied_at?: string;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  JobOffer?: JobOffer;
  jobOffer?: JobOffer; // Pour compatibilité
  CandidateCV?: CandidateCV;
  cv?: CandidateCV; // Pour compatibilité
  Candidate?: {
    id: number;
    first_name: string;
    last_name: string;
    firstName: string; // Pour compatibilité
    lastName: string; // Pour compatibilité
    email: string;
    phone?: string;
    location?: string;
  };
  candidate?: {
    id: number;
    first_name: string;
    last_name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
  };
}

export interface ApplicationData {
  job_offer_id: number;
  cv_id: number;
  cover_letter: string;
  proposed_interview_slots?: string[];
}

// Alias pour compatibilité
export interface JobApplicationRequest extends ApplicationData {}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobOffersResponse {
  jobOffers: JobOffer[];
  pagination: Pagination;
}

// Alias pour compatibilité
export interface PublicJobOffersResponse extends JobOffersResponse {}

export interface ApplicationsResponse {
  applications: Application[];
  pagination: Pagination;
}

// Types pour les profils candidats
export interface CandidateProfile {
  id?: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  firstName?: string; // Pour compatibilité
  lastName?: string; // Pour compatibilité
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  date_of_birth?: string;
  summary?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Alias pour compatibilité
export interface Candidate extends CandidateProfile {}

export interface Experience {
  id?: number;
  candidate_id?: number;
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Education {
  id?: number;
  candidate_id?: number;
  institution: string;
  degree: string;
  field_of_study?: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CandidateSkill {
  id?: number;
  candidate_id?: number;
  skill_id?: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_of_experience?: number;
  created_at?: string;
  Skill?: Skill;
}

// Types pour l'authentification
export interface CandidateRegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
}

export interface CandidateLoginRequest {
  email: string;
  password: string;
}

export interface CandidateAuthResponse {
  message: string;
  token: string;
  candidate: Candidate;
}

// Types pour les statistiques
export interface CandidateStats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  favoriteJobs: number;
}

export interface ApplicationStats {
  totalApplications: number;
  statusBreakdown: {
    applied: number;
    under_review: number;
    interview_scheduled: number;
    interview_completed: number;
    accepted: number;
    rejected: number;
  };
}