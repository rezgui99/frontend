from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TrainingType(str, Enum):
    ONLINE_COURSE = "Formation en ligne"
    CLASSROOM = "Formation présentielle"
    CERTIFICATION = "Certification"
    MENTORING = "Mentorat"
    PRACTICAL_PROJECT = "Projet pratique"
    CONFERENCE = "Conférence/Séminaire"
    WORKSHOP = "Atelier"

class Priority(str, Enum):
    CRITICAL = "Critique"
    HIGH = "Élevée"
    MEDIUM = "Moyenne"
    LOW = "Faible"

class TrainingRecommendation(BaseModel):
    skill_id: int
    skill_name: str
    skill_type: Optional[str] = None
    current_level: int
    target_level: int
    gap: int
    priority: Priority
    priority_score: float = Field(..., ge=0.0, le=1.0)
    
    # Détails de la formation recommandée
    training_type: TrainingType
    estimated_duration_hours: int
    estimated_cost: Optional[float] = None
    difficulty: str  # "Facile", "Moyen", "Difficile"
    
    # Justification et bénéfices
    justification: str
    expected_benefits: List[str] = []
    prerequisites: List[str] = []
    
    # Ressources suggérées
    suggested_resources: List[Dict[str, str]] = []
    
    # Métriques de succès
    success_probability: float = Field(..., ge=0.0, le=1.0)
    roi_estimate: Optional[float] = None
    
    # Nouveaux champs pour la cohérence et l'explicabilité
    calculation_method: Optional[str] = "hybrid_ml_heuristic"
    formula_applied: Optional[Dict[str, Any]] = None
    ml_probability: Optional[float] = None
    heuristic_adjustments: Optional[float] = None
    
    class Config:
        use_enum_values = True

class JobRecommendation(BaseModel):
    job_id: int
    job_title: str
    department: str
    compatibility_score: float = Field(..., ge=0.0, le=1.0)
    
    # Analyse des compétences
    matching_skills: List[Dict[str, Any]] = []
    missing_skills: List[Dict[str, Any]] = []
    exceeding_skills: List[Dict[str, Any]] = []
    
    # Scores détaillés
    skill_match_score: float
    experience_match_score: float
    certification_match_score: Optional[float] = 0.5
    overall_fit_score: float
    
    # Recommandations d'action
    readiness_level: str  # "Prêt", "Formation courte nécessaire", "Formation longue nécessaire"
    recommended_actions: List[str] = []
    estimated_transition_time: Optional[str] = None
    
    # Potentiel de carrière
    growth_potential: float = Field(..., ge=0.0, le=1.0)
    salary_potential: Optional[Dict[str, float]] = None
    
    # Justification
    recommendation_reason: str
    confidence_level: float = Field(..., ge=0.0, le=1.0)
    
    # Nouveaux champs pour la cohérence et l'explicabilité
    calculation_method: Optional[str] = "weighted_compatibility"
    formula_applied: Optional[Dict[str, Any]] = None
    calculation_breakdown: Optional[Dict[str, Any]] = None

class SkillGapAnalysis(BaseModel):
    """Analyse détaillée des écarts de compétences"""
    employee_id: int
    job_id: int
    
    # Écarts par compétence
    skill_gaps: List[Dict[str, Any]] = []
    
    # Scores globaux
    overall_compatibility: float
    critical_gaps_count: int
    minor_gaps_count: int
    
    # Recommandations prioritaires
    priority_training_areas: List[str] = []
    quick_wins: List[str] = []
    long_term_goals: List[str] = []
    
    # Timeline de développement
    development_timeline: Dict[str, List[str]] = {}

class RecommendationMetrics(BaseModel):
    """Métriques de performance des recommandations"""
    total_recommendations_generated: int
    average_confidence_score: float
    model_accuracy: Optional[float] = None
    last_training_date: Optional[datetime] = None
    data_quality_score: Optional[float] = None