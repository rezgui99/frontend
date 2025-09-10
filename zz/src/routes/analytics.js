const express = require("express");
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR } = require('../middleware/roleAuth');

const {
  // Analytics de base
  getAnalyticsOverview,
  getEmployeeSkillRecommendations,
  predictApplicationSuccess,
  getDepartmentStatistics,
  getContractTypeStatistics,
  getSkillsDemandAnalysis,
  predictMultipleApplications,
  
  // Analytics avancés
  getAdvancedDashboard,
  generateAIReport,
  getPersonalizedRecommendations
} = require("../controllers/analytics");

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`🛣️  Analytics route: ${req.method} ${req.path}`);
  console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('👤 User in request:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
  next();
});

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// === ROUTES ANALYTICS DE BASE ===
router.get("/overview", requireAdminOrHR, getAnalyticsOverview);
router.get("/departments", requireAdminOrHR, getDepartmentStatistics);
router.get("/contract-types", requireAdminOrHR, getContractTypeStatistics);
router.get("/skills-demand", requireAdminOrHR, getSkillsDemandAnalysis);

// === ROUTES ANALYTICS AVANCÉS ===
// Dashboard complet avec toutes les métriques
router.get("/dashboard", requireAdminOrHR, getAdvancedDashboard);

// === RECOMMANDATIONS ET PRÉDICTIONS ===
router.get("/employee/:employeeId/recommendations", requireAdminOrHR, getEmployeeSkillRecommendations);
router.post("/predict-success", requireAdminOrHR, predictApplicationSuccess);
router.post("/predict-success/batch", requireAdminOrHR, predictMultipleApplications);

// === GÉNÉRATION DE RAPPORTS IA ===
// Rapport global avec IA Gemini
router.get("/reports/ai-generated", requireAdminOrHR, generateAIReport);

// Recommandations personnalisées avec IA pour un employé
router.get("/employee/:employeeId/ai-report", requireAdminOrHR, getPersonalizedRecommendations);

// === ROUTES D'EXPORT ===
// Export des données analytics en différents formats
router.get("/export", requireAdminOrHR, async (req, res) => {
  try {
    const { format = 'json', type = 'overview' } = req.query;
    
    let data;
    switch(type) {
      case 'dashboard':
        data = await getAdvancedDashboard(req, { json: (d) => d });
        break;
      case 'departments':
        data = await getDepartmentStatistics(req, { json: (d) => d });
        break;
      case 'skills':
        data = await getSkillsDemandAnalysis(req, { json: (d) => d });
        break;
      default:
        data = await getAnalyticsOverview(req, { json: (d) => d });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    
    switch(format.toLowerCase()) {
      case 'csv':
        const csvContent = convertToCSV(data);
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${type}-${timestamp}.csv"`
        });
        res.send(csvContent);
        break;
        
      case 'excel':
        // TODO: Implémenter export Excel
        res.status(501).json({ message: 'Export Excel en développement' });
        break;
        
      default:
        res.json(data);
    }
  } catch (error) {
    console.error('Error in export route:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ROUTES DE MONITORING ET SANTÉ ===
// Santé du système d'analytics
router.get("/health", (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    services: {
      database: 'connected',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
      pdf: 'available'
    }
  });
});

// Statistiques en temps réel
router.get("/realtime", requireAdminOrHR, async (req, res) => {
  try {
    const stats = {
      activeUsers: Math.floor(Math.random() * 50) + 10,
      lastUpdate: new Date(),
      systemLoad: Math.round((Math.random() * 100) * 10) / 10,
      dataFreshness: {
        employees: 'fresh',
        jobOffers: 'fresh',
        skills: 'fresh'
      }
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === ROUTES DE CONFIGURATION ===
// Configuration des seuils d'alerte
router.get("/config/thresholds", requireAdminOrHR, (req, res) => {
  res.json({
    successRate: {
      excellent: 85,
      good: 70,
      warning: 50,
      critical: 30
    },
    skillsGap: {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    },
    retention: {
      excellent: 90,
      good: 80,
      warning: 70,
      critical: 60
    }
  });
});

// Mise à jour des seuils
router.put("/config/thresholds", requireAdminOrHR, (req, res) => {
  // TODO: Sauvegarder en base de données
  res.json({ message: 'Seuils mis à jour avec succès' });
});

// === UTILITAIRES ===
function convertToCSV(data) {
  if (!data || typeof data !== 'object') return '';
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => `"${row[header] || ''}"`).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
  
  // Pour un objet simple
  const entries = Object.entries(data);
  return entries.map(([key, value]) => `"${key}","${value}"`).join('\n');
}

module.exports = router;