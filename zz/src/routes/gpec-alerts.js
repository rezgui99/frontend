const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR } = require('../middleware/roleAuth');

const {
  getGPECDashboard,
  getAllAlerts,
  analyzeDepartureRisks,
  analyzeSkillGaps,
  predictTrainingNeeds,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  runAutomaticAnalysis,
  getConfiguration,
  generateGPECReport
} = require('../controllers/gpec-alerts');

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`🛣️  GPEC route: ${req.method} ${req.path}`);
  console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('👤 User in request:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
  next();
});

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);
router.use(requireAdminOrHR);

// === ROUTES PRINCIPALES ===
router.get('/dashboard', getGPECDashboard);
router.get('/alerts', getAllAlerts);
router.get('/configuration', getConfiguration);

// === ANALYSES PRÉDICTIVES ===
router.get('/predictions/departure-risks', analyzeDepartureRisks);
router.get('/analysis/skill-gaps', analyzeSkillGaps);
router.get('/predictions/training-needs', predictTrainingNeeds);

// === ACTIONS SUR LES ALERTES ===
router.patch('/alerts/:alertId/acknowledge', acknowledgeAlert);
router.patch('/alerts/:alertId/resolve', resolveAlert);
router.patch('/alerts/:alertId/dismiss', dismissAlert);

// === ANALYSE AUTOMATIQUE ===
router.post('/analysis/run-automatic', runAutomaticAnalysis);

// === RAPPORTS ===
router.post('/reports/generate', generateGPECReport);

// === ROUTES DE TEST ===
router.get('/test/generate-sample-alerts', (req, res) => {
  // Générer des alertes de test
  const sampleAlerts = [
    {
      type: 'critical_skills_shortage',
      skill: 'Intelligence Artificielle',
      current: 2,
      needed: 5
    },
    {
      type: 'departure_risk',
      employee: 'Marie Martin',
      risk_score: 85
    },
    {
      type: 'department_gap',
      department: 'IT',
      gap_percentage: 45
    }
  ];

  res.json({
    message: 'Alertes de test générées',
    alerts: sampleAlerts
  });
});

module.exports = router;