// === INTERFACES POUR LES ALERTES GPEC ===
export interface GPECAlert {
  id: string;
  type: GPECAlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  impact: string;
  recommendations: string[];
  affectedEntities: AffectedEntity[];
  metrics: AlertMetrics;
  status: AlertStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  dueDate?: Date;
  category: AlertCategory;
  priority: AlertPriority;
  tags: string[];
}

export type GPECAlertType = 
  | 'critical_skills_shortage'
  | 'departure_risk'
  | 'department_gap'
  | 'training_needed'
  | 'succession_planning'
  | 'skill_obsolescence'
  | 'recruitment_urgency'
  | 'performance_decline';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
export type AlertCategory = 'skills' | 'retention' | 'performance' | 'compliance' | 'strategic';
export type AlertPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AffectedEntity {
  type: 'employee' | 'department' | 'skill' | 'job_description';
  id: number;
  name: string;
  impact_level: number; // 0-100
  details?: any;
}

export interface AlertMetrics {
  current_value: number;
  threshold_value: number;
  target_value?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence_level: number; // 0-100
  time_to_critical?: number; // jours
}

// === CONFIGURATION DES SEUILS ===
export interface GPECThresholds {
  skills: {
    critical_shortage_ratio: number; // Ex: 0.3 (30% de manque)
    obsolescence_months: number; // Ex: 24 mois sans utilisation
    demand_supply_ratio: number; // Ex: 3.0 (3x plus de demande que d'offre)
  };
  retention: {
    departure_risk_threshold: number; // Ex: 0.7 (70% de risque)
    tenure_risk_months: number; // Ex: 6 mois
    performance_decline_threshold: number; // Ex: 0.2 (20% de baisse)
  };
  departments: {
    skill_gap_threshold: number; // Ex: 0.4 (40% de gap)
    understaffing_ratio: number; // Ex: 0.8 (80% de l'effectif cible)
    training_backlog_threshold: number; // Ex: 10 personnes
  };
}

// === PRÉDICTIONS ET ANALYSES ===
export interface DepartureRiskPrediction {
  employee_id: number;
  employee_name: string;
  department: string;
  position: string;
  risk_score: number; // 0-100
  risk_factors: RiskFactor[];
  predicted_departure_date: Date;
  confidence_level: number;
  mitigation_strategies: string[];
}

export interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
  current_value: number;
  threshold_value: number;
}

export interface SkillGapAnalysis {
  skill_id: number;
  skill_name: string;
  department?: string;
  current_supply: number;
  required_demand: number;
  gap_percentage: number;
  criticality_score: number;
  affected_positions: string[];
  training_options: TrainingOption[];
  recruitment_timeline: number; // jours
}

export interface TrainingOption {
  type: 'internal' | 'external' | 'certification' | 'mentoring';
  name: string;
  duration: number; // heures
  cost: number;
  effectiveness_score: number;
  provider?: string;
}

// === PLANS D'ACTION ===
export interface ActionPlan {
  id: string;
  alert_id: string;
  title: string;
  description: string;
  actions: Action[];
  timeline: Timeline;
  budget_estimate: number;
  success_metrics: SuccessMetric[];
  assigned_to: number; // user_id
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface Action {
  id: string;
  title: string;
  description: string;
  type: 'training' | 'recruitment' | 'internal_mobility' | 'process_improvement';
  priority: ActionPriority;
  estimated_duration: number; // jours
  estimated_cost: number;
  dependencies: string[]; // IDs d'autres actions
  assigned_to?: number;
  due_date: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export type ActionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Timeline {
  start_date: Date;
  end_date: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  due_date: Date;
  status: 'pending' | 'completed' | 'overdue';
  dependencies: string[];
}

export interface SuccessMetric {
  name: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  measurement_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

// === DASHBOARD ET REPORTING ===
export interface GPECDashboard {
  overview: {
    total_alerts: number;
    critical_alerts: number;
    resolved_this_month: number;
    average_resolution_time: number; // jours
  };
  alerts_by_category: { [key in AlertCategory]: number };
  alerts_by_severity: { [key in AlertSeverity]: number };
  trending_risks: TrendingRisk[];
  upcoming_deadlines: UpcomingDeadline[];
  success_stories: SuccessStory[];
}

export interface TrendingRisk {
  type: GPECAlertType;
  trend: 'increasing' | 'decreasing';
  change_percentage: number;
  affected_count: number;
  description: string;
}

export interface UpcomingDeadline {
  alert_id: string;
  title: string;
  due_date: Date;
  days_remaining: number;
  priority: AlertPriority;
  assigned_to: string;
}

export interface SuccessStory {
  title: string;
  description: string;
  metrics_improved: string[];
  time_to_resolution: number;
  cost_saved: number;
  date_resolved: Date;
}

// === CONFIGURATION ET PARAMÈTRES ===
export interface GPECConfiguration {
  thresholds: GPECThresholds;
  alert_frequency: {
    critical: number; // minutes
    high: number;
    medium: number;
    low: number;
  };
  notification_settings: {
    email_enabled: boolean;
    sms_enabled: boolean;
    in_app_enabled: boolean;
    recipients_by_severity: { [key in AlertSeverity]: number[] }; // user_ids
  };
  auto_actions: {
    enabled: boolean;
    actions: AutoAction[];
  };
}

export interface AutoAction {
  trigger_condition: string;
  action_type: 'create_training_request' | 'notify_manager' | 'escalate_to_hr' | 'create_recruitment_request';
  parameters: any;
  enabled: boolean;
}

// === HISTORIQUE ET AUDIT ===
export interface AlertHistory {
  alert_id: string;
  action: 'created' | 'updated' | 'acknowledged' | 'resolved' | 'dismissed';
  performed_by: number; // user_id
  timestamp: Date;
  details: any;
  comment?: string;
}

export interface GPECReport {
  id: string;
  title: string;
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_alerts_generated: number;
    alerts_resolved: number;
    average_resolution_time: number;
    cost_savings_estimated: number;
    risks_prevented: number;
  };
  detailed_analysis: {
    by_category: CategoryAnalysis[];
    by_department: DepartmentAnalysis[];
    trending_patterns: TrendPattern[];
  };
  recommendations: GlobalRecommendation[];
  generated_at: Date;
  generated_by: number;
}

export interface CategoryAnalysis {
  category: AlertCategory;
  total_alerts: number;
  resolution_rate: number;
  average_severity: number;
  top_issues: string[];
  improvement_suggestions: string[];
}

export interface DepartmentAnalysis {
  department: string;
  risk_score: number;
  main_challenges: string[];
  success_rate: number;
  resource_needs: ResourceNeed[];
}

export interface ResourceNeed {
  type: 'training' | 'recruitment' | 'equipment' | 'process_improvement';
  description: string;
  urgency: AlertPriority;
  estimated_cost: number;
}

export interface TrendPattern {
  pattern_type: string;
  description: string;
  frequency: number;
  impact_level: AlertSeverity;
  prediction: string;
}

export interface GlobalRecommendation {
  title: string;
  description: string;
  category: AlertCategory;
  priority: AlertPriority;
  estimated_impact: string;
  implementation_timeline: number; // jours
  success_probability: number; // 0-100
}