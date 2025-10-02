#!/usr/bin/env python3
"""
Script d'exemple pour entraîner les modèles de recommandation
avec des données synthétiques réalistes.

Usage:
    python examples/train_models.py
"""

import sys
import os
import asyncio
import logging
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.ml_trainer import MLTrainer
from app.services.recommendation_engine import RecommendationEngine
from app.core.config import settings

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    """Fonction principale d'entraînement des modèles"""
    
    logger.info("🚀 Starting model training process...")
    
    # Initialiser le trainer
    trainer = MLTrainer(model_save_path="./models")
    
    # Générer des données d'entraînement synthétiques
    logger.info("📊 Generating synthetic training data...")
    training_data = trainer.generate_synthetic_training_data(n_samples=2000)
    
    logger.info(f"✅ Generated {len(training_data)} training samples")
    logger.info(f"📋 Data columns: {list(training_data.columns)}")
    logger.info(f"📈 Data shape: {training_data.shape}")
    
    # Afficher quelques statistiques sur les données
    print("\n📊 Training Data Statistics:")
    print("=" * 50)
    print(f"Departments: {training_data['department'].value_counts().to_dict()}")
    print(f"Experience range: {training_data['experience_years'].min()}-{training_data['experience_years'].max()} years")
    print(f"Average performance score: {training_data['performance_score'].mean():.3f}")
    print(f"Average training success rate: {training_data['training_success_probability'].mean():.3f}")
    
    # Entraîner le modèle d'efficacité de formation
    logger.info("\n🎓 Training effectiveness prediction model...")
    training_results = trainer.train_training_effectiveness_model(training_data)
    
    print("\n🎓 Training Effectiveness Model Results:")
    print("=" * 50)
    print(f"Model type: {training_results['model_type']}")
    print(f"Best parameters: {training_results['best_params']}")
    print(f"R² Score: {training_results['r2_score']:.4f}")
    print(f"MSE: {training_results['mse']:.4f}")
    print(f"Training samples: {training_results['training_samples']}")
    print(f"Test samples: {training_results['test_samples']}")
    
    print("\n🔍 Feature Importance:")
    for feature, importance in sorted(training_results['feature_importance'].items(), 
                                    key=lambda x: x[1], reverse=True):
        print(f"  {feature}: {importance:.4f}")
    
    # Entraîner le modèle de compatibilité poste
    logger.info("\n💼 Training job compatibility model...")
    job_results = trainer.train_job_compatibility_model(training_data)
    
    print("\n💼 Job Compatibility Model Results:")
    print("=" * 50)
    print(f"Model type: {job_results['model_type']}")
    print(f"Best parameters: {job_results['best_params']}")
    print(f"Accuracy: {job_results['accuracy']:.4f}")
    print(f"Training samples: {job_results['training_samples']}")
    print(f"Test samples: {job_results['test_samples']}")
    
    print("\n🔍 Feature Importance:")
    for feature, importance in sorted(job_results['feature_importance'].items(), 
                                    key=lambda x: x[1], reverse=True):
        print(f"  {feature}: {importance:.4f}")
    
    # Classification report
    print("\n📊 Classification Report:")
    report = job_results['classification_report']
    for class_name, metrics in report.items():
        if isinstance(metrics, dict):
            print(f"  {class_name}: precision={metrics['precision']:.3f}, "
                  f"recall={metrics['recall']:.3f}, f1-score={metrics['f1-score']:.3f}")
    
    # Sauvegarder l'historique d'entraînement
    trainer.save_training_history({
        'training_effectiveness': training_results,
        'job_compatibility': job_results
    })
    
    # Tester le moteur de recommandation
    logger.info("\n🧪 Testing recommendation engine...")
    await test_recommendation_engine()
    
    logger.info("\n✅ Model training completed successfully!")
    print("\n🎉 All models have been trained and saved!")
    print("📁 Models saved in: ./models/")
    print("📊 Training history saved in: ./models/training_history.json")
    print("\n🚀 You can now start the API with: uvicorn app.main:app --reload")

async def test_recommendation_engine():
    """Tester le moteur de recommandation avec des données d'exemple"""
    
    try:
        # Initialiser le moteur
        engine = RecommendationEngine()
        await engine.initialize_models()
        
        # Créer un employé d'exemple
        from app.models.employee import Employee, EmployeeSkill
        from app.models.job import JobDescription, RequiredSkill
        
        test_employee = Employee(
            id=1,
            name="Jean Dupont",
            position="Développeur Junior",
            department="Développement",
            hire_date="2022-01-15T00:00:00Z",
            email="jean.dupont@example.com",
            skills=[
                EmployeeSkill(
                    skill_id=1,
                    skill_name="JavaScript",
                    skill_type="Technique",
                    current_level=2,
                    level_name="Junior"
                ),
                EmployeeSkill(
                    skill_id=2,
                    skill_name="Communication",
                    skill_type="Communication",
                    current_level=3,
                    level_name="Autonome"
                )
            ]
        )
        
        # Créer un poste cible d'exemple
        test_job = JobDescription(
            id=5,
            title="Développeur Senior",
            department="Développement",
            experience_level="Senior",
            required_skills=[
                RequiredSkill(
                    skill_id=1,
                    skill_name="JavaScript",
                    skill_type="Technique",
                    required_level=4,
                    level_name="Avancé",
                    is_mandatory=True,
                    weight=1.5
                ),
                RequiredSkill(
                    skill_id=2,
                    skill_name="Communication",
                    skill_type="Communication",
                    required_level=3,
                    level_name="Autonome",
                    is_mandatory=True,
                    weight=1.0
                )
            ]
        )
        
        # Tester les recommandations de formation
        training_recs = await engine.generate_training_recommendations(
            test_employee, test_job, max_recommendations=3
        )
        
        print(f"\n🎓 Training Recommendations Generated: {len(training_recs)}")
        for i, rec in enumerate(training_recs, 1):
            print(f"  {i}. {rec.skill_name}: {rec.current_level} → {rec.target_level} "
                  f"(Priority: {rec.priority}, Score: {rec.priority_score:.3f})")
        
        # Tester les recommandations de poste
        job_recs = await engine.generate_job_recommendations(
            test_employee, [test_job], max_recommendations=5
        )
        
        print(f"\n💼 Job Recommendations Generated: {len(job_recs)}")
        for i, rec in enumerate(job_recs, 1):
            print(f"  {i}. {rec.job_title}: {rec.compatibility_score:.3f} compatibility "
                  f"({rec.readiness_level})")
        
        logger.info("✅ Recommendation engine test completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Error testing recommendation engine: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())