import os
from typing import List

class Settings:
    # Configuration de l'API
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Configuration des modèles ML
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models")
    TRAINING_DATA_PATH: str = os.getenv("TRAINING_DATA_PATH", "./data")
    
    # Configuration de la base de données (si nécessaire)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Configuration des seuils de recommandation
    MIN_TRAINING_PRIORITY: float = 0.3
    MIN_JOB_COMPATIBILITY: float = 0.4
    MAX_RECOMMENDATIONS: int = 10
    
    # Configuration des poids pour le calcul de score
    SKILL_WEIGHT: float = 0.7
    EXPERIENCE_WEIGHT: float = 0.2
    CERTIFICATION_WEIGHT: float = 0.1
    
    # Configuration des niveaux de compétences
    SKILL_LEVELS: dict = {
        1: {"name": "Débutant", "value": 1.0},
        2: {"name": "Junior", "value": 2.0},
        3: {"name": "Autonome", "value": 3.0},
        4: {"name": "Avancé", "value": 4.0},
        5: {"name": "Expert", "value": 5.0}
    }
    
    # Configuration des types de formation
    TRAINING_TYPES: List[str] = [
        "Formation en ligne",
        "Formation présentielle",
        "Certification",
        "Mentorat",
        "Projet pratique",
        "Conférence/Séminaire"
    ]
    
    # Configuration des durées de formation (en heures)
    TRAINING_DURATIONS: dict = {
        "court": {"min": 1, "max": 20},
        "moyen": {"min": 21, "max": 100},
        "long": {"min": 101, "max": 500}
    }

settings = Settings()