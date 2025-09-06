const express = require("express");
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR, auditAction } = require('../middleware/roleAuth');

const {
  findAllJobOffers,
  findJobOfferById,
  createJobOffer,
  updateJobOffer,
  deleteJobOffer,
  publishJobOffer,
  closeJobOffer,
  getJobOfferStatistics,
  duplicateJobOffer
} = require("../controllers/joboffer");

// Routes publiques (pour les candidats)
router.get("/public", findAllJobOffers); // Offres publiées seulement
router.get("/public/:id", findJobOfferById);

// Routes protégées (pour les RH et admins)
router.use(authenticateToken); // Toutes les routes suivantes nécessitent une authentification

router.get("/", requireAdminOrHR, findAllJobOffers);
router.get("/statistics", requireAdminOrHR, getJobOfferStatistics);
router.get("/:id", requireAdminOrHR, findJobOfferById);
router.post("/", requireAdminOrHR, auditAction('CREATE', 'JobOffers'), createJobOffer);
router.put("/:id", requireAdminOrHR, auditAction('UPDATE', 'JobOffers'), updateJobOffer);
router.delete("/:id", requireAdminOrHR, auditAction('DELETE', 'JobOffers'), deleteJobOffer);
router.patch("/:id/publish", requireAdminOrHR, auditAction('UPDATE', 'JobOffers'), publishJobOffer);
router.patch("/:id/close", requireAdminOrHR, auditAction('UPDATE', 'JobOffers'), closeJobOffer);
router.post("/:id/duplicate", requireAdminOrHR, auditAction('CREATE', 'JobOffers'), duplicateJobOffer);

module.exports = router;