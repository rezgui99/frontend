const express = require('express');
const router = express.Router();

// Middleware d'authentification (si nécessaire)
// const { authenticateToken } = require('../middleware/auth');
// const { requireAdminOrHR } = require('../middleware/roleAuth');

/**
 * GET /api/recommendations/health
 * Endpoint de vérification de l'état de l'API de recommandation
 */
router.get('/health', async (req, res) => {
  try {
    // Vérifier l'état de l'API de recommandation
    const status = {
      status: "Recommendation API running",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        nodejs_backend: "healthy",
        recommendation_ml_api: "checking..."
      }
    };

    // Optionnel : Vérifier la connectivité avec l'API ML Python
    try {
      const axios = require('axios');
      const mlApiResponse = await axios.get('http://localhost:8001/health', { timeout: 5000 });
      status.services.recommendation_ml_api = "healthy";
      status.ml_api_status = mlApiResponse.data;
    } catch (mlError) {
      console.warn('ML API not available:', mlError.message);
      status.services.recommendation_ml_api = "unavailable";
      status.ml_api_error = mlError.message;
    }

    res.status(200).json(status);
  } catch (error) {
    console.error('Error in recommendations health check:', error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de la vérification de l'état",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/recommendations/employee/:employeeId/training/:targetJobId
 * Obtenir des recommandations de formation pour un employé
 */
router.get('/employee/:employeeId/training/:targetJobId', async (req, res) => {
  try {
    const { employeeId, targetJobId } = req.params;
    
    // TODO: Implémenter la logique de recommandation de formation
    // Pour l'instant, retourner une réponse de placeholder
    
    res.status(200).json({
      employee_id: parseInt(employeeId),
      target_job_id: parseInt(targetJobId),
      recommendations: [],
      message: "Training recommendations endpoint - À implémenter",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting training recommendations:', error);
    res.status(500).json({
      error: "Erreur lors de la récupération des recommandations de formation",
      message: error.message
    });
  }
});

/**
 * GET /api/recommendations/employee/:employeeId/jobs
 * Obtenir des recommandations de poste pour un employé
 */
router.get('/employee/:employeeId/jobs', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { department, limit = 10, minScore = 0.5 } = req.query;
    
    // TODO: Implémenter la logique de recommandation de poste
    // Pour l'instant, retourner une réponse de placeholder
    
    res.status(200).json({
      employee_id: parseInt(employeeId),
      filters: { department, limit: parseInt(limit), minScore: parseFloat(minScore) },
      recommendations: [],
      message: "Job recommendations endpoint - À implémenter",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting job recommendations:', error);
    res.status(500).json({
      error: "Erreur lors de la récupération des recommandations de poste",
      message: error.message
    });
  }
});

/**
 * GET /api/recommendations/status
 * Obtenir le statut général du système de recommandation
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      nodejs_api: {
        status: "running",
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      ml_api: {
        status: "checking...",
        url: "http://localhost:8001"
      }
    };

    // Vérifier l'API ML
    try {
      const axios = require('axios');
      const mlResponse = await axios.get('http://localhost:8001/health', { timeout: 3000 });
      status.ml_api.status = "healthy";
      status.ml_api.details = mlResponse.data;
    } catch (error) {
      status.ml_api.status = "unavailable";
      status.ml_api.error = error.message;
    }

    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting recommendation status:', error);
    res.status(500).json({
      error: "Erreur lors de la vérification du statut",
      message: error.message
    });
  }
});

module.exports = router;