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

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`🛣️  RecruiterApplications route: ${req.method} ${req.path}`);
  console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('👤 User in request:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
  next();
});

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