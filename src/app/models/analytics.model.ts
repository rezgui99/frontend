export interface DepartmentStatistics {
  total_employees: number;
  total_job_descriptions: number;
  department: string;
  agency?: string;
  total_applications: number;
  successful_applications: number;
  success_rate: number;
  average_time_to_hire: number;
  top_skills_requested: SkillDemand[];
}

export interface SkillDemand {
  skill_name: string;
  skill_id: number;
  demand_count: number;
  success_rate_with_skill: number;
  average_level_required: number;
}

export interface EmployeeSkillRecommendation {
  employee_id: number;
  employee_name: string;
  current_position: string;
  recommendations: SkillRecommendation[];
  career_opportunities: CareerOpportunity[];
  overall_development_score: number;
}

export interface SkillRecommendation {
  skill_id: number;
  skill_name: string;
  skill_type: string;
  current_level: number;
  recommended_level: number;
  priority_score: number; // 0-100
  justification: string;
  estimated_learning_time: string;
  available_positions_count: number;
  potential_salary_increase: number;
}

export interface CareerOpportunity {
  job_description_id: number;
  job_title: string;
  department: string;
  compatibility_score: number;
  missing_skills: SkillGap[];
  estimated_timeline: string;
  salary_range: { min: number; max: number };
}

export interface SkillGap {
  skill_name: string;
  required_level: number;
  current_level: number;
  gap: number;
}

export interface ApplicationSuccessPrediction {
  application_id?: number;
  employee_id: number;
  job_description_id: number;
  success_probability: number; // 0-100
  confidence_level: 'high' | 'medium' | 'low';
  key_factors: PredictionFactor[];
  recommendations: string[];
  estimated_interview_score: number;
}

export interface PredictionFactor {
  factor_name: string;
  impact_score: number; // -100 to +100
  description: string;
  weight: number; // 0-1
}

export interface AnalyticsOverview {
  total_employees: number;
  total_job_descriptions: number;
  total_applications: number;
  overall_success_rate: number;
  top_performing_departments: DepartmentStatistics[];
  skills_in_high_demand: SkillDemand[];
  contract_type_breakdown: ContractTypeStatistics[];
  recent_trends: TrendData[];
}

export interface ContractTypeStatistics {
  contract_type: string;
  total_applications: number;
  successful_applications: number;
  success_rate: number;
  average_salary_min: number;
  average_salary_max: number;
  most_requested_skills: string[];
}

export interface TrendData {
  period: string;
  metric: string;
  value: number;
  change_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  department?: string;
  agency?: string;
  contract_type?: string;
  skill_type?: string;
  position_level?: string;
}