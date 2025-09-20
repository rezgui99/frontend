import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from app.models.employee import Employee, EmployeeSkill
from app.models.job import JobDescription, RequiredSkill

logger = logging.getLogger(__name__)

class DataProcessor:
    """Service de traitement et validation des données"""
    
    def __init__(self):
        self.skill_encoders = {}
        self.department_encoder = {}
        
    def process_employee_data(self, employee: Employee) -> Employee:
        """Traiter et enrichir les données d'un employé"""
        
        # Calculer les métriques dérivées
        processed_employee = employee.copy(deep=True)
        
        # Calculer l'expérience totale si pas fournie
        if not processed_employee.years_total_experience:
            years_since_hire = (datetime.now() - employee.hire_date).days // 365
            processed_employee.years_total_experience = max(0, years_since_hire)
        
        # Calculer les scores de performance si pas fournis
        if not processed_employee.performance_score:
            processed_employee.performance_score = self._estimate_performance_score(employee)
        
        if not processed_employee.adaptability_score:
            processed_employee.adaptability_score = self._estimate_adaptability_score(employee)
        
        if not processed_employee.learning_speed:
            processed_employee.learning_speed = self._estimate_learning_speed(employee)
        
        # Enrichir les compétences avec des métadonnées
        processed_employee.skills = self._enrich_employee_skills(employee.skills)
        
        return processed_employee
    
    def process_job_data(self, job: JobDescription) -> JobDescription:
        """Traiter et enrichir les données d'un poste"""
        
        processed_job = job.copy(deep=True)
        
        # Calculer les métriques dérivées si pas fournies
        if not processed_job.complexity_score:
            processed_job.complexity_score = self._calculate_job_complexity(job)
        
        if not processed_job.growth_potential:
            processed_job.growth_potential = self._estimate_growth_potential(job)
        
        if not processed_job.market_demand:
            processed_job.market_demand = self._estimate_market_demand(job)
        
        # Enrichir les compétences requises
        processed_job.required_skills = self._enrich_required_skills(job.required_skills)
        
        return processed_job
    
    def validate_input_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Valider la structure des données d'entrée"""
        
        errors = []
        suggestions = []
        
        # Validation des données employé
        if 'employee' in data:
            employee_errors = self._validate_employee_data(data['employee'])
            errors.extend(employee_errors)
        
        # Validation des données de poste
        if 'target_job' in data or 'available_jobs' in data:
            job_data = data.get('target_job') or data.get('available_jobs', [])
            if isinstance(job_data, list):
                for i, job in enumerate(job_data):
                    job_errors = self._validate_job_data(job, f"available_jobs[{i}]")
                    errors.extend(job_errors)
            else:
                job_errors = self._validate_job_data(job_data, "target_job")
                errors.extend(job_errors)
        
        # Générer des suggestions d'amélioration
        if not errors:
            suggestions = self._generate_data_suggestions(data)
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "suggestions": suggestions
        }
    
    def _estimate_performance_score(self, employee: Employee) -> float:
        """Estimer le score de performance d'un employé"""
        
        if not employee.skills:
            return 0.5
        
        # Score basé sur le niveau moyen des compétences
        avg_level = employee.get_average_skill_level()
        level_score = avg_level / 5.0
        
        # Score basé sur l'expérience
        experience_years = employee.get_total_experience_years()
        experience_score = min(1.0, experience_years / 10.0)
        
        # Score basé sur les certifications
        certified_skills = sum(1 for skill in employee.skills if skill.certification)
        cert_score = min(0.3, certified_skills / len(employee.skills) * 0.3)
        
        performance = level_score * 0.6 + experience_score * 0.3 + cert_score
        return round(min(1.0, performance), 3)
    
    def _estimate_adaptability_score(self, employee: Employee) -> float:
        """Estimer le score d'adaptabilité d'un employé"""
        
        if not employee.skills:
            return 0.5
        
        # Diversité des types de compétences
        skill_types = set(skill.skill_type for skill in employee.skills if skill.skill_type)
        diversity_score = min(1.0, len(skill_types) / 4.0)  # 4 types max
        
        # Progression récente (basée sur les dates d'acquisition)
        recent_skills = [
            skill for skill in employee.skills 
            if skill.acquired_date and (datetime.now() - skill.acquired_date).days <= 365
        ]
        learning_activity = min(0.3, len(recent_skills) / len(employee.skills) * 0.3)
        
        adaptability = diversity_score * 0.7 + learning_activity
        return round(min(1.0, adaptability), 3)
    
    def _estimate_learning_speed(self, employee: Employee) -> float:
        """Estimer la vitesse d'apprentissage d'un employé"""
        
        if not employee.skills:
            return 0.5
        
        # Analyser la progression des compétences
        skills_with_dates = [
            skill for skill in employee.skills 
            if skill.acquired_date and skill.last_evaluated_date
        ]
        
        if not skills_with_dates:
            # Score par défaut basé sur l'expérience
            return min(1.0, employee.get_total_experience_years() / 8.0)
        
        # Calculer la vitesse moyenne d'acquisition
        total_progression = 0
        total_time = 0
        
        for skill in skills_with_dates:
            if skill.last_evaluated_date > skill.acquired_date:
                time_diff = (skill.last_evaluated_date - skill.acquired_date).days
                if time_diff > 0:
                    progression_rate = skill.current_level / max(1, time_diff / 365)
                    total_progression += progression_rate
                    total_time += 1
        
        if total_time > 0:
            avg_learning_speed = total_progression / total_time
            return round(min(1.0, avg_learning_speed / 3.0), 3)
        
        return 0.6  # Score par défaut
    
    def _calculate_job_complexity(self, job: JobDescription) -> float:
        """Calculer la complexité d'un poste"""
        
        if not job.required_skills:
            return 0.3
        
        # Complexité basée sur le nombre et le niveau des compétences
        skill_count_factor = min(1.0, len(job.required_skills) / 10.0)
        avg_level_factor = job.get_average_required_level() / 5.0
        
        # Facteur de diversité des types de compétences
        skill_types = set(skill.skill_type for skill in job.required_skills if skill.skill_type)
        diversity_factor = min(0.3, len(skill_types) / 4.0 * 0.3)
        
        complexity = skill_count_factor * 0.4 + avg_level_factor * 0.4 + diversity_factor
        return round(min(1.0, complexity), 3)
    
    def _estimate_growth_potential(self, job: JobDescription) -> float:
        """Estimer le potentiel de croissance d'un poste"""
        
        # Potentiel basé sur le département
        department_potential = {
            'Développement': 0.9,
            'Marketing': 0.7,
            'RH': 0.6,
            'Finance': 0.7,
            'Commercial': 0.8
        }
        
        base_potential = department_potential.get(job.department, 0.6)
        
        # Ajustement basé sur la complexité
        complexity_bonus = (job.complexity_score or 0.5) * 0.2
        
        growth_potential = base_potential + complexity_bonus
        return round(min(1.0, growth_potential), 3)
    
    def _estimate_market_demand(self, job: JobDescription) -> float:
        """Estimer la demande du marché pour un poste"""
        
        # Demande simulée basée sur le département et les compétences
        department_demand = {
            'Développement': 0.9,
            'Marketing': 0.7,
            'RH': 0.5,
            'Finance': 0.6,
            'Commercial': 0.8
        }
        
        base_demand = department_demand.get(job.department, 0.6)
        
        # Ajustement basé sur les compétences techniques
        tech_skills = [skill for skill in job.required_skills if skill.skill_type == 'Technique']
        tech_bonus = min(0.3, len(tech_skills) / 5.0 * 0.3)
        
        market_demand = base_demand + tech_bonus
        return round(min(1.0, market_demand), 3)
    
    def _enrich_employee_skills(self, skills: List[EmployeeSkill]) -> List[EmployeeSkill]:
        """Enrichir les compétences d'un employé avec des métadonnées"""
        
        enriched_skills = []
        
        for skill in skills:
            enriched_skill = skill.copy(deep=True)
            
            # Calculer l'expérience en années si pas fournie
            if not enriched_skill.years_experience and skill.acquired_date:
                years = (datetime.now() - skill.acquired_date).days // 365
                enriched_skill.years_experience = max(0, years)
            
            enriched_skills.append(enriched_skill)
        
        return enriched_skills
    
    def _enrich_required_skills(self, skills: List[RequiredSkill]) -> List[RequiredSkill]:
        """Enrichir les compétences requises avec des métadonnées"""
        
        enriched_skills = []
        
        for skill in skills:
            enriched_skill = skill.copy(deep=True)
            
            # Définir le poids par défaut si pas fourni
            if enriched_skill.weight == 1.0:
                # Poids basé sur le type de compétence
                if skill.skill_type == 'Technique':
                    enriched_skill.weight = 1.5
                elif skill.skill_type == 'Managériale':
                    enriched_skill.weight = 1.3
                elif skill.skill_type == 'Communication':
                    enriched_skill.weight = 1.1
            
            enriched_skills.append(enriched_skill)
        
        return enriched_skills
    
    def _validate_employee_data(self, employee_data: Dict) -> List[str]:
        """Valider les données d'un employé"""
        errors = []
        
        required_fields = ['id', 'name', 'position', 'hire_date', 'email']
        for field in required_fields:
            if field not in employee_data:
                errors.append(f"Champ requis manquant: employee.{field}")
        
        # Validation des compétences
        if 'skills' in employee_data:
            for i, skill in enumerate(employee_data['skills']):
                if 'skill_id' not in skill:
                    errors.append(f"employee.skills[{i}].skill_id manquant")
                if 'current_level' not in skill:
                    errors.append(f"employee.skills[{i}].current_level manquant")
                elif not (1 <= skill['current_level'] <= 5):
                    errors.append(f"employee.skills[{i}].current_level doit être entre 1 et 5")
        
        return errors
    
    def _validate_job_data(self, job_data: Dict, prefix: str = "job") -> List[str]:
        """Valider les données d'un poste"""
        errors = []
        
        required_fields = ['id', 'title', 'department']
        for field in required_fields:
            if field not in job_data:
                errors.append(f"Champ requis manquant: {prefix}.{field}")
        
        # Validation des compétences requises
        if 'required_skills' in job_data:
            for i, skill in enumerate(job_data['required_skills']):
                if 'skill_id' not in skill:
                    errors.append(f"{prefix}.required_skills[{i}].skill_id manquant")
                if 'required_level' not in skill:
                    errors.append(f"{prefix}.required_skills[{i}].required_level manquant")
                elif not (1 <= skill['required_level'] <= 5):
                    errors.append(f"{prefix}.required_skills[{i}].required_level doit être entre 1 et 5")
        
        return errors
    
    def _generate_data_suggestions(self, data: Dict) -> List[str]:
        """Générer des suggestions d'amélioration des données"""
        suggestions = []
        
        # Suggestions pour l'employé
        if 'employee' in data:
            employee = data['employee']
            
            if 'skills' in employee and len(employee['skills']) < 3:
                suggestions.append("Ajouter plus de compétences pour améliorer la précision des recommandations")
            
            if 'department' not in employee:
                suggestions.append("Ajouter le département de l'employé pour des recommandations plus ciblées")
            
            # Vérifier les dates manquantes
            skills_without_dates = [
                skill for skill in employee.get('skills', [])
                if not skill.get('acquired_date')
            ]
            if skills_without_dates:
                suggestions.append("Ajouter les dates d'acquisition des compétences pour un meilleur suivi")
        
        # Suggestions pour les postes
        if 'target_job' in data or 'available_jobs' in data:
            suggestions.append("Ajouter des poids aux compétences pour affiner les recommandations")
            suggestions.append("Spécifier les compétences obligatoires vs optionnelles")
        
        return suggestions
    
    def convert_from_nodejs_format(self, nodejs_data: Dict) -> Dict:
        """Convertir les données du format Node.js vers le format Python"""
        
        converted = {}
        
        # Conversion des données employé
        if 'employee' in nodejs_data:
            employee_data = nodejs_data['employee']
            
            converted_employee = {
                'id': employee_data.get('id'),
                'name': employee_data.get('name'),
                'position': employee_data.get('position'),
                'department': employee_data.get('department'),
                'hire_date': employee_data.get('hire_date'),
                'email': employee_data.get('email'),
                'phone': employee_data.get('phone'),
                'location': employee_data.get('location'),
                'skills': []
            }
            
            # Conversion des compétences
            skills_data = employee_data.get('skills', []) or employee_data.get('EmployeeSkills', [])
            for skill in skills_data:
                converted_skill = {
                    'skill_id': skill.get('skill_id'),
                    'skill_name': skill.get('Skill', {}).get('name') or skill.get('skill_name'),
                    'skill_type': skill.get('Skill', {}).get('type', {}).get('type_name'),
                    'current_level': skill.get('SkillLevel', {}).get('value') or skill.get('current_level', 1),
                    'level_name': skill.get('SkillLevel', {}).get('level_name'),
                    'acquired_date': skill.get('acquired_date'),
                    'certification': skill.get('certification'),
                    'last_evaluated_date': skill.get('last_evaluated_date')
                }
                converted_employee['skills'].append(converted_skill)
            
            converted['employee'] = converted_employee
        
        # Conversion des données de poste
        if 'target_job' in nodejs_data:
            converted['target_job'] = self._convert_job_from_nodejs(nodejs_data['target_job'])
        
        if 'available_jobs' in nodejs_data:
            converted['available_jobs'] = [
                self._convert_job_from_nodejs(job) for job in nodejs_data['available_jobs']
            ]
        
        return converted
    
    def _convert_job_from_nodejs(self, job_data: Dict) -> Dict:
        """Convertir un poste du format Node.js"""
        
        converted_job = {
            'id': job_data.get('id'),
            'title': job_data.get('emploi') or job_data.get('title'),
            'department': job_data.get('filiere_activite') or job_data.get('department'),
            'family': job_data.get('famille'),
            'experience_level': job_data.get('niveau_exp'),
            'required_skills': []
        }
        
        # Conversion des compétences requises
        required_skills = job_data.get('requiredSkills', []) or job_data.get('required_skills', [])
        for skill in required_skills:
            converted_skill = {
                'skill_id': skill.get('skill_id'),
                'skill_name': skill.get('Skill', {}).get('name') or skill.get('skill_name'),
                'skill_type': skill.get('Skill', {}).get('type', {}).get('type_name'),
                'required_level': skill.get('SkillLevel', {}).get('value') or skill.get('required_level', 3),
                'level_name': skill.get('SkillLevel', {}).get('level_name'),
                'is_mandatory': skill.get('is_mandatory', True),
                'weight': skill.get('weight', 1.0)
            }
            converted_job['required_skills'].append(converted_skill)
        
        return converted_job
    
    def create_feature_vector(self, employee: Employee, job: Optional[JobDescription] = None) -> np.ndarray:
        """Créer un vecteur de caractéristiques pour l'employé"""
        
        features = []
        
        # Caractéristiques de base de l'employé
        features.extend([
            employee.get_total_experience_years(),
            employee.get_average_skill_level(),
            len(employee.skills),
            employee.performance_score or 0.7,
            employee.adaptability_score or 0.6,
            employee.learning_speed or 0.6
        ])
        
        # Caractéristiques par type de compétence
        skill_types = ['Technique', 'Managériale', 'Communication', 'Analytique']
        for skill_type in skill_types:
            type_skills = employee.get_skills_by_type(skill_type)
            if type_skills:
                avg_level = sum(skill.current_level for skill in type_skills) / len(type_skills)
                features.append(avg_level)
            else:
                features.append(0.0)
        
        # Si un poste cible est fourni, ajouter des caractéristiques de compatibilité
        if job:
            compatibility = self._calculate_basic_compatibility(employee, job)
            features.extend([
                compatibility['skill_match_ratio'],
                compatibility['experience_match'],
                compatibility['complexity_match']
            ])
        
        return np.array(features)
    
    def _calculate_basic_compatibility(self, employee: Employee, job: JobDescription) -> Dict[str, float]:
        """Calculer la compatibilité de base entre employé et poste"""
        
        employee_skills_map = {skill.skill_id: skill for skill in employee.skills}
        
        matching_skills = 0
        total_skills = len(job.required_skills)
        
        for required_skill in job.required_skills:
            employee_skill = employee_skills_map.get(required_skill.skill_id)
            if employee_skill and employee_skill.current_level >= required_skill.required_level:
                matching_skills += 1
        
        skill_match_ratio = matching_skills / total_skills if total_skills > 0 else 0
        
        # Match d'expérience
        experience_match = self._calculate_experience_match_simple(employee, job)
        
        # Match de complexité
        job_complexity = job.complexity_score or 0.5
        employee_capability = employee.performance_score or 0.7
        complexity_match = min(1.0, employee_capability / job_complexity)
        
        return {
            'skill_match_ratio': skill_match_ratio,
            'experience_match': experience_match,
            'complexity_match': complexity_match
        }
    
    def _calculate_experience_match_simple(self, employee: Employee, job: JobDescription) -> float:
        """Calculer la correspondance d'expérience (version simplifiée)"""
        
        employee_years = employee.get_total_experience_years()
        
        # Années requises par niveau
        required_years_map = {
            'Junior': 1,
            'Confirmé': 3,
            'Senior': 5,
            'Expert': 8
        }
        
        required_years = required_years_map.get(job.experience_level, 2)
        
        if employee_years >= required_years:
            return 1.0
        else:
            return max(0.0, employee_years / required_years)