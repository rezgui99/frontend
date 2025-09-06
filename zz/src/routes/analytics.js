const express = require("express");
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR } = require('../middleware/roleAuth');

const {
  getAnalyticsOverview,
  getEmployeeSkillRecommendations,
  predictApplicationSuccess,
  getDepartmentStatistics,
  getContractTypeStatistics,
  getSkillsDemandAnalysis,
  predictMultipleApplications
} = require("../controllers/analytics");

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes analytics (Admin et HR)
router.get("/overview", requireAdminOrHR, getAnalyticsOverview);
router.get("/departments", requireAdminOrHR, getDepartmentStatistics);
router.get("/contract-types", requireAdminOrHR, getContractTypeStatistics);
router.get("/skills-demand", requireAdminOrHR, getSkillsDemandAnalysis);

// Recommandations pour un employé spécifique
router.get("/employee/:employeeId/recommendations", requireAdminOrHR, getEmployeeSkillRecommendations);

// Prédiction de succès
router.post("/predict-success", requireAdminOrHR, predictApplicationSuccess);

// Prédictions en lot
router.post("/predict-success/batch", requireAdminOrHR, predictMultipleApplications);

module.exports = router;