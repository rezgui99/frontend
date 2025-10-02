const express = require("express");
const router = express.Router();
const {
  getPublicJobOffers,
  getPublicJobOfferById,
  getFilterOptions,
  getJobOfferStats
} = require('../controllers/publicJobOffers');

// Routes publiques (pas d'authentification requise)
router.get('/', getPublicJobOffers);
router.get('/stats', getJobOfferStats);
router.get('/filters', getFilterOptions);
router.get('/:id', getPublicJobOfferById);

module.exports = router;