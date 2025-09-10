// === INTERFACES CANDIDAT ===
export interface Candidate {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  profile_picture?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CandidateRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  password: string;
  confirmPassword: string;
}

export interface CandidateLoginRequest {
  email: string;
  password: string;
}

export interface CandidateAuthResponse {
  message: string;
  candidate: Candidate;
  token: string;
}

// === INTERFACES CVS ===
export interface CandidateCV {
  id?: number;
  candidate_id: number;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

// === INTERFACES CANDIDATURES ===
export interface Application {
  id?: number;
  candidate_id: number;
  job_offer_id: number;
  cv_id?: number;
  cover_letter?: string;
  status: ApplicationStatus;
  proposed_interview_slots?: string[];
  confirmed_interview_date?: string;
  interview_link?: string;
  recruiter_notes?: string;
  applied_at: string;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  candidate?: Candidate;
  jobOffer?: JobOffer;
  JobOffer?: JobOffer; // Alternative naming from backend
  cv?: CandidateCV;
  CandidateCV?: CandidateCV; // Alternative naming from backend
}

export type ApplicationStatus = 
  | 'applied' 
  | 'under_review' 
  | 'interview_scheduled' 
  | 'interview_completed' 
  | 'accepted' 
  | 'rejected';

export interface JobApplicationRequest {
  job_offer_id: number;
  cv_id?: number;
  cover_letter?: string;
  proposed_interview_slots?: string[];
}

// === INTERFACES FAVORIS ===
export interface CandidateFavorite {
  id?: number;
  candidate_id: number;
  job_offer_id: number;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  candidate?: Candidate;
  jobOffer?: JobOffer;
}

// === INTERFACES OFFRES PUBLIQUES ===
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
  requirements?: string[];
  benefits?: string[];
  job_description_id: number;
  status: 'draft' | 'published' | 'closed';
  created_by: number;
  published_at?: string;
  views_count?: number;
  applications_count?: number;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  jobDescription?: {
    id: number;
    emploi: string;
    filiere_activite: string;
    famille: string;
    requiredSkills?: RequiredSkill[];
  };
  creator?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  required_skills?: RequiredSkill[];
}

export interface RequiredSkill {
  skill_id: number;
  required_skill_level_id: number;
  Skill?: {
    id: number;
    name: string;
  };
  SkillLevel?: {
    id: number;
    level_name: string;
    value: number;
  };
  name?: string; // Alternative naming
  level_name?: string; // Alternative naming
}

export interface JobOfferFilters {
  search?: string;
  location?: string;
  contract_type?: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  department?: string;
  experience_level?: string;
  skills?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

export interface PublicJobOffersResponse {
  jobOffers: JobOffer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: JobOfferFilters;
}

export interface FilterOptions {
  contractTypes: string[];
  workModes: string[];
  departments: string[];
  experienceLevels: string[];
  locations: string[];
  topSkills: { name: string; demand_count: number }[];
  salaryRange: {
    min: number;
    max: number;
  };
}

export interface JobOfferStats {
  totalOffers: number;
  totalViews: number;
  totalApplications: number;
  activeOffers: number;
  recentOffers: number;
}