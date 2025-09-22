const express = require('express');
const router = express.Router();
const recommendation = require('../controllers/recommendation');
const { authenticateToken } = require('../middleware/auth');

// Routes de recommandation
router.get('/training/:employeeId/:targetJobId', 
  authenticateToken,
  recommendation.getTrainingRecommendations
);

router.get('/jobs/:employeeId',
  authenticateToken,
  recommendation.getJobRecommendations
);

module.exports = router;