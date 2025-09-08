const express = require("express");
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR } = require('../middleware/roleAuth');
const {
  getApplicationsForJobOffer,
  getAllApplications,
  updateApplicationStatus,
  scheduleInterview,
  getApplicationStatistics,
  bulkUpdateApplications
} = require('../controllers/recruiterApplications');

// Toutes les routes nécessitent une authentification admin/HR
router.use(authenticateToken);
router.use(requireAdminOrHR);

router.get('/job-offer/:job_offer_id', getApplicationsForJobOffer);
router.get('/', getAllApplications);
router.get('/statistics', getApplicationStatistics);
router.put('/:id/status', updateApplicationStatus);
router.put('/:id/schedule-interview', scheduleInterview);
router.put('/bulk-update', bulkUpdateApplications);

module.exports = router;