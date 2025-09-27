import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import mean_squared_error, accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import Dict, Any, Tuple
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class MLTrainer:
    """Service d'entraînement des modèles de machine learning"""
    
    def __init__(self, model_save_path: str = "./models"):
        self.model_save_path = model_save_path
        self.models = {}
        self.scalers = {}
        self.training_history = []
        
        # Créer le dossier de sauvegarde s'il n'existe pas
        os.makedirs(model_save_path, exist_ok=True)
    
    def generate_synthetic_training_data(self, n_samples: int = 2000) -> pd.DataFrame:
        """Générer des données d'entraînement synthétiques réalistes"""
        
        logger.info(f"📊 Generating {n_samples} synthetic training samples...")
        
        np.random.seed(42)
        data = []
        
        # Définir les paramètres de simulation
        departments = ['Développement', 'Marketing', 'RH', 'Finance', 'Commercial']
        skill_types = ['Technique', 'Managériale', 'Communication', 'Analytique']
        experience_levels = ['Junior', 'Confirmé', 'Senior', 'Expert']
        
        for i in range(n_samples):
            # Profil employé de base
            department = np.random.choice(departments)
            experience_years = np.random.randint(0, 20)
            
            # Générer les niveaux de compétences avec corrélations réalistes
            base_skill_level = 1 + (experience_years / 20) * 4  # Corrélation expérience-compétence
            
            employee_profile = {
                'employee_id': i + 1,
                'department': department,
                'experience_years': experience_years,
                'num_skills': np.random.randint(3, 15),
                'has_certifications': np.random.choice([0, 1], p=[0.6, 0.4]),
                'performance_score': np.random.beta(2, 2),  # Distribution réaliste
                'adaptability_score': np.random.beta(2, 2),
                'learning_speed': np.random.beta(2, 2)
            }
            
            # Compétences par type avec variations réalistes
            for skill_type in skill_types:
                # Variation selon le département
                dept_bonus = self._get_department_skill_bonus(department, skill_type)
                skill_level = np.clip(
                    base_skill_level + dept_bonus + np.random.normal(0, 0.5),
                    1, 5
                )
                employee_profile[f'{skill_type.lower()}_level'] = skill_level
            
            # Générer des scénarios de formation
            training_scenarios = self._generate_training_scenarios(employee_profile)
            for scenario in training_scenarios:
                scenario_data = {**employee_profile, **scenario}
                data.append(scenario_data)
        
        df = pd.DataFrame(data)
        logger.info(f"✅ Generated {len(df)} training samples")
        return df
    
    def train_training_effectiveness_model(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Entraîner le modèle de prédiction d'efficacité de formation"""
        
        logger.info("🎓 Training training effectiveness model...")
        
        # Préparer les features
        feature_columns = [
            'experience_years', 'num_skills', 'performance_score', 
            'adaptability_score', 'learning_speed', 'has_certifications',
            'technique_level', 'managériale_level', 'communication_level', 'analytique_level',
            'skill_gap', 'training_duration', 'training_complexity'
        ]
        
        X = data[feature_columns]
        y = data['training_success_probability']
        
        # Division train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Normalisation
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Optimisation des hyperparamètres
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [5, 10, 15],
            'min_samples_split': [2, 5, 10]
        }
        
        rf = RandomForestRegressor(random_state=42)
        grid_search = GridSearchCV(rf, param_grid, cv=5, scoring='neg_mean_squared_error')
        grid_search.fit(X_train_scaled, y_train)
        
        # Meilleur modèle
        best_model = grid_search.best_estimator_
        
        # Évaluation
        y_pred = best_model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2_score = best_model.score(X_test_scaled, y_test)
        
        # Sauvegarde
        model_path = os.path.join(self.model_save_path, 'training_effectiveness_model.joblib')
        scaler_path = os.path.join(self.model_save_path, 'training_scaler.joblib')
        
        joblib.dump(best_model, model_path)
        joblib.dump(scaler, scaler_path)
        
        self.models['training_effectiveness'] = best_model
        self.scalers['training'] = scaler
        
        training_results = {
            'model_type': 'RandomForestRegressor',
            'best_params': grid_search.best_params_,
            'mse': mse,
            'r2_score': r2_score,
            'feature_importance': dict(zip(feature_columns, best_model.feature_importances_)),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'trained_at': datetime.now().isoformat()
        }
        
        logger.info(f"✅ Training effectiveness model trained - R²: {r2_score:.4f}, MSE: {mse:.4f}")
        return training_results
    
    def train_job_compatibility_model(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Entraîner le modèle de compatibilité poste-employé"""
        
        logger.info("💼 Training job compatibility model...")
        
        # Préparer les features
        feature_columns = [
            'experience_years', 'num_skills', 'performance_score',
            'technique_level', 'managériale_level', 'communication_level', 'analytique_level',
            'job_complexity', 'required_skills_count', 'skill_match_ratio'
        ]
        
        X = data[feature_columns]
        y = (data['job_compatibility_score'] > 0.7).astype(int)  # Classification binaire
        
        # Division train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Optimisation des hyperparamètres
        param_grid = {
            'n_estimators': [50, 100, 150],
            'learning_rate': [0.05, 0.1, 0.15],
            'max_depth': [3, 5, 7]
        }
        
        gb = GradientBoostingClassifier(random_state=42)
        grid_search = GridSearchCV(gb, param_grid, cv=5, scoring='accuracy')
        grid_search.fit(X_train, y_train)
        
        # Meilleur modèle
        best_model = grid_search.best_estimator_
        
        # Évaluation
        y_pred = best_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Sauvegarde
        model_path = os.path.join(self.model_save_path, 'job_compatibility_model.joblib')
        joblib.dump(best_model, model_path)
        
        self.models['job_compatibility'] = best_model
        
        training_results = {
            'model_type': 'GradientBoostingClassifier',
            'best_params': grid_search.best_params_,
            'accuracy': accuracy,
            'feature_importance': dict(zip(feature_columns, best_model.feature_importances_)),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'trained_at': datetime.now().isoformat()
        }
        
        logger.info(f"✅ Job compatibility model trained - Accuracy: {accuracy:.4f}")
        return training_results
    
    def _generate_training_scenarios(self, employee_profile: Dict) -> List[Dict]:
        """Générer des scénarios de formation pour un profil employé"""
        
        scenarios = []
        
        # Générer 3-5 scénarios par employé
        for _ in range(np.random.randint(3, 6)):
            # Sélectionner une compétence à améliorer
            skill_type = np.random.choice(['Technique', 'Managériale', 'Communication', 'Analytique'])
            current_level = employee_profile[f'{skill_type.lower()}_level']
            
            # Définir l'objectif de formation
            target_level = min(5, current_level + np.random.randint(1, 3))
            skill_gap = target_level - current_level
            
            # Caractéristiques de la formation
            training_duration = 20 + skill_gap * 30 + np.random.randint(0, 40)
            training_complexity = skill_gap / 2.0  # 0.5 à 2.0
            
            # Calculer la probabilité de succès
            success_prob = self._calculate_synthetic_training_success(
                employee_profile, skill_gap, training_duration, training_complexity
            )
            
            # Calculer la compatibilité avec un poste fictif
            job_compatibility = self._calculate_synthetic_job_compatibility(
                employee_profile, skill_type, target_level
            )
            
            scenario = {
                'skill_type': skill_type,
                'current_skill_level': current_level,
                'target_skill_level': target_level,
                'skill_gap': skill_gap,
                'training_duration': training_duration,
                'training_complexity': training_complexity,
                'training_success_probability': success_prob,
                'job_complexity': np.random.uniform(0.3, 1.0),
                'required_skills_count': np.random.randint(3, 12),
                'skill_match_ratio': np.random.uniform(0.2, 1.0),
                'job_compatibility_score': job_compatibility
            }
            
            scenarios.append(scenario)
        
        return scenarios
    
    def _calculate_synthetic_training_success(
        self, 
        employee_profile: Dict, 
        skill_gap: int, 
        duration: int, 
        complexity: float
    ) -> float:
        """Calculer la probabilité de succès de formation synthétique"""
        
        # Facteurs positifs
        experience_factor = min(0.3, employee_profile['experience_years'] * 0.02)
        performance_factor = employee_profile['performance_score'] * 0.3
        adaptability_factor = employee_profile['adaptability_score'] * 0.2
        learning_factor = employee_profile['learning_speed'] * 0.2
        
        # Facteurs négatifs
        gap_penalty = skill_gap * 0.1
        complexity_penalty = complexity * 0.1
        
        # Score de base
        base_success = 0.6
        
        success_prob = (
            base_success + 
            experience_factor + performance_factor + adaptability_factor + learning_factor -
            gap_penalty - complexity_penalty
        )
        
        # Ajouter du bruit réaliste
        success_prob += np.random.normal(0, 0.1)
        
        return np.clip(success_prob, 0.1, 0.95)
    
    def _calculate_synthetic_job_compatibility(
        self, 
        employee_profile: Dict, 
        focus_skill_type: str, 
        improved_level: float
    ) -> float:
        """Calculer la compatibilité avec un poste synthétique"""
        
        # Score de base selon le département
        dept_compatibility = {
            'Développement': {'Technique': 0.9, 'Analytique': 0.7, 'Communication': 0.5, 'Managériale': 0.4},
            'Marketing': {'Communication': 0.9, 'Analytique': 0.6, 'Managériale': 0.7, 'Technique': 0.3},
            'RH': {'Communication': 0.9, 'Managériale': 0.8, 'Analytique': 0.5, 'Technique': 0.2},
            'Finance': {'Analytique': 0.9, 'Technique': 0.6, 'Managériale': 0.6, 'Communication': 0.5},
            'Commercial': {'Communication': 0.9, 'Managériale': 0.7, 'Analytique': 0.5, 'Technique': 0.3}
        }
        
        department = employee_profile['department']
        base_compatibility = dept_compatibility.get(department, {}).get(focus_skill_type, 0.5)
        
        # Ajustements basés sur le profil
        experience_bonus = min(0.2, employee_profile['experience_years'] * 0.01)
        performance_bonus = employee_profile['performance_score'] * 0.2
        skill_level_bonus = (improved_level - 2.5) * 0.1
        
        compatibility = base_compatibility + experience_bonus + performance_bonus + skill_level_bonus
        
        # Ajouter du bruit
        compatibility += np.random.normal(0, 0.1)
        
        return np.clip(compatibility, 0.1, 0.95)
    
    def _get_department_skill_bonus(self, department: str, skill_type: str) -> float:
        """Obtenir le bonus de compétence selon le département"""
        
        bonuses = {
            'Développement': {'Technique': 1.0, 'Analytique': 0.5, 'Communication': 0.0, 'Managériale': -0.2},
            'Marketing': {'Communication': 1.0, 'Managériale': 0.3, 'Analytique': 0.2, 'Technique': -0.3},
            'RH': {'Communication': 0.8, 'Managériale': 0.6, 'Analytique': 0.1, 'Technique': -0.5},
            'Finance': {'Analytique': 1.0, 'Technique': 0.3, 'Managériale': 0.2, 'Communication': 0.0},
            'Commercial': {'Communication': 0.9, 'Managériale': 0.4, 'Analytique': 0.1, 'Technique': -0.4}
        }
        
        return bonuses.get(department, {}).get(skill_type, 0.0)
    
    def evaluate_model_performance(self, model_name: str, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
        """Évaluer les performances d'un modèle"""
        
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not found")
        
        model = self.models[model_name]
        
        # Prédictions
        y_pred = model.predict(X_test)
        
        # Métriques selon le type de modèle
        if hasattr(model, 'predict_proba'):  # Classification
            accuracy = accuracy_score(y_test, y_pred)
            report = classification_report(y_test, y_pred, output_dict=True)
            
            return {
                'model_type': 'classification',
                'accuracy': accuracy,
                'classification_report': report,
                'test_samples': len(X_test)
            }
        else:  # Régression
            mse = mean_squared_error(y_test, y_pred)
            r2 = model.score(X_test, y_test)
            
            return {
                'model_type': 'regression',
                'mse': mse,
                'rmse': np.sqrt(mse),
                'r2_score': r2,
                'test_samples': len(X_test)
            }
    
    def save_training_history(self, results: Dict[str, Any]):
        """Sauvegarder l'historique d'entraînement"""
        
        self.training_history.append({
            'timestamp': datetime.now().isoformat(),
            'results': results
        })
        
        # Sauvegarder dans un fichier
        history_path = os.path.join(self.model_save_path, 'training_history.json')
        import json
        with open(history_path, 'w') as f:
            json.dump(self.training_history, f, indent=2)
    
    def load_models(self) -> bool:
        """Charger les modèles sauvegardés"""
        
        try:
            # Charger le modèle d'efficacité de formation
            training_model_path = os.path.join(self.model_save_path, 'training_effectiveness_model.joblib')
            if os.path.exists(training_model_path):
                self.models['training_effectiveness'] = joblib.load(training_model_path)
                logger.info("✅ Training effectiveness model loaded")
            
            # Charger le scaler
            scaler_path = os.path.join(self.model_save_path, 'training_scaler.joblib')
            if os.path.exists(scaler_path):
                self.scalers['training'] = joblib.load(scaler_path)
                logger.info("✅ Training scaler loaded")
            
            # Charger le modèle de compatibilité
            job_model_path = os.path.join(self.model_save_path, 'job_compatibility_model.joblib')
            if os.path.exists(job_model_path):
                self.models['job_compatibility'] = joblib.load(job_model_path)
                logger.info("✅ Job compatibility model loaded")
            
            return len(self.models) > 0
            
        except Exception as e:
            logger.error(f"❌ Error loading models: {e}")
            return False
    
    def get_model_metrics(self) -> Dict[str, Any]:
        """Obtenir les métriques des modèles"""
        
        metrics = {
            'models_loaded': list(self.models.keys()),
            'scalers_loaded': list(self.scalers.keys()),
            'training_history_count': len(self.training_history),
            'last_training': self.training_history[-1]['timestamp'] if self.training_history else None
        }
        
        return metrics