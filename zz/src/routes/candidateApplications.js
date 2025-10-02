const express = require("express");
const router = express.Router();
const { authenticateCandidateToken } = require('../middleware/candidateAuth');
const {
  applyToJobOffer,
  getCandidateApplications,
  getApplicationById,
} = require('../controllers/candidateApplication');

// Toutes les routes nécessitent une authentification candidat
router.use(authenticateCandidateToken);

router.post('/apply', applyToJobOffer);
router.get('/', getCandidateApplications);
router.get('/:id', getApplicationById);
// Note: withdrawApplication n'est pas implémenté dans le controller

module.exports = router;