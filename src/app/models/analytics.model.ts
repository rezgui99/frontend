// === INTERFACES DE BASE ===
export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  department?: string;
  contract_type?: string;
  skill_type?: string;
  search?: string;
}

export interface MetricCard {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  color?: string;
  suffix?: string;
}

// === ANALYTICS OVERVIEW ===
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

// === DASHBOARD AVANCÉ ===
export interface AdvancedDashboard {
  metrics: DashboardMetrics;
  departmentAnalysis: DepartmentAnalysis;
  skillsAnalysis: SkillsAnalysis;
  contractAnalysis: ContractAnalysis;
  trends: TrendsAnalysis;
  recommendations: GlobalRecommendation[];
  metadata: ReportMetadata;
}

export interface DashboardMetrics {
  totalEmployees: number;
  totalJobDescriptions: number;
  totalJobOffers: number;
  publishedOffers: number;
  overallSuccessRate: number;
  avgTimeToHire: number;
  topPerformingDepartment: string;
  skillsGapIndex: number;
}

export interface DepartmentAnalysis {
  stats: DepartmentStatistics[];
  insights: string[];
  trends: DepartmentTrend[];
}

export interface SkillsAnalysis {
  demand: SkillDemand[];
  insights: string[];
  gaps: SkillGap[];
  predictions: SkillPrediction[];
}

export interface ContractAnalysis {
  breakdown: ContractTypeStatistics[];
  insights: string[];
  recommendations: ContractRecommendation[];
}

export interface TrendsAnalysis {
  historical: TrendData[];
  predictions: FutureTrend[];
  seasonality: SeasonalityData[];
}

// === STATISTIQUES PAR DÉPARTEMENT ===
export interface DepartmentStatistics {
  department: string;
  employee_count: number;
  avg_tenure: number;
  unique_skills: number;
  avg_skill_level: number;
  total_applications: number;
  successful_applications: number;
  success_rate: number;
  average_time_to_hire: number;
  skill_diversity_score: number;
  retention_rate: number;
  top_skills_requested?: string[];
}

export interface DepartmentTrend {
  department: string;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
  period: string;
}

// === ANALYSE DES COMPÉTENCES ===
export interface SkillDemand {
  skill_id: number;
  skill_name: string;
  skill_type?: string;
  demand_count: number;
  supply_count: number;
  demand_supply_ratio: number;
  avg_required_level: number;
  avg_current_level: number;
  skill_gap: number;
  market_value_score: number;
  growth_potential: number;
  scarcity_index: number;
  total_requirements: number;
  success_rate_with_skill?: number;
  average_level_required?: number;
}

export interface SkillGap {
  skill_name: string;
  gap_severity: 'low' | 'medium' | 'high' | 'critical';
  affected_positions: number;
  estimated_cost: number;
  recommended_action: string;
}

export interface SkillPrediction {
  skill_name: string;
  predicted_demand: number;
  confidence_level: number;
  time_horizon: string;
  factors: string[];
}

// === STATISTIQUES PAR TYPE DE CONTRAT ===
export interface ContractTypeStatistics {
  contract_type: string;
  total_applications: number;
  successful_applications: number;
  success_rate: number;
  average_salary_min: number;
  average_salary_max: number;
  average_time_to_hire: number;
  satisfaction_rate: number;
  retention_rate: number;
  most_requested_skills: string[];
}

export interface ContractRecommendation {
  contract_type: string;
  recommendation: string;
  impact_score: number;
  priority: 'high' | 'medium' | 'low';
}

// === RECOMMANDATIONS EMPLOYÉS ===
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
  priority_score: number;
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
  missing_skills: MissingSkill[];
  estimated_timeline: string;
  salary_range: SalaryRange;
}

export interface MissingSkill {
  skill_name: string;
  required_level: number;
  current_level: number;
  gap: number;
}

export interface SalaryRange {
  min: number;
  max: number;
}

// === PRÉDICTIONS DE SUCCÈS ===
export interface ApplicationSuccessPrediction {
  employee_id: number;
  job_description_id: number;
  success_probability: number;
  confidence_level: 'low' | 'medium' | 'high';
  key_factors: KeyFactor[];
  recommendations: string[];
  estimated_interview_score: number;
}

export interface KeyFactor {
  factor_name: string;
  impact_score: number;
  description: string;
  weight: number;
}

// === TENDANCES ET DONNÉES TEMPORELLES ===
export interface TrendData {
  period: string;
  metric: string;
  value: number;
  change: number;
  change_percentage: number;
}

export interface FutureTrend {
timeframe: any;
confidence: any;
  metric: string;
  predicted_value: number;
  confidence_interval: [number, number];
  time_horizon: string;
  factors: string[];
}

export interface SeasonalityData {
  metric: string;
  seasonal_pattern: number[];
  peak_period: string;
  trough_period: string;
}

// === RECOMMANDATIONS GLOBALES ===
export interface GlobalRecommendation {
  title: string;
  description: string;
  category: 'skills' | 'recruitment' | 'retention' | 'efficiency';
  priority: 'high' | 'medium' | 'low';
  impact_score: number;
  estimated_effort: string;
  expected_roi: number;
  action_items: string[];
}

// === MÉTADONNÉES ET CONFIGURATION ===
export interface ReportMetadata {
  lastUpdated: Date;
  dateRange: { from?: string; to?: string };
  filters: AnalyticsFilters;
  reportId: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  timestamp: Date;
  services: {
    database: string;
    gemini: string;
    pdf: string;
  };
}

export interface RealtimeStats {
  activeUsers: number;
  lastUpdate: Date;
  systemLoad: number;
  dataFreshness: {
    employees: string;
    jobOffers: string;
    skills: string;
  };
}

export interface AlertThresholds {
  successRate: {
    excellent: number;
    good: number;
    warning: number;
    critical: number;
  };
  skillsGap: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  retention: {
    excellent: number;
    good: number;
    warning: number;
    critical: number;
  };
}

// === RAPPORTS IA ===
export interface AIReportRequest {
  reportType: 'full' | 'summary' | 'departmental' | 'skills' | 'employee';
  includeRecommendations: boolean;
  filters?: AnalyticsFilters;
  employeeId?: number;
}

export interface AIReportResponse {
  reportId: string;
  content: string;
  metadata: {
    generatedAt: Date;
    wordCount: number;
    processingTime: number;
  };
  downloadUrl?: string;
}

// === CONFIGURATION GRAPHIQUES ===
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'scatter';
  data: ChartData;
  options?: any;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// === EXPORT ET UTILITAIRES ===
export interface ExportOptions {
  format: 'json' | 'csv' | 'excel' | 'pdf';
  type: 'overview' | 'dashboard' | 'departments' | 'skills';
  filters?: AnalyticsFilters;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'date' | 'percentage' | 'currency';
  format?: string;
}

// === ÉTAT DE L'APPLICATION ===
export interface AnalyticsState {
  loading: boolean;
  error: string | null;
  data: AdvancedDashboard | null;
  filters: AnalyticsFilters;
  selectedTab: string;
  selectedPeriod: string;
}

// === ACTIONS ET ÉVÉNEMENTS ===
export interface AnalyticsAction {
  type: string;
  payload?: any;
  timestamp: Date;
}

export interface UserInteraction {
  action: string;
  target: string;
  timestamp: Date;
  metadata?: any;
}