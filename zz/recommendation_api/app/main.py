from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import logging
from datetime import datetime

from app.models.employee import Employee, EmployeeSkill
from app.models.job import JobDescription, RequiredSkill
from app.models.recommendations import TrainingRecommendation, JobRecommendation
from app.services.recommendation_engine import RecommendationEngine
from app.services.data_processor import DataProcessor
from app.core.config import settings

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialisation de l'application FastAPI
app = FastAPI(
    title="SmartHire ML Recommendation API",
    description="API de recommandation basée sur le machine learning pour la gestion des employés",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation des services
recommendation_engine = RecommendationEngine()
data_processor = DataProcessor()

@app.on_event("startup")
async def startup_event():
    """Initialisation au démarrage de l'API"""
    logger.info("🚀 Starting SmartHire ML Recommendation API...")
    
    # Charger et entraîner les modèles
    try:
        await recommendation_engine.initialize_models()
        logger.info("✅ Models initialized successfully")
    except Exception as e:
        logger.error(f"❌ Error initializing models: {e}")
        raise

@app.get("/")
async def root():
    """Endpoint racine avec informations sur l'API"""
    return {
        "message": "SmartHire ML Recommendation API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "training_recommendations": "/api/v1/recommendations/training",
            "job_recommendations": "/api/v1/recommendations/jobs",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Vérification de l'état de santé de l'API"""
    try:
        model_status = recommendation_engine.get_model_status()
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "models": model_status,
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Modèles de requête
class TrainingRecommendationRequest(BaseModel):
    employee: Employee
    target_job: JobDescription
    max_recommendations: Optional[int] = 5
    priority_threshold: Optional[float] = 0.6

class JobRecommendationRequest(BaseModel):
    employee: Employee
    available_jobs: List[JobDescription]
    max_recommendations: Optional[int] = 10
    min_compatibility_score: Optional[float] = 0.5

# Routes principales
@app.post("/api/v1/recommendations/training", response_model=List[TrainingRecommendation])
async def get_training_recommendations(request: TrainingRecommendationRequest):
    """
    Obtenir des recommandations de formation pour un employé
    
    Cette endpoint analyse les compétences actuelles d'un employé par rapport
    aux exigences d'un poste cible et recommande des formations pour combler les écarts.
    """
    try:
        logger.info(f"🎯 Getting training recommendations for employee {request.employee.id}")
        
        # Traitement des données
        processed_employee = data_processor.process_employee_data(request.employee)
        processed_job = data_processor.process_job_data(request.target_job)
        
        # Génération des recommandations
        recommendations = await recommendation_engine.generate_training_recommendations(
            employee=processed_employee,
            target_job=processed_job,
            max_recommendations=request.max_recommendations,
            priority_threshold=request.priority_threshold
        )
        
        logger.info(f"✅ Generated {len(recommendations)} training recommendations")
        return recommendations
        
    except Exception as e:
        logger.error(f"❌ Error generating training recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération des recommandations de formation: {str(e)}")

@app.post("/api/v1/recommendations/jobs", response_model=List[JobRecommendation])
async def get_job_recommendations(request: JobRecommendationRequest):
    """
    Obtenir des recommandations de poste pour un employé
    
    Cette endpoint analyse les compétences d'un employé et recommande
    les postes les plus compatibles parmi ceux disponibles.
    """
    try:
        logger.info(f"💼 Getting job recommendations for employee {request.employee.id}")
        
        # Traitement des données
        processed_employee = data_processor.process_employee_data(request.employee)
        processed_jobs = [data_processor.process_job_data(job) for job in request.available_jobs]
        
        # Génération des recommandations
        recommendations = await recommendation_engine.generate_job_recommendations(
            employee=processed_employee,
            available_jobs=processed_jobs,
            max_recommendations=request.max_recommendations,
            min_compatibility_score=request.min_compatibility_score
        )
        
        logger.info(f"✅ Generated {len(recommendations)} job recommendations")
        return recommendations
        
    except Exception as e:
        logger.error(f"❌ Error generating job recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération des recommandations de poste: {str(e)}")

# Routes utilitaires
@app.post("/api/v1/models/retrain")
async def retrain_models():
    """
    Réentraîner les modèles avec de nouvelles données
    
    Cette endpoint permet de réentraîner les modèles de recommandation
    avec des données mises à jour.
    """
    try:
        logger.info("🔄 Starting model retraining...")
        
        result = await recommendation_engine.retrain_models()
        
        logger.info("✅ Model retraining completed")
        return {
            "message": "Modèles réentraînés avec succès",
            "timestamp": datetime.now().isoformat(),
            "result": result
        }
        
    except Exception as e:
        logger.error(f"❌ Error retraining models: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du réentraînement: {str(e)}")

@app.get("/api/v1/models/status")
async def get_model_status():
    """Obtenir le statut des modèles ML"""
    try:
        status = recommendation_engine.get_model_status()
        return status
    except Exception as e:
        logger.error(f"❌ Error getting model status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/data/validate")
async def validate_data(data: Dict[str, Any]):
    """Valider la structure des données d'entrée"""
    try:
        validation_result = data_processor.validate_input_data(data)
        return {
            "valid": validation_result["valid"],
            "errors": validation_result.get("errors", []),
            "suggestions": validation_result.get("suggestions", [])
        }
    except Exception as e:
        logger.error(f"❌ Error validating data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )