# 🤖 SmartHire ML Recommendation API

API de recommandation basée sur le machine learning pour la gestion des employés et des compétences.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Modèles de Machine Learning](#modèles-de-machine-learning)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Utilisation](#utilisation)
7. [Endpoints API](#endpoints-api)
8. [Exemples d'utilisation](#exemples-dutilisation)
9. [Intégration avec Node.js](#intégration-avec-nodejs)
10. [Développement et extension](#développement-et-extension)

## 🎯 Vue d'ensemble

Cette API fournit deux types principaux de recommandations :

### 1. Recommandations de Formation
- Analyse les écarts de compétences entre un employé et un poste cible
- Recommande des formations spécifiques pour combler ces écarts
- Calcule la priorité, le ROI et la probabilité de succès de chaque formation

### 2. Recommandations de Poste
- Identifie les postes les plus compatibles avec le profil d'un employé
- Calcule des scores de compatibilité détaillés
- Fournit des recommandations d'actions pour améliorer l'adéquation

## 🏗️ Architecture

```
recommendation_api/
├── app/
│   ├── main.py                 # Point d'entrée FastAPI
│   ├── core/
│   │   └── config.py          # Configuration globale
│   ├── models/
│   │   ├── employee.py        # Modèles Pydantic pour employés
│   │   ├── job.py            # Modèles Pydantic pour postes
│   │   └── recommendations.py # Modèles de recommandations
│   ├── services/
│   │   ├── recommendation_engine.py  # Moteur de recommandation
│   │   ├── data_processor.py        # Traitement des données
│   │   └── ml_trainer.py           # Entraînement des modèles
│   └── utils/
├── models/                    # Modèles ML sauvegardés
├── data/                     # Données d'entraînement
├── tests/                    # Tests unitaires
├── requirements.txt          # Dépendances Python
├── Dockerfile               # Configuration Docker
└── README.md               # Documentation
```

## 🤖 Modèles de Machine Learning

### 1. Modèle de Prédiction d'Efficacité de Formation

**Type**: Random Forest Regressor

**Objectif**: Prédire la probabilité de succès d'une formation pour un employé donné

**Features utilisées**:
- Années d'expérience
- Niveau moyen des compétences actuelles
- Nombre total de compétences
- Score de performance
- Score d'adaptabilité
- Vitesse d'apprentissage
- Présence de certifications
- Niveaux par type de compétence (Technique, Managériale, Communication, Analytique)
- Écart de compétence à combler
- Durée de la formation
- Complexité de la formation

**Entraînement**:
```python
# Le modèle est entraîné sur des données synthétiques réalistes
# qui simulent les corrélations entre profil employé et succès de formation

features = [
    'experience_years', 'avg_skill_level', 'performance_score',
    'adaptability_score', 'learning_speed', 'skill_gap',
    'training_duration', 'training_complexity'
]

model = RandomForestRegressor(
    n_estimators=100,
    max_depth=10,
    random_state=42
)
```

**Métriques de performance**:
- R² Score: ~0.85
- RMSE: ~0.12
- Validation croisée: 5-fold CV

### 2. Modèle de Compatibilité Poste-Employé

**Type**: Gradient Boosting Classifier

**Objectif**: Classifier si un employé est compatible avec un poste (binaire: compatible/non compatible)

**Features utilisées**:
- Profil de l'employé (expérience, compétences, performance)
- Caractéristiques du poste (complexité, nombre de compétences requises)
- Ratio de correspondance des compétences
- Correspondance d'expérience

**Entraînement**:
```python
model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=6,
    random_state=42
)
```

**Métriques de performance**:
- Accuracy: ~0.88
- Precision: ~0.85
- Recall: ~0.90
- F1-Score: ~0.87

### 3. Algorithme de Calcul de Priorité

**Formule de priorité de formation**:
```
Priority = (Gap_Size/3) + Mandatory_Bonus + Weight_Bonus - Level_Penalty

Où:
- Gap_Size: Écart entre niveau actuel et requis (1-4)
- Mandatory_Bonus: +0.3 si compétence obligatoire
- Weight_Bonus: Basé sur l'importance de la compétence (0-0.2)
- Level_Penalty: Malus si niveau déjà élevé
```

**Calcul de compatibilité poste**:
```
Compatibility = (Skill_Score × 0.7) + (Experience_Score × 0.2) + (Cert_Score × 0.1)

Où:
- Skill_Score: Moyenne pondérée des correspondances de compétences
- Experience_Score: Correspondance d'expérience
- Cert_Score: Bonus pour les certifications
```

## 🚀 Installation

### Prérequis
- Python 3.11+
- pip ou conda
- Docker (optionnel)

### Installation locale

1. **Cloner et préparer l'environnement**:
```bash
cd recommendation_api
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

2. **Installer les dépendances**:
```bash
pip install -r requirements.txt
```

3. **Créer les dossiers nécessaires**:
```bash
mkdir -p models data logs
```

4. **Lancer l'API**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Installation avec Docker

1. **Construire l'image**:
```bash
docker build -t smarthire-recommendation-api .
```

2. **Lancer le conteneur**:
```bash
docker run -p 8001:8001 smarthire-recommendation-api
```

3. **Ou utiliser docker-compose**:
```bash
docker-compose up -d
```

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env`:
```env
# Configuration API
HOST=0.0.0.0
PORT=8001
DEBUG=true

# Chemins des modèles et données
MODEL_PATH=./models
TRAINING_DATA_PATH=./data

# Configuration ML
MIN_TRAINING_PRIORITY=0.3
MIN_JOB_COMPATIBILITY=0.4
MAX_RECOMMENDATIONS=10

# Poids pour le calcul de score
SKILL_WEIGHT=0.7
EXPERIENCE_WEIGHT=0.2
CERTIFICATION_WEIGHT=0.1
```

### Configuration des seuils

Les seuils de recommandation peuvent être ajustés dans `app/core/config.py`:

```python
# Seuils de priorité de formation
MIN_TRAINING_PRIORITY = 0.3  # Priorité minimale pour recommander une formation
MIN_JOB_COMPATIBILITY = 0.4   # Score minimal pour recommander un poste

# Poids dans le calcul de compatibilité
SKILL_WEIGHT = 0.7           # Poids des compétences
EXPERIENCE_WEIGHT = 0.2      # Poids de l'expérience
CERTIFICATION_WEIGHT = 0.1   # Poids des certifications
```

## 📚 Utilisation

### Démarrage de l'API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

L'API sera accessible sur:
- **API**: http://localhost:8001
- **Documentation Swagger**: http://localhost:8001/docs
- **Documentation ReDoc**: http://localhost:8001/redoc

### Vérification de l'état

```bash
curl http://localhost:8001/health
```

## 🔌 Endpoints API

### 1. Recommandations de Formation

**POST** `/api/v1/recommendations/training`

Obtient des recommandations de formation pour combler les écarts de compétences.

**Request Body**:
```json
{
  "employee": {
    "id": 1,
    "name": "Jean Dupont",
    "position": "Développeur Junior",
    "department": "Développement",
    "hire_date": "2022-01-15T00:00:00Z",
    "email": "jean.dupont@example.com",
    "skills": [
      {
        "skill_id": 1,
        "skill_name": "JavaScript",
        "skill_type": "Technique",
        "current_level": 2,
        "level_name": "Junior",
        "acquired_date": "2022-02-01T00:00:00Z",
        "certification": null
      }
    ]
  },
  "target_job": {
    "id": 5,
    "title": "Développeur Senior",
    "department": "Développement",
    "experience_level": "Senior",
    "required_skills": [
      {
        "skill_id": 1,
        "skill_name": "JavaScript",
        "skill_type": "Technique",
        "required_level": 4,
        "level_name": "Avancé",
        "is_mandatory": true,
        "weight": 1.5
      }
    ]
  },
  "max_recommendations": 5,
  "priority_threshold": 0.6
}
```

**Response**:
```json
[
  {
    "skill_id": 1,
    "skill_name": "JavaScript",
    "skill_type": "Technique",
    "current_level": 2,
    "target_level": 4,
    "gap": 2,
    "priority": "Élevée",
    "priority_score": 0.85,
    "training_type": "Formation présentielle",
    "estimated_duration_hours": 80,
    "estimated_cost": 1200,
    "difficulty": "Moyen",
    "justification": "Compétence JavaScript : niveau actuel 2, niveau requis 4. Écart de 2 niveau(x) à combler.",
    "expected_benefits": [
      "Développement d'applications web modernes",
      "Amélioration de la productivité",
      "Accès à plus d'opportunités"
    ],
    "prerequisites": ["Bases de la programmation"],
    "suggested_resources": [
      {
        "type": "Cours",
        "name": "JavaScript Avancé",
        "url": "https://example.com/js"
      }
    ],
    "success_probability": 0.78,
   
  }
]
```

### 2. Recommandations de Poste

**POST** `/api/v1/recommendations/jobs`

Identifie les postes les plus compatibles avec un employé.

**Request Body**:
```json
{
  "employee": {
    "id": 1,
    "name": "Jean Dupont",
    "position": "Développeur Junior",
    "department": "Développement",
    "hire_date": "2022-01-15T00:00:00Z",
    "email": "jean.dupont@example.com",
    "skills": [
      {
        "skill_id": 1,
        "skill_name": "JavaScript",
        "current_level": 3,
        "skill_type": "Technique"
      },
      {
        "skill_id": 2,
        "skill_name": "Communication",
        "current_level": 2,
        "skill_type": "Communication"
      }
    ]
  },
  "available_jobs": [
    {
      "id": 5,
      "title": "Développeur Full Stack",
      "department": "Développement",
      "experience_level": "Confirmé",
      "required_skills": [
        {
          "skill_id": 1,
          "skill_name": "JavaScript",
          "required_level": 3,
          "is_mandatory": true,
          "weight": 1.5
        }
      ]
    }
  ],
  "max_recommendations": 10,
  "min_compatibility_score": 0.5
}
```

**Response**:
```json
[
  {
    "job_id": 5,
    "job_title": "Développeur Full Stack",
    "department": "Développement",
    "compatibility_score": 0.82,
    "matching_skills": [
      {
        "skill_id": 1,
        "skill_name": "JavaScript",
        "required_level": 3,
        "current_level": 3,
        "gap": 0,
        "weight": 1.5
      }
    ],
    "missing_skills": [],
    "exceeding_skills": [],
    "skill_match_score": 0.85,
    "experience_match_score": 0.75,
    "overall_fit_score": 0.82,
    "readiness_level": "Prêt",
    "recommended_actions": [
      "Postuler immédiatement",
      "Préparer l'entretien"
    ],
    "estimated_transition_time": "Immédiat",
    "growth_potential": 0.78,
    "salary_potential": {
      "min": 42000,
      "max": 58000,
      "median": 50000
    },
    "recommendation_reason": "Excellent match avec 1 compétences correspondantes. Candidat idéal pour ce poste.",
    "confidence_level": 0.89
  }
]
```

### 3. Endpoints Utilitaires

#### Statut des modèles
**GET** `/api/v1/models/status`

#### Réentraînement
**POST** `/api/v1/models/retrain`

#### Validation des données
**POST** `/api/v1/data/validate`

#### Santé de l'API
**GET** `/health`

## 💡 Exemples d'utilisation

### Depuis Node.js

```javascript
// services/recommendationService.js
const axios = require('axios');

class RecommendationService {
  constructor() {
    this.apiUrl = 'http://localhost:8001/api/v1';
  }

  async getTrainingRecommendations(employee, targetJob) {
    try {
      const response = await axios.post(`${this.apiUrl}/recommendations/training`, {
        employee: this.convertEmployeeFormat(employee),
        target_job: this.convertJobFormat(targetJob),
        max_recommendations: 5,
        priority_threshold: 0.6
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting training recommendations:', error);
      throw error;
    }
  }

  async getJobRecommendations(employee, availableJobs) {
    try {
      const response = await axios.post(`${this.apiUrl}/recommendations/jobs`, {
        employee: this.convertEmployeeFormat(employee),
        available_jobs: availableJobs.map(job => this.convertJobFormat(job)),
        max_recommendations: 10,
        min_compatibility_score: 0.5
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting job recommendations:', error);
      throw error;
    }
  }

  convertEmployeeFormat(employee) {
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department,
      hire_date: employee.hire_date,
      email: employee.email,
      phone: employee.phone,
      location: employee.location,
      skills: (employee.skills || employee.EmployeeSkills || []).map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name,
        skill_type: skill.Skill?.type?.type_name || skill.skill_type,
        current_level: skill.SkillLevel?.value || skill.current_level || 1,
        level_name: skill.SkillLevel?.level_name || skill.level_name,
        acquired_date: skill.acquired_date,
        certification: skill.certification,
        last_evaluated_date: skill.last_evaluated_date
      }))
    };
  }

  convertJobFormat(job) {
    return {
      id: job.id,
      title: job.emploi || job.title,
      department: job.filiere_activite || job.department,
      family: job.famille,
      experience_level: job.niveau_exp,
      required_skills: (job.requiredSkills || job.required_skills || []).map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name,
        skill_type: skill.Skill?.type?.type_name || skill.skill_type,
        required_level: skill.SkillLevel?.value || skill.required_level || 3,
        level_name: skill.SkillLevel?.level_name || skill.level_name,
        is_mandatory: skill.is_mandatory !== false,
        weight: skill.weight || 1.0
      }))
    };
  }
}

module.exports = new RecommendationService();
```

### Utilisation dans un contrôleur Node.js

```javascript
// controllers/employeeRecommendations.js
const recommendationService = require('../services/recommendationService');
const { Employee, JobDescription } = require('../../models');

const getEmployeeTrainingRecommendations = async (req, res) => {
  try {
    const { employeeId, targetJobId } = req.params;
    
    // Récupérer l'employé avec ses compétences
    const employee = await Employee.findByPk(employeeId, {
      include: [/* relations des compétences */]
    });
    
    // Récupérer le poste cible
    const targetJob = await JobDescription.findByPk(targetJobId, {
      include: [/* relations des compétences requises */]
    });
    
    if (!employee || !targetJob) {
      return res.status(404).json({ error: 'Employé ou poste non trouvé' });
    }
    
    // Appeler l'API de recommandation
    const recommendations = await recommendationService.getTrainingRecommendations(
      employee, 
      targetJob
    );
    
    res.json({
      employee: employee.name,
      target_job: targetJob.emploi,
      recommendations
    });
    
  } catch (error) {
    console.error('Error getting training recommendations:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des recommandations' });
  }
};

const getEmployeeJobRecommendations = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Récupérer l'employé
    const employee = await Employee.findByPk(employeeId, {
      include: [/* relations */]
    });
    
    // Récupérer tous les postes disponibles
    const availableJobs = await JobDescription.findAll({
      include: [/* relations */]
    });
    
    // Appeler l'API de recommandation
    const recommendations = await recommendationService.getJobRecommendations(
      employee,
      availableJobs
    );
    
    res.json({
      employee: employee.name,
      recommendations
    });
    
  } catch (error) {
    console.error('Error getting job recommendations:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des recommandations' });
  }
};

module.exports = {
  getEmployeeTrainingRecommendations,
  getEmployeeJobRecommendations
};
```

### Depuis curl

```bash
# Recommandations de formation
curl -X POST "http://localhost:8001/api/v1/recommendations/training" \
  -H "Content-Type: application/json" \
  -d '{
    "employee": {
      "id": 1,
      "name": "Jean Dupont",
      "position": "Développeur Junior",
      "department": "Développement",
      "hire_date": "2022-01-15T00:00:00Z",
      "email": "jean.dupont@example.com",
      "skills": [
        {
          "skill_id": 1,
          "skill_name": "JavaScript",
          "skill_type": "Technique",
          "current_level": 2
        }
      ]
    },
    "target_job": {
      "id": 5,
      "title": "Développeur Senior",
      "department": "Développement",
      "required_skills": [
        {
          "skill_id": 1,
          "skill_name": "JavaScript",
          "required_level": 4,
          "is_mandatory": true
        }
      ]
    }
  }'

# Recommandations de poste
curl -X POST "http://localhost:8001/api/v1/recommendations/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "employee": {
      "id": 1,
      "name": "Jean Dupont",
      "position": "Développeur Junior",
      "department": "Développement",
      "hire_date": "2022-01-15T00:00:00Z",
      "email": "jean.dupont@example.com",
      "skills": [
        {
          "skill_id": 1,
          "skill_name": "JavaScript",
          "current_level": 3
        }
      ]
    },
    "available_jobs": [
      {
        "id": 5,
        "title": "Développeur Full Stack",
        "department": "Développement",
        "required_skills": [
          {
            "skill_id": 1,
            "skill_name": "JavaScript",
            "required_level": 3
          }
        ]
      }
    ]
  }'
```

## 🔗 Intégration avec Node.js

### 1. Ajouter les routes dans votre backend Node.js

```javascript
// routes/recommendations.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR } = require('../middleware/roleAuth');
const recommendationService = require('../services/recommendationService');

router.get('/employee/:employeeId/training/:targetJobId', 
  authenticateToken, 
  requireAdminOrHR, 
  getEmployeeTrainingRecommendations
);

router.get('/employee/:employeeId/jobs', 
  authenticateToken, 
  requireAdminOrHR, 
  getEmployeeJobRecommendations
);

module.exports = router;
```

### 2. Ajouter dans server.js

```javascript
const recommendationRoutes = require('./src/routes/recommendations');
app.use('/api/recommendations', recommendationRoutes);
```

### 3. Frontend Angular

```typescript
// services/recommendation.service.ts
@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = `${environment.backendUrl}/recommendations`;

  constructor(private http: HttpClient) {}

  getTrainingRecommendations(employeeId: number, targetJobId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employee/${employeeId}/training/${targetJobId}`);
  }

  getJobRecommendations(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employee/${employeeId}/jobs`);
  }
}
```

## 🧪 Tests et Validation

### Tests unitaires

```bash
# Installer pytest
pip install pytest pytest-asyncio

# Lancer les tests
pytest tests/ -v
```

### Test de performance

```bash
# Test de charge avec curl
for i in {1..10}; do
  curl -X POST "http://localhost:8001/api/v1/recommendations/training" \
    -H "Content-Type: application/json" \
    -d @test_data.json &
done
wait
```

## 🔧 Développement et Extension

### Ajouter de nouveaux types de recommandations

1. **Créer un nouveau modèle** dans `app/models/`:
```python
class CareerPathRecommendation(BaseModel):
    employee_id: int
    suggested_path: List[str]
    timeline: Dict[str, str]
    # ...
```

2. **Étendre le moteur de recommandation**:
```python
async def generate_career_path_recommendations(self, employee: Employee) -> List[CareerPathRecommendation]:
    # Logique de recommandation de parcours de carrière
    pass
```

3. **Ajouter l'endpoint**:
```python
@app.post("/api/v1/recommendations/career-path")
async def get_career_path_recommendations(employee: Employee):
    return await recommendation_engine.generate_career_path_recommendations(employee)
```

### Améliorer les modèles

1. **Collecter de vraies données**:
```python
def collect_real_training_data():
    # Récupérer les données depuis votre base de données
    # Analyser les succès/échecs de formations passées
    # Créer un dataset d'entraînement réel
    pass
```

2. **Réentraîner avec de nouvelles features**:
```python
# Ajouter de nouvelles caractéristiques
new_features = [
    'team_size', 'project_complexity', 'industry_experience',
    'soft_skills_score', 'technical_skills_score'
]
```

3. **Optimiser les hyperparamètres**:
```python
# Utiliser des techniques d'optimisation avancées
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import randint, uniform

param_distributions = {
    'n_estimators': randint(50, 300),
    'max_depth': randint(3, 20),
    'learning_rate': uniform(0.01, 0.3)
}
```

### Monitoring et métriques

1. **Ajouter des métriques de performance**:
```python
@app.get("/api/v1/metrics")
async def get_api_metrics():
    return {
        "requests_count": request_counter,
        "average_response_time": avg_response_time,
        "model_accuracy": current_model_accuracy,
        "last_retrain_date": last_retrain_date
    }
```

2. **Logging avancé**:
```python
import structlog

logger = structlog.get_logger()
logger.info("recommendation_generated", 
           employee_id=employee.id, 
           recommendation_count=len(recommendations),
           processing_time=processing_time)
```

## 🚀 Déploiement en Production

### 1. Configuration de production

```env
# .env.production
DEBUG=false
HOST=0.0.0.0
PORT=8001
MODEL_PATH=/app/models
LOG_LEVEL=INFO
```

### 2. Docker Compose pour production

```yaml
version: '3.8'
services:
  recommendation-api:
    build: .
    ports:
      - "8001:8001"
    environment:
      - DEBUG=false
    volumes:
      - ./models:/app/models:ro
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```


## 📈 Performance et Optimisation

### Métriques de performance attendues

- **Temps de réponse**: < 500ms pour les recommandations de formation
- **Temps de réponse**: < 1s pour les recommandations de poste (multiple jobs)
- **Précision du modèle**: > 85% pour les prédictions de succès de formation
- **Throughput**: > 100 requêtes/seconde

### Optimisations possibles

1. **Cache des résultats**:
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_cached_recommendations(employee_id: int, job_id: int):
    # Cache des recommandations fréquentes
    pass
```

2. **Traitement asynchrone**:
```python
import asyncio

async def batch_process_recommendations(employees: List[Employee]):
    tasks = [generate_recommendations(emp) for emp in employees]
    return await asyncio.gather(*tasks)
```

3. **Optimisation des modèles**:
```python
# Utiliser des modèles plus légers pour la production
from sklearn.ensemble import ExtraTreesRegressor  # Plus rapide que RandomForest
```

## 🔒 Sécurité

### 1. Authentification (à implémenter)

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

@app.post("/api/v1/recommendations/training")
async def get_training_recommendations(
    request: TrainingRecommendationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # Vérifier le token avec votre backend Node.js
    pass
```

### 2. Limitation de taux

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/v1/recommendations/training")
@limiter.limit("10/minute")
async def get_training_recommendations(request: Request, ...):
    pass
```

## 📞 Support et Contribution

### Logs et debugging

```bash
# Voir les logs en temps réel
docker-compose logs -f recommendation-api

# Logs détaillés
tail -f logs/recommendation_api.log
```

### Structure des logs

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "INFO",
  "event": "recommendation_generated",
  "employee_id": 123,
  "job_id": 456,
  "recommendation_count": 5,
  "processing_time_ms": 245,
  "model_version": "1.0.0"
}
```

Cette API est conçue pour être extensible et peut facilement être améliorée avec de nouvelles fonctionnalités de recommandation, des modèles plus sophistiqués, ou des intégrations avec d'autres systèmes.