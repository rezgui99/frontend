from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import json

class EmployeeSkill(BaseModel):
    skill_id: int
    skill_name: str
    skill_type: Optional[str] = None
    current_level: int = Field(..., ge=1, le=5, description="Niveau actuel de 1 à 5")
    level_name: Optional[str] = None
    acquired_date: Optional[str] = None  # Accepter string pour flexibilité
    certification: Optional[str] = None
    last_evaluated_date: Optional[str] = None  # Accepter string pour flexibilité
    years_experience: Optional[int] = 0

class Employee(BaseModel):
    id: int
    name: str
    position: str
    department: Optional[str] = None
    hire_date: str  # Accepter string pour flexibilité avec différents formats
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    years_total_experience: Optional[int] = None
    skills: List[EmployeeSkill] = []
    
    # Métadonnées calculées
    performance_score: Optional[float] = None
    adaptability_score: Optional[float] = None
    learning_speed: Optional[float] = None
    
    class Config:
        # Permettre des champs supplémentaires pour la flexibilité
        extra = "ignore"
        
    def parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parser une date string en datetime avec gestion d'erreurs"""
        if not date_str:
            return None
        
        try:
            # Essayer différents formats
            for fmt in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ']:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
            
            # Si aucun format ne marche, essayer le parsing automatique
            from dateutil.parser import parse
            return parse(date_str)
        except Exception:
            return None
        
    def get_skill_by_id(self, skill_id: int) -> Optional[EmployeeSkill]:
        """Récupérer une compétence par son ID"""
        return next((skill for skill in self.skills if skill.skill_id == skill_id), None)
    
    def get_skills_by_type(self, skill_type: str) -> List[EmployeeSkill]:
        """Récupérer les compétences par type"""
        return [skill for skill in self.skills if skill.skill_type == skill_type]
    
    def get_average_skill_level(self) -> float:
        """Calculer le niveau moyen des compétences"""
        if not self.skills:
            return 0.0
        return sum(skill.current_level for skill in self.skills) / len(self.skills)
    
    def get_total_experience_years(self) -> int:
        """Calculer l'expérience totale en années"""
        if self.years_total_experience:
            return self.years_total_experience
        
        # Calculer depuis la date d'embauche
        hire_datetime = self.parse_date(self.hire_date)
        if hire_datetime:
            years_since_hire = (datetime.now() - hire_datetime).days // 365
        else:
            years_since_hire = 2  # Valeur par défaut
        return max(0, years_since_hire)
    
    def has_certification_in_skill(self, skill_id: int) -> bool:
        """Vérifier si l'employé a une certification pour une compétence"""
        skill = self.get_skill_by_id(skill_id)
        return skill is not None and skill.certification is not None and skill.certification.strip() != ""