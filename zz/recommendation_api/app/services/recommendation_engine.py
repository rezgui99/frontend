import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, accuracy_score
import joblib
import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
import asyncio

from app.models.employee import Employee, EmployeeSkill
from app.models.job import JobDescription, RequiredSkill
from app.models.recommendations import (
    TrainingRecommendation, JobRecommendation, Priority, TrainingType,
    SkillGapAnalysis, RecommendationMetrics
)
from app.core.config import settings

logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self):
        self.training_model = None
        self.job_matching_model = None
        self.skill_similarity_matrix = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_initialized = False
        
        # Données de formation simulées
        self.training_catalog = self._load_training_catalog()
        
    async def initialize_models(self):
        """Initialiser et entraîner les modèles ML"""
        try:
            logger.info("🤖 Initializing ML models...")
            
            # Générer des données d'entraînement simulées
            training_data = self._generate_training_data()
            
            # Entraîner le modèle de recommandation de formation
            await self._train_training_recommendation_model(training_data)
            
            # Entraîner le modèle de matching de poste
            await self._train_job_matching_model(training_data)
            
            # Calculer la matrice de similarité des compétences
            self._calculate_skill_similarity_matrix(training_data)
            
            self.is_initialized = True
            logger.info("✅ ML models initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Error initializing models: {e}")
            raise

    async def generate_training_recommendations(
        self, 
        employee: Employee, 
        target_job: JobDescription,
        max_recommendations: int = 5,
        priority_threshold: float = 0.6
    ) -> List[TrainingRecommendation]:
        """Générer des recommandations de formation"""
        
        if not self.is_initialized:
            await self.initialize_models()
        
        recommendations = []
        
        # Analyser les écarts de compétences
        skill_gaps = self._analyze_skill_gaps(employee, target_job)
        
        for gap in skill_gaps:
            if gap['priority_score'] >= priority_threshold:
                # Prédire l'efficacité de la formation
                training_effectiveness = self._predict_training_effectiveness(
                    employee, gap['skill_id'], gap['target_level']
                )
                
                # Sélectionner le type de formation optimal
                optimal_training = self._select_optimal_training(
                    gap['skill_id'], gap['gap_size'], employee
                )
                
                recommendation = TrainingRecommendation(
                    skill_id=gap['skill_id'],
                    skill_name=gap['skill_name'],
                    skill_type=gap.get('skill_type'),
                    current_level=gap['current_level'],
                    target_level=gap['target_level'],
                    gap=gap['gap_size'],
                    priority=self._determine_priority(gap['priority_score']),
                    priority_score=gap['priority_score'],
                    training_type=optimal_training['type'],
                    estimated_duration_hours=optimal_training['duration'],
                    estimated_cost=optimal_training.get('cost'),
                    difficulty=optimal_training['difficulty'],
                    justification=gap['justification'],
                    expected_benefits=optimal_training['benefits'],
                    prerequisites=optimal_training.get('prerequisites', []),
                    suggested_resources=optimal_training.get('resources', []),
                    success_probability=training_effectiveness,
                    roi_estimate=self._calculate_training_roi(gap, optimal_training)
                )
                
                recommendations.append(recommendation)
        
        # Trier par priorité et limiter le nombre
        recommendations.sort(key=lambda x: x.priority_score, reverse=True)
        return recommendations[:max_recommendations]

    async def generate_job_recommendations(
        self,
        employee: Employee,
        available_jobs: List[JobDescription],
        max_recommendations: int = 10,
        min_compatibility_score: float = 0.5
    ) -> List[JobRecommendation]:
        """Générer des recommandations de poste"""
        
        if not self.is_initialized:
            await self.initialize_models()
        
        recommendations = []
        
        for job in available_jobs:
            # Calculer le score de compatibilité
            compatibility_analysis = self._calculate_job_compatibility(employee, job)
            
            if compatibility_analysis['overall_score'] >= min_compatibility_score:
                # Analyser la préparation nécessaire
                readiness_analysis = self._analyze_job_readiness(employee, job)
                
                recommendation = JobRecommendation(
                    job_id=job.id,
                    job_title=job.title,
                    department=job.department,
                    compatibility_score=compatibility_analysis['overall_score'],
                    matching_skills=compatibility_analysis['matching_skills'],
                    missing_skills=compatibility_analysis['missing_skills'],
                    exceeding_skills=compatibility_analysis['exceeding_skills'],
                    skill_match_score=compatibility_analysis['skill_score'],
                    experience_match_score=compatibility_analysis['experience_score'],
                    overall_fit_score=compatibility_analysis['overall_score'],
                    readiness_level=readiness_analysis['readiness_level'],
                    recommended_actions=readiness_analysis['actions'],
                    estimated_transition_time=readiness_analysis['transition_time'],
                    growth_potential=self._calculate_growth_potential(employee, job),
                    salary_potential=self._estimate_salary_potential(employee, job),
                    recommendation_reason=self._generate_recommendation_reason(compatibility_analysis),
                    confidence_level=compatibility_analysis['confidence']
                )
                
                recommendations.append(recommendation)
        
        # Trier par score de compatibilité
        recommendations.sort(key=lambda x: x.compatibility_score, reverse=True)
        return recommendations[:max_recommendations]

    def _analyze_skill_gaps(self, employee: Employee, target_job: JobDescription) -> List[Dict[str, Any]]:
        """Analyser les écarts de compétences"""
        gaps = []
        
        # Créer un mapping des compétences de l'employé
        employee_skills_map = {skill.skill_id: skill for skill in employee.skills}
        
        for required_skill in target_job.required_skills:
            current_skill = employee_skills_map.get(required_skill.skill_id)
            current_level = current_skill.current_level if current_skill else 0
            
            gap_size = max(0, required_skill.required_level - current_level)
            
            if gap_size > 0:
                # Calculer la priorité basée sur plusieurs facteurs
                priority_score = self._calculate_training_priority(
                    gap_size, 
                    required_skill.weight,
                    required_skill.is_mandatory,
                    current_level
                )
                
                gaps.append({
                    'skill_id': required_skill.skill_id,
                    'skill_name': required_skill.skill_name,
                    'skill_type': required_skill.skill_type,
                    'current_level': current_level,
                    'target_level': required_skill.required_level,
                    'gap_size': gap_size,
                    'priority_score': priority_score,
                    'is_mandatory': required_skill.is_mandatory,
                    'weight': required_skill.weight,
                    'justification': self._generate_gap_justification(
                        required_skill.skill_name, current_level, required_skill.required_level, gap_size
                    )
                })
        
        return gaps

    def _calculate_job_compatibility(self, employee: Employee, job: JobDescription) -> Dict[str, Any]:
        """Calculer la compatibilité entre un employé et un poste"""
        
        employee_skills_map = {skill.skill_id: skill for skill in employee.skills}
        
        matching_skills = []
        missing_skills = []
        exceeding_skills = []
        
        total_weight = 0
        weighted_score = 0
        
        for required_skill in job.required_skills:
            employee_skill = employee_skills_map.get(required_skill.skill_id)
            current_level = employee_skill.current_level if employee_skill else 0
            
            skill_analysis = {
                'skill_id': required_skill.skill_id,
                'skill_name': required_skill.skill_name,
                'required_level': required_skill.required_level,
                'current_level': current_level,
                'gap': required_skill.required_level - current_level,
                'weight': required_skill.weight
            }
            
            if current_level >= required_skill.required_level:
                if current_level > required_skill.required_level:
                    exceeding_skills.append(skill_analysis)
                else:
                    matching_skills.append(skill_analysis)
                # Score complet pour cette compétence
                skill_score = 1.0
            elif current_level > 0:
                matching_skills.append(skill_analysis)
                # Score partiel basé sur le niveau actuel
                skill_score = min(1.0, current_level / required_skill.required_level)
            else:
                missing_skills.append(skill_analysis)
                skill_score = 0.0
            
            weighted_score += skill_score * required_skill.weight
            total_weight += required_skill.weight
        
        # Score de compétences
        skill_score = weighted_score / total_weight if total_weight > 0 else 0
        
        # Score d'expérience
        experience_score = self._calculate_experience_match(employee, job)
        
        # Score global
        overall_score = (
            skill_score * settings.SKILL_WEIGHT +
            experience_score * settings.EXPERIENCE_WEIGHT
        )
        
        # Niveau de confiance basé sur la quantité de données
        confidence = min(1.0, len(employee.skills) / max(1, len(job.required_skills)))
        
        return {
            'overall_score': round(overall_score, 3),
            'skill_score': round(skill_score, 3),
            'experience_score': round(experience_score, 3),
            'matching_skills': matching_skills,
            'missing_skills': missing_skills,
            'exceeding_skills': exceeding_skills,
            'confidence': round(confidence, 3)
        }

    def _calculate_experience_match(self, employee: Employee, job: JobDescription) -> float:
        """Calculer la correspondance d'expérience"""
        employee_years = employee.get_total_experience_years()
        
        # Mapping des niveaux d'expérience requis
        experience_requirements = {
            'Junior': 1,
            'Confirmé': 3,
            'Senior': 5,
            'Expert': 8
        }
        
        required_years = experience_requirements.get(job.experience_level, 2)
        
        if employee_years >= required_years:
            return 1.0
        else:
            return max(0.0, employee_years / required_years)

    def _predict_training_effectiveness(self, employee: Employee, skill_id: int, target_level: int) -> float:
        """Prédire l'efficacité d'une formation"""
        
        # Facteurs influençant l'efficacité
        base_effectiveness = 0.7
        
        # Bonus basé sur l'expérience d'apprentissage
        learning_bonus = min(0.2, employee.get_average_skill_level() / 5.0 * 0.2)
        
        # Bonus basé sur l'expérience totale
        experience_bonus = min(0.1, employee.get_total_experience_years() / 10.0 * 0.1)
        
        # Malus si l'écart est très important
        current_skill = employee.get_skill_by_id(skill_id)
        current_level = current_skill.current_level if current_skill else 0
        gap = target_level - current_level
        gap_penalty = max(0, (gap - 2) * 0.05)
        
        effectiveness = base_effectiveness + learning_bonus + experience_bonus - gap_penalty
        return max(0.1, min(1.0, effectiveness))

    def _select_optimal_training(self, skill_id: int, gap_size: int, employee: Employee) -> Dict[str, Any]:
        """Sélectionner le type de formation optimal"""
        
        # Logique de sélection basée sur l'écart et le profil de l'employé
        if gap_size == 1:
            training_type = TrainingType.ONLINE_COURSE
            duration = 20 + np.random.randint(0, 20)
            difficulty = "Facile"
        elif gap_size == 2:
            training_type = TrainingType.CLASSROOM
            duration = 40 + np.random.randint(0, 30)
            difficulty = "Moyen"
        else:
            training_type = TrainingType.CERTIFICATION
            duration = 80 + np.random.randint(0, 40)
            difficulty = "Difficile"
        
        # Récupérer les détails de la formation depuis le catalogue
        training_details = self.training_catalog.get(str(skill_id), {})
        
        return {
            'type': training_type,
            'duration': duration,
            'cost': training_details.get('cost', 500 + gap_size * 200),
            'difficulty': difficulty,
            'benefits': training_details.get('benefits', [
                f"Amélioration du niveau de compétence",
                f"Meilleure performance au poste",
                f"Opportunités de carrière élargies"
            ]),
            'prerequisites': training_details.get('prerequisites', []),
            'resources': training_details.get('resources', [])
        }

    def _analyze_job_readiness(self, employee: Employee, job: JobDescription) -> Dict[str, Any]:
        """Analyser la préparation nécessaire pour un poste"""
        
        compatibility = self._calculate_job_compatibility(employee, job)
        missing_skills_count = len(compatibility['missing_skills'])
        critical_gaps = len([skill for skill in compatibility['missing_skills'] 
                           if skill['gap'] >= 2])
        
        if compatibility['overall_score'] >= 0.8:
            readiness_level = "Prêt"
            actions = ["Postuler immédiatement", "Préparer l'entretien"]
            transition_time = "Immédiat"
        elif compatibility['overall_score'] >= 0.6:
            readiness_level = "Formation courte nécessaire"
            actions = [
                "Suivre 1-2 formations ciblées",
                "Acquérir de l'expérience pratique",
                "Postuler dans 3-6 mois"
            ]
            transition_time = "3-6 mois"
        else:
            readiness_level = "Formation longue nécessaire"
            actions = [
                "Plan de formation complet",
                "Acquérir certifications",
                "Gain d'expérience significatif",
                "Postuler dans 6-12 mois"
            ]
            transition_time = "6-12 mois"
        
        return {
            'readiness_level': readiness_level,
            'actions': actions,
            'transition_time': transition_time,
            'missing_skills_count': missing_skills_count,
            'critical_gaps': critical_gaps
        }

    def _calculate_growth_potential(self, employee: Employee, job: JobDescription) -> float:
        """Calculer le potentiel de croissance"""
        
        # Facteurs de croissance
        skill_diversity = len(set(skill.skill_type for skill in employee.skills if skill.skill_type))
        avg_skill_level = employee.get_average_skill_level()
        experience_years = employee.get_total_experience_years()
        
        # Score basé sur la diversité des compétences
        diversity_score = min(1.0, skill_diversity / 5.0)
        
        # Score basé sur le niveau moyen
        level_score = avg_skill_level / 5.0
        
        # Score basé sur l'expérience
        experience_score = min(1.0, experience_years / 10.0)
        
        # Potentiel du poste lui-même
        job_potential = job.growth_potential if job.growth_potential else 0.7
        
        growth_potential = (
            diversity_score * 0.3 +
            level_score * 0.3 +
            experience_score * 0.2 +
            job_potential * 0.2
        )
        
        return round(growth_potential, 3)

    def _estimate_salary_potential(self, employee: Employee, job: JobDescription) -> Dict[str, float]:
        """Estimer le potentiel salarial"""
        
        # Salaires de base par département (simulés)
        base_salaries = {
            'Développement': {'min': 35000, 'max': 80000},
            'Marketing': {'min': 30000, 'max': 70000},
            'RH': {'min': 28000, 'max': 65000},
            'Finance': {'min': 32000, 'max': 75000},
            'Commercial': {'min': 25000, 'max': 90000}
        }
        
        base_range = base_salaries.get(job.department, {'min': 30000, 'max': 60000})
        
        # Ajustements basés sur l'expérience et les compétences
        experience_multiplier = 1 + (employee.get_total_experience_years() * 0.05)
        skill_multiplier = 1 + (employee.get_average_skill_level() - 2.5) * 0.1
        
        estimated_min = base_range['min'] * experience_multiplier * skill_multiplier
        estimated_max = base_range['max'] * experience_multiplier * skill_multiplier
        
        return {
            'min': round(estimated_min),
            'max': round(estimated_max),
            'median': round((estimated_min + estimated_max) / 2)
        }

    def _generate_training_data(self) -> pd.DataFrame:
        """Générer des données d'entraînement simulées"""
        
        np.random.seed(42)
        n_samples = 1000
        
        # Générer des données d'employés simulés
        data = []
        
        skill_types = ['Technique', 'Managériale', 'Communication', 'Analytique']
        departments = ['Développement', 'Marketing', 'RH', 'Finance', 'Commercial']
        
        for i in range(n_samples):
            # Profil employé
            employee_data = {
                'employee_id': i + 1,
                'department': np.random.choice(departments),
                'experience_years': np.random.randint(0, 15),
                'avg_skill_level': np.random.uniform(1, 5),
                'num_skills': np.random.randint(3, 12),
                'has_certifications': np.random.choice([0, 1], p=[0.7, 0.3])
            }
            
            # Compétences spécifiques
            for skill_type in skill_types:
                employee_data[f'{skill_type.lower()}_level'] = np.random.uniform(1, 5)
            
            # Variables cibles
            employee_data['training_success_rate'] = self._simulate_training_success(employee_data)
            employee_data['job_performance'] = self._simulate_job_performance(employee_data)
            
            data.append(employee_data)
        
        return pd.DataFrame(data)

    def _simulate_training_success(self, employee_data: Dict) -> float:
        """Simuler le taux de succès de formation"""
        base_rate = 0.6
        
        # Bonus basé sur l'expérience
        experience_bonus = min(0.2, employee_data['experience_years'] * 0.02)
        
        # Bonus basé sur le niveau moyen
        skill_bonus = (employee_data['avg_skill_level'] - 2.5) * 0.1
        
        # Bonus certifications
        cert_bonus = employee_data['has_certifications'] * 0.1
        
        success_rate = base_rate + experience_bonus + skill_bonus + cert_bonus
        return max(0.1, min(1.0, success_rate + np.random.normal(0, 0.1)))

    def _simulate_job_performance(self, employee_data: Dict) -> float:
        """Simuler la performance au poste"""
        base_performance = 0.7
        
        # Facteurs de performance
        experience_factor = min(0.15, employee_data['experience_years'] * 0.015)
        skill_factor = (employee_data['avg_skill_level'] - 2.5) * 0.1
        diversity_factor = min(0.1, employee_data['num_skills'] * 0.01)
        
        performance = base_performance + experience_factor + skill_factor + diversity_factor
        return max(0.2, min(1.0, performance + np.random.normal(0, 0.1)))

    async def _train_training_recommendation_model(self, training_data: pd.DataFrame):
        """Entraîner le modèle de recommandation de formation"""
        
        logger.info("🎓 Training the training recommendation model...")
        
        # Préparer les features
        feature_columns = [
            'experience_years', 'avg_skill_level', 'num_skills', 'has_certifications',
            'technique_level', 'managériale_level', 'communication_level', 'analytique_level'
        ]
        
        X = training_data[feature_columns]
        y = training_data['training_success_rate']
        
        # Diviser les données
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Normaliser les données
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Entraîner le modèle
        self.training_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        self.training_model.fit(X_train_scaled, y_train)
        
        # Évaluer le modèle
        y_pred = self.training_model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        
        logger.info(f"✅ Training model trained - MSE: {mse:.4f}")

    async def _train_job_matching_model(self, training_data: pd.DataFrame):
        """Entraîner le modèle de matching de poste"""
        
        logger.info("💼 Training the job matching model...")
        
        # Préparer les features pour la classification
        feature_columns = [
            'experience_years', 'avg_skill_level', 'num_skills',
            'technique_level', 'managériale_level', 'communication_level', 'analytique_level'
        ]
        
        X = training_data[feature_columns]
        
        # Créer des labels de performance (binaire: bon/mauvais match)
        y = (training_data['job_performance'] > 0.7).astype(int)
        
        # Diviser les données
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Entraîner le modèle
        self.job_matching_model = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        
        self.job_matching_model.fit(X_train, y_train)
        
        # Évaluer le modèle
        y_pred = self.job_matching_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"✅ Job matching model trained - Accuracy: {accuracy:.4f}")

    def _calculate_skill_similarity_matrix(self, training_data: pd.DataFrame):
        """Calculer la matrice de similarité des compétences"""
        
        logger.info("🔗 Calculating skill similarity matrix...")
        
        # Simuler une matrice de similarité des compétences
        skill_types = ['technique', 'managériale', 'communication', 'analytique']
        n_skills = len(skill_types)
        
        # Créer une matrice de similarité basée sur les corrélations
        similarity_matrix = np.eye(n_skills)
        
        # Ajouter des similarités logiques
        similarity_matrix[0, 3] = 0.6  # Technique et Analytique
        similarity_matrix[3, 0] = 0.6
        similarity_matrix[1, 2] = 0.7  # Managériale et Communication
        similarity_matrix[2, 1] = 0.7
        
        self.skill_similarity_matrix = similarity_matrix
        logger.info("✅ Skill similarity matrix calculated")

    def _calculate_training_priority(self, gap_size: int, weight: float, is_mandatory: bool, current_level: int) -> float:
        """Calculer la priorité de formation"""
        
        # Score de base basé sur l'écart
        base_score = min(1.0, gap_size / 3.0)
        
        # Bonus pour les compétences obligatoires
        mandatory_bonus = 0.3 if is_mandatory else 0.0
        
        # Bonus basé sur le poids de la compétence
        weight_bonus = min(0.2, (weight - 1.0) * 0.2)
        
        # Malus si le niveau actuel est déjà élevé
        level_penalty = max(0, (current_level - 3) * 0.1)
        
        priority = base_score + mandatory_bonus + weight_bonus - level_penalty
        return max(0.0, min(1.0, priority))

    def _determine_priority(self, priority_score: float) -> Priority:
        """Déterminer le niveau de priorité"""
        if priority_score >= 0.8:
            return Priority.CRITICAL
        elif priority_score >= 0.6:
            return Priority.HIGH
        elif priority_score >= 0.4:
            return Priority.MEDIUM
        else:
            return Priority.LOW

    def _generate_gap_justification(self, skill_name: str, current: int, required: int, gap: int) -> str:
        """Générer une justification pour l'écart de compétence"""
        if current == 0:
            return f"Compétence {skill_name} non acquise. Niveau {required} requis pour le poste."
        else:
            return f"Compétence {skill_name} : niveau actuel {current}, niveau requis {required}. Écart de {gap} niveau(x) à combler."

    def _generate_recommendation_reason(self, compatibility_analysis: Dict) -> str:
        """Générer une raison pour la recommandation de poste"""
        score = compatibility_analysis['overall_score']
        matching_count = len(compatibility_analysis['matching_skills'])
        missing_count = len(compatibility_analysis['missing_skills'])
        
        if score >= 0.8:
            return f"Excellent match avec {matching_count} compétences correspondantes. Candidat idéal pour ce poste."
        elif score >= 0.6:
            return f"Bon match avec {matching_count} compétences correspondantes. {missing_count} compétence(s) à développer."
        else:
            return f"Match partiel. {missing_count} compétences importantes à acquérir avant de postuler."

    def _calculate_training_roi(self, gap: Dict, training: Dict) -> float:
        """Calculer le ROI estimé de la formation"""
        
        # ROI basé sur l'amélioration de performance attendue
        performance_improvement = gap['gap_size'] * 0.15  # 15% par niveau
        
        # Coût de la formation
        training_cost = training.get('cost', 1000)
        
        # Bénéfice estimé (amélioration salariale potentielle)
        salary_improvement = performance_improvement * 2000  # 2000€ par 15% d'amélioration
        
        # ROI sur 2 ans
        roi = (salary_improvement * 2 - training_cost) / training_cost
        return max(0.0, round(roi, 2))

    def _load_training_catalog(self) -> Dict[str, Dict]:
        """Charger le catalogue de formations"""
        
        # Catalogue simulé de formations
        return {
            "1": {  # JavaScript
                "cost": 800,
                "benefits": [
                    "Développement d'applications web modernes",
                    "Amélioration de la productivité",
                    "Accès à plus d'opportunités"
                ],
                "prerequisites": ["Bases de la programmation"],
                "resources": [
                    {"type": "Cours", "name": "JavaScript Avancé", "url": "https://example.com/js"},
                    {"type": "Certification", "name": "JS Developer Cert", "url": "https://example.com/cert"}
                ]
            },
            "2": {  # Communication
                "cost": 600,
                "benefits": [
                    "Amélioration des relations interpersonnelles",
                    "Leadership renforcé",
                    "Efficacité en équipe"
                ],
                "prerequisites": [],
                "resources": [
                    {"type": "Formation", "name": "Communication Efficace", "url": "https://example.com/comm"}
                ]
            }
        }

    async def retrain_models(self) -> Dict[str, Any]:
        """Réentraîner les modèles avec de nouvelles données"""
        
        logger.info("🔄 Retraining models...")
        
        # Générer de nouvelles données d'entraînement
        new_training_data = self._generate_training_data()
        
        # Réentraîner les modèles
        await self._train_training_recommendation_model(new_training_data)
        await self._train_job_matching_model(new_training_data)
        
        return {
            "training_samples": len(new_training_data),
            "retrained_at": datetime.now().isoformat(),
            "models_updated": ["training_recommendation", "job_matching"]
        }

    def get_model_status(self) -> Dict[str, Any]:
        """Obtenir le statut des modèles"""
        return {
            "initialized": self.is_initialized,
            "training_model_loaded": self.training_model is not None,
            "job_matching_model_loaded": self.job_matching_model is not None,
            "skill_similarity_matrix_loaded": self.skill_similarity_matrix is not None,
            "last_update": datetime.now().isoformat()
        }