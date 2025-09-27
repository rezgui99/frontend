const recommendationService = require('../services/recommendationService');

/**
 * Middleware pour vérifier la santé des services externes
 */
const checkExternalServices = async (req, res, next) => {
  try {
    // Vérifier l'API de recommandation seulement si nécessaire
    if (req.path.includes('/recommendations/') && !req.path.includes('/health')) {
      const healthStatus = await recommendationService.checkHealth();
      
      if (healthStatus.status !== 'healthy') {
        return res.status(503).json({
          error: 'Service de recommandation indisponible',
          details: 'L\'API de machine learning n\'est pas accessible',
          ml_api_status: healthStatus,
          suggestion: 'Vérifiez que l\'API de recommandation est démarrée sur le port 8001'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ External service check failed:', error);
    next(); // Continuer même si la vérification échoue
  }
};

/**
 * Endpoint de santé global du backend
 */
const globalHealthCheck = async (req, res) => {
  try {
    const healthChecks = {
      backend: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        node_version: process.version
      }
    };

    // Vérifier la base de données
    try {
      const { sequelize } = require('../models');
      await sequelize.authenticate();
      healthChecks.database = {
        status: 'healthy',
        connection: 'active'
      };
    } catch (dbError) {
      healthChecks.database = {
        status: 'unhealthy',
        error: dbError.message
      };
    }

    // Vérifier l'API de recommandation
    try {
      const mlApiHealth = await recommendationService.checkHealth();
      healthChecks.ml_api = mlApiHealth;
    } catch (mlError) {
      healthChecks.ml_api = {
        status: 'unhealthy',
        error: mlError.message,
        api_url: process.env.ML_API_URL
      };
    }

    // Déterminer le statut global
    const allHealthy = Object.values(healthChecks).every(service => 
      service.status === 'healthy'
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: healthChecks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Global health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  checkExternalServices,
  globalHealthCheck
};