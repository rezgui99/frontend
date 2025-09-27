#!/usr/bin/env python3
"""
Script de test pour l'API de recommandation.
Teste tous les endpoints avec des données d'exemple.

Usage:
    python examples/test_api.py
"""

import asyncio
import httpx
import json
import time
from datetime import datetime, timedelta

API_BASE_URL = "http://localhost:8001"

# Données d'exemple
SAMPLE_EMPLOYEE = {
    "id": 1,
    "name": "Jean Dupont",
    "position": "Développeur Junior",
    "department": "Développement",
    "hire_date": "2022-01-15T00:00:00Z",
    "email": "jean.dupont@example.com",
    "phone": "+33123456789",
    "location": "Paris",
    "skills": [
        {
            "skill_id": 1,
            "skill_name": "JavaScript",
            "skill_type": "Technique",
            "current_level": 2,
            "level_name": "Junior",
            "acquired_date": "2022-02-01T00:00:00Z",
            "certification": None,
            "years_experience": 2
        },
        {
            "skill_id": 2,
            "skill_name": "Communication",
            "skill_type": "Communication",
            "current_level": 3,
            "level_name": "Autonome",
            "acquired_date": "2021-06-01T00:00:00Z",
            "certification": "Communication Efficace",
            "years_experience": 3
        },
        {
            "skill_id": 3,
            "skill_name": "Gestion de projet",
            "skill_type": "Managériale",
            "current_level": 1,
            "level_name": "Débutant",
            "acquired_date": "2023-01-01T00:00:00Z",
            "certification": None,
            "years_experience": 1
        }
    ]
}

SAMPLE_TARGET_JOB = {
    "id": 5,
    "title": "Développeur Senior",
    "department": "Développement",
    "family": "Technique",
    "experience_level": "Senior",
    "required_skills": [
        {
            "skill_id": 1,
            "skill_name": "JavaScript",
            "skill_type": "Technique",
            "required_level": 4,
            "level_name": "Avancé",
            "is_mandatory": True,
            "weight": 1.5
        },
        {
            "skill_id": 2,
            "skill_name": "Communication",
            "skill_type": "Communication",
            "required_level": 3,
            "level_name": "Autonome",
            "is_mandatory": True,
            "weight": 1.0
        },
        {
            "skill_id": 3,
            "skill_name": "Gestion de projet",
            "skill_type": "Managériale",
            "required_level": 3,
            "level_name": "Autonome",
            "is_mandatory": False,
            "weight": 1.2
        }
    ]
}

SAMPLE_AVAILABLE_JOBS = [
    SAMPLE_TARGET_JOB,
    {
        "id": 6,
        "title": "Lead Developer",
        "department": "Développement",
        "family": "Technique",
        "experience_level": "Expert",
        "required_skills": [
            {
                "skill_id": 1,
                "skill_name": "JavaScript",
                "skill_type": "Technique",
                "required_level": 5,
                "level_name": "Expert",
                "is_mandatory": True,
                "weight": 2.0
            },
            {
                "skill_id": 3,
                "skill_name": "Gestion de projet",
                "skill_type": "Managériale",
                "required_level": 4,
                "level_name": "Avancé",
                "is_mandatory": True,
                "weight": 1.8
            }
        ]
    },
    {
        "id": 7,
        "title": "Développeur Frontend",
        "department": "Développement",
        "family": "Technique",
        "experience_level": "Confirmé",
        "required_skills": [
            {
                "skill_id": 1,
                "skill_name": "JavaScript",
                "skill_type": "Technique",
                "required_level": 3,
                "level_name": "Autonome",
                "is_mandatory": True,
                "weight": 1.5
            },
            {
                "skill_id": 2,
                "skill_name": "Communication",
                "skill_type": "Communication",
                "required_level": 2,
                "level_name": "Junior",
                "is_mandatory": False,
                "weight": 0.8
            }
        ]
    }
]

async def test_api_health():
    """Tester l'état de santé de l'API"""
    print("🏥 Testing API health...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_BASE_URL}/health")
            if response.status_code == 200:
                health_data = response.json()
                print("✅ API is healthy")
                print(f"   Status: {health_data['status']}")
                print(f"   Models initialized: {health_data['models']}")
                return True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Cannot connect to API: {e}")
            return False

async def test_training_recommendations():
    """Tester les recommandations de formation"""
    print("\n🎓 Testing training recommendations...")
    
    request_data = {
        "employee": SAMPLE_EMPLOYEE,
        "target_job": SAMPLE_TARGET_JOB,
        "max_recommendations": 5,
        "priority_threshold": 0.3
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            start_time = time.time()
            response = await client.post(
                f"{API_BASE_URL}/api/v1/recommendations/training",
                json=request_data
            )
            end_time = time.time()
            
            if response.status_code == 200:
                recommendations = response.json()
                print(f"✅ Training recommendations received ({end_time - start_time:.2f}s)")
                print(f"   Number of recommendations: {len(recommendations)}")
                
                for i, rec in enumerate(recommendations, 1):
                    print(f"\n   {i}. {rec['skill_name']} ({rec['skill_type']})")
                    print(f"      Current level: {rec['current_level']} → Target: {rec['target_level']}")
                    print(f"      Priority: {rec['priority']} (Score: {rec['priority_score']:.3f})")
                    print(f"      Training: {rec['training_type']}")
                    print(f"      Duration: {rec['estimated_duration_hours']}h")
                    print(f"      Success probability: {rec['success_probability']:.3f}")
                    print(f"      ROI estimate: {rec['roi_estimate']:.2f}")
                    print(f"      Justification: {rec['justification']}")
                
                return True
            else:
                print(f"❌ Training recommendations failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing training recommendations: {e}")
            return False

async def test_job_recommendations():
    """Tester les recommandations de poste"""
    print("\n💼 Testing job recommendations...")
    
    request_data = {
        "employee": SAMPLE_EMPLOYEE,
        "available_jobs": SAMPLE_AVAILABLE_JOBS,
        "max_recommendations": 10,
        "min_compatibility_score": 0.3
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            start_time = time.time()
            response = await client.post(
                f"{API_BASE_URL}/api/v1/recommendations/jobs",
                json=request_data
            )
            end_time = time.time()
            
            if response.status_code == 200:
                recommendations = response.json()
                print(f"✅ Job recommendations received ({end_time - start_time:.2f}s)")
                print(f"   Number of recommendations: {len(recommendations)}")
                
                for i, rec in enumerate(recommendations, 1):
                    print(f"\n   {i}. {rec['job_title']} ({rec['department']})")
                    print(f"      Compatibility score: {rec['compatibility_score']:.3f}")
                    print(f"      Skill match: {rec['skill_match_score']:.3f}")
                    print(f"      Experience match: {rec['experience_match_score']:.3f}")
                    print(f"      Readiness: {rec['readiness_level']}")
                    print(f"      Growth potential: {rec['growth_potential']:.3f}")
                    print(f"      Estimated transition: {rec['estimated_transition_time']}")
                    print(f"      Salary potential: {rec['salary_potential']['min']}€ - {rec['salary_potential']['max']}€")
                    print(f"      Reason: {rec['recommendation_reason']}")
                    
                    if rec['missing_skills']:
                        print(f"      Missing skills: {len(rec['missing_skills'])}")
                        for skill in rec['missing_skills'][:3]:
                            print(f"        - {skill['skill_name']}: gap of {skill['gap']}")
                
                return True
            else:
                print(f"❌ Job recommendations failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing job recommendations: {e}")
            return False

async def test_model_status():
    """Tester le statut des modèles"""
    print("\n🔍 Testing model status...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_BASE_URL}/api/v1/models/status")
            if response.status_code == 200:
                status = response.json()
                print("✅ Model status retrieved")
                print(f"   Initialized: {status['initialized']}")
                print(f"   Training model loaded: {status['training_model_loaded']}")
                print(f"   Job matching model loaded: {status['job_matching_model_loaded']}")
                print(f"   Skill similarity matrix loaded: {status['skill_similarity_matrix_loaded']}")
                return True
            else:
                print(f"❌ Model status failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error testing model status: {e}")
            return False

async def test_data_validation():
    """Tester la validation des données"""
    print("\n✅ Testing data validation...")
    
    # Test avec des données valides
    valid_data = {
        "employee": SAMPLE_EMPLOYEE,
        "target_job": SAMPLE_TARGET_JOB
    }
    
    # Test avec des données invalides
    invalid_data = {
        "employee": {
            "id": 1,
            "name": "",  # Nom vide
            "skills": [
                {
                    "skill_id": 1,
                    "current_level": 6  # Niveau invalide
                }
            ]
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Test données valides
            response = await client.post(
                f"{API_BASE_URL}/api/v1/data/validate",
                json=valid_data
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Valid data test: {result['valid']}")
                if result['suggestions']:
                    print(f"   Suggestions: {len(result['suggestions'])}")
                    for suggestion in result['suggestions']:
                        print(f"     - {suggestion}")
            
            # Test données invalides
            response = await client.post(
                f"{API_BASE_URL}/api/v1/data/validate",
                json=invalid_data
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Invalid data test: {result['valid']}")
                if result['errors']:
                    print(f"   Errors found: {len(result['errors'])}")
                    for error in result['errors']:
                        print(f"     - {error}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error testing data validation: {e}")
            return False

async def performance_test():
    """Test de performance avec requêtes multiples"""
    print("\n⚡ Running performance test...")
    
    request_data = {
        "employee": SAMPLE_EMPLOYEE,
        "target_job": SAMPLE_TARGET_JOB,
        "max_recommendations": 3
    }
    
    num_requests = 10
    start_time = time.time()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = []
        for i in range(num_requests):
            task = client.post(
                f"{API_BASE_URL}/api/v1/recommendations/training",
                json=request_data
            )
            tasks.append(task)
        
        try:
            responses = await asyncio.gather(*tasks)
            end_time = time.time()
            
            successful_requests = sum(1 for r in responses if r.status_code == 200)
            total_time = end_time - start_time
            avg_time = total_time / num_requests
            
            print(f"✅ Performance test completed")
            print(f"   Total requests: {num_requests}")
            print(f"   Successful: {successful_requests}")
            print(f"   Total time: {total_time:.2f}s")
            print(f"   Average time per request: {avg_time:.3f}s")
            print(f"   Requests per second: {num_requests / total_time:.2f}")
            
            return True
            
        except Exception as e:
            print(f"❌ Performance test failed: {e}")
            return False

async def main():
    """Fonction principale de test"""
    print("🧪 SmartHire ML Recommendation API - Test Suite")
    print("=" * 60)
    
    # Attendre que l'API soit prête
    print("⏳ Waiting for API to be ready...")
    for attempt in range(10):
        if await test_api_health():
            break
        print(f"   Attempt {attempt + 1}/10 - Waiting 3s...")
        await asyncio.sleep(3)
    else:
        print("❌ API is not responding. Make sure it's running on port 8001")
        return
    
    # Exécuter tous les tests
    tests = [
        ("Model Status", test_model_status),
        ("Data Validation", test_data_validation),
        ("Training Recommendations", test_training_recommendations),
        ("Job Recommendations", test_job_recommendations),
        ("Performance Test", performance_test)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Résumé des résultats
    print(f"\n{'='*60}")
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name:.<40} {status}")
        if success:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All tests passed! The API is working correctly.")
    else:
        print(f"\n⚠️  {len(results) - passed} test(s) failed. Check the logs above.")
    
    print("\n📚 Next steps:")
    print("1. Check the API documentation at: http://localhost:8001/docs")
    print("2. Integrate with your Node.js backend using the examples in README.md")
    print("3. Customize the models and training data for your specific use case")

if __name__ == "__main__":
    asyncio.run(main())