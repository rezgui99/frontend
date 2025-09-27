const express = require("express");
const router = express.Router();
const { authenticateCandidateToken } = require('../middleware/candidateAuth');
const {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorite
} = require('../controllers/candidateFavorites');

// Toutes les routes nécessitent une authentification candidat
router.use(authenticateCandidateToken);

router.get('/', getFavorites);
router.post('/', addToFavorites);
router.delete('/:job_offer_id', removeFromFavorites);
router.get('/:job_offer_id/check', isFavorite);

module.exports = router;