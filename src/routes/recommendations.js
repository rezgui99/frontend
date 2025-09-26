const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR } = require('../middleware/roleAuth');
const {
  checkRecommendationAPIHealth,
  getTrainingRecommendations,
  getEmployeeJobRecommendations,
  validateRecommendationData,
  getModelStatus,
  retrainModels
} = require('../controllers/recommendations');

/**
 * @swagger
 * /api/recommendations/health:
 *   get:
 *     summary: Vérifier la santé de l'API de recommandation
 *     tags: [Recommendations]
 *     responses:
 *       200:
 *         description: Statut de santé de l'API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ml_api:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     api_url:
 *                       type: string
 *                     models:
 *                       type: object
 *                 backend_status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/health', checkRecommendationAPIHealth);

/**
 * @swagger
 * /api/recommendations/training/{employeeId}/{jobId}:
 *   get:
 *     summary: Obtenir des recommandations de formation pour un employé vers un poste spécifique
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'employé
 *         example: 53
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du poste cible
 *         example: 73
 *       - in: query
 *         name: maxRecommendations
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Nombre maximum de recommandations
 *       - in: query
 *         name: priorityThreshold
 *         schema:
 *           type: number
 *           default: 0.6
 *         description: Seuil de priorité minimum
 *     responses:
 *       200:
 *         description: Recommandations de formation générées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeId:
 *                   type: integer
 *                   example: 53
 *                 jobId:
 *                   type: integer
 *                   example: 73
 *                 employee:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     position:
 *                       type: string
 *                     department:
 *                       type: string
 *                 targetJob:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     department:
 *                       type: string
 *                     family:
 *                       type: string
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       skill:
 *                         type: string
 *                         example: "Java"
 *                       skillType:
 *                         type: string
 *                         example: "Technique"
 *                       currentLevel:
 *                         type: string
 *                         example: "Intermediate"
 *                       requiredLevel:
 *                         type: string
 *                         example: "Advanced"
 *                       gap:
 *                         type: integer
 *                         example: 1
 *                       training:
 *                         type: string
 *                         example: "Formation Java Avancée"
 *                       trainingType:
 *                         type: string
 *                         example: "Formation en ligne"
 *                       estimatedDuration:
 *                         type: string
 *                         example: "40-60 heures"
 *                       priority:
 *                         type: string
 *                         example: "Élevée"
 *                       description:
 *                         type: string
 *                       estimatedCost:
 *                         type: number
 *                         example: 1200
 *                 totalRecommendations:
 *                   type: integer
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Employé ou poste non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 employeeId:
 *                   type: integer
 *                 jobId:
 *                   type: integer
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 *                 employeeId:
 *                   type: integer
 *                 jobId:
 *                   type: integer
 */
router.get('/training/:employeeId/:jobId', 
  authenticateToken, 
  requireAdminOrHR, 
  getTrainingRecommendations
);

/**
 * @swagger
 * /api/recommendations/employee/{employeeId}/jobs:
 *   get:
 *     summary: Obtenir des recommandations de poste pour un employé
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'employé
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filtrer par département
 *       - in: query
 *         name: maxRecommendations
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre maximum de recommandations
 *       - in: query
 *         name: minCompatibilityScore
 *         schema:
 *           type: number
 *           default: 0.5
 *         description: Score de compatibilité minimum
 *     responses:
 *       200:
 *         description: Recommandations de poste générées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employee:
 *                   type: object
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       404:
 *         description: Employé non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/employee/:employeeId/jobs', 
  authenticateToken, 
  requireAdminOrHR, 
  getEmployeeJobRecommendations
);

/**
 * @swagger
 * /api/recommendations/validate:
 *   post:
 *     summary: Valider les données avant envoi à l'API ML
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employee:
 *                 type: object
 *               target_job:
 *                 type: object
 *               available_jobs:
 *                 type: array
 *     responses:
 *       200:
 *         description: Résultat de la validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 errors:
 *                   type: array
 *                 suggestions:
 *                   type: array
 */
router.post('/validate', 
  authenticateToken, 
  requireAdminOrHR, 
  validateRecommendationData
);

/**
 * @swagger
 * /api/recommendations/models/status:
 *   get:
 *     summary: Obtenir le statut des modèles ML
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statut des modèles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 models:
 *                   type: object
 *                 timestamp:
 *                   type: string
 */
router.get('/models/status', 
  authenticateToken, 
  requireAdminOrHR, 
  getModelStatus
);

/**
 * @swagger
 * /api/recommendations/models/retrain:
 *   post:
 *     summary: Réentraîner les modèles ML
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Réentraînement terminé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 *                 timestamp:
 *                   type: string
 */
router.post('/models/retrain', 
  authenticateToken, 
  requireAdminOrHR, 
  retrainModels
);

module.exports = router;