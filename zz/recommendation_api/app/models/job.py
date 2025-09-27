from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class RequiredSkill(BaseModel):
    skill_id: int
    skill_name: str
    skill_type: Optional[str] = None
    required_level: int = Field(..., ge=1, le=5, description="Niveau requis de 1 à 5")
    level_name: Optional[str] = None
    is_mandatory: bool = True
    weight: float = Field(default=1.0, ge=0.1, le=2.0, description="Poids de la compétence")

class JobDescription(BaseModel):
    id: int
    title: str
    department: str
    family: Optional[str] = None
    experience_level: Optional[str] = None
    required_skills: List[RequiredSkill] = []
    
    # Métadonnées du poste
    complexity_score: Optional[float] = None
    growth_potential: Optional[float] = None
    market_demand: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def get_required_skill_by_id(self, skill_id: int) -> Optional[RequiredSkill]:
        """Récupérer une compétence requise par son ID"""
        return next((skill for skill in self.required_skills if skill.skill_id == skill_id), None)
    
    def get_required_skills_by_type(self, skill_type: str) -> List[RequiredSkill]:
        """Récupérer les compétences requises par type"""
        return [skill for skill in self.required_skills if skill.skill_type == skill_type]
    
    def get_mandatory_skills(self) -> List[RequiredSkill]:
        """Récupérer les compétences obligatoires"""
        return [skill for skill in self.required_skills if skill.is_mandatory]
    
    def get_average_required_level(self) -> float:
        """Calculer le niveau moyen requis"""
        if not self.required_skills:
            return 0.0
        return sum(skill.required_level for skill in self.required_skills) / len(self.required_skills)
    
    def get_total_skill_weight(self) -> float:
        """Calculer le poids total des compétences"""
        return sum(skill.weight for skill in self.required_skills)