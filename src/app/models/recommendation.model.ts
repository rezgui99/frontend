// Modèles pour les employés et postes
export interface EmployeeForRecommendation {
  id: number;
  name: string;
  position: string;
  department: string;
  hire_date: string;
  email: string;
  phone?: string;
  location?: string;
  skills: EmployeeSkillForRecommendation[];
}

export interface EmployeeSkillForRecommendation {
  skill_id: number;
  skill_name: string;
  skill_type?: string;
  current_level: number;
  level_name?: string;
  acquired_date?: string;
  certification?: string;
}

export interface JobForRecommendation {
  id: number;
  title: string;
  department: string;
  family?: string;
  experience_level?: string;
  required_skills: RequiredSkillForRecommendation[];
}

export interface RequiredSkillForRecommendation {
  skill_id: number;
  skill_name: string;
  skill_type?: string;
  required_level: number;
  level_name?: string;
  is_mandatory: boolean;
  weight: number;
}

// Modèles de recommandations de formation
export interface TrainingRecommendation {
  skill_id: number;
  skill_name: string;
  skill_type?: string;
  current_level: number;
  target_level: number;
  gap: number;
  priority: 'Critique' | 'Élevée' | 'Moyenne' | 'Faible';
  priority_score: number;
  training_type: string;
  estimated_duration_hours: number;
  estimated_cost?: number;
  difficulty: string;
  justification: string;
  expected_benefits: string[];
  prerequisites: string[];
  suggested_resources: SuggestedResource[];
  success_probability: number;
  roi_estimate?: number;
  
  // Nouveaux champs pour la cohérence et l'explicabilité
  calculation_method?: 'hybrid_ml_heuristic' | 'heuristic_fallback' | 'heuristic';
  formula_applied?: {
    probability: string;
    roi: string;
    duration: string;
  };
  ml_probability?: number;
  heuristic_adjustments?: number;
  employee_experience_years?: number;
  employee_performance_score?: number;
  has_certifications?: boolean;
  estimated_current_salary?: number;
}

export interface SuggestedResource {
  type: string;
  name: string;
  url: string;
}

// Modèles de recommandations de poste
export interface JobRecommendation {
  job_id: number;
  job_title: string;
  department: string;
  compatibility_score: number;
  matching_skills: SkillMatch[];
  missing_skills: SkillMatch[];
  exceeding_skills: SkillMatch[];
  skill_match_score: number;
  experience_match_score: number;
  certification_match_score?: number;
  overall_fit_score: number;
  readiness_level: string;
  recommended_actions: string[];
  estimated_transition_time?: string;
  growth_potential: number;
  salary_potential?: SalaryPotential;
  recommendation_reason: string;
  confidence_level: number;
  
  // Nouveaux champs pour la cohérence et l'explicabilité
  calculation_method?: 'weighted_compatibility' | 'heuristic_fallback' | 'heuristic';
  formula_applied?: {
    overall: string;
    breakdown?: {
      skills_contribution: number;
      experience_contribution: number;
      certification_contribution: number;
      skills_weight: number;
      experience_weight: number;
      certification_weight: number;
    };
  };
  employee_experience_years?: number;
  employee_certifications?: number;
  required_certifications?: number;
}

export interface SkillMatch {
  skill_id: number;
  skill_name: string;
  required_level: number;
  current_level: number;
  gap: number;
  weight: number;
}

export interface SalaryPotential {
  min: number;
  max: number;
  median: number;
}

// Requêtes
export interface TrainingRecommendationRequest {
  employee: EmployeeForRecommendation;
  target_job: JobForRecommendation;
  max_recommendations?: number;
  priority_threshold?: number;
}

export interface JobRecommendationRequest {
  employee: EmployeeForRecommendation;
  available_jobs: JobForRecommendation[];
  max_recommendations?: number;
  min_compatibility_score?: number;
}

// Réponses avec métadonnées
export interface TrainingRecommendationResponse {
  employee: {
    id: number;
    name: string;
    position: string;
  };
  target_job: {
    id: number;
    title: string;
    department: string;
  };
  recommendations: TrainingRecommendation[];
  total: number;
  calculation_method?: string;
  generated_at?: string;
  api_status?: 'ml_available' | 'fallback_used';
}

export interface JobRecommendationResponse {
  employee: {
    id: number;
    name: string;
    position: string;
  };
  recommendations: JobRecommendation[];
  total: number;
  calculation_method?: string;
  generated_at?: string;
  api_status?: 'ml_available' | 'fallback_used';
}