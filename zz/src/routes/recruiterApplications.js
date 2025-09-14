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
  bulkUpdateApplications,
  getApplicationDetails,
  downloadCandidateCV,
  getAvailableApplicationsForInterview
} = require('../controllers/recruiterApplications');

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`🛣️  RecruiterApplications route: ${req.method} ${req.path}`);
  console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('👤 User in request:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Body params:', req.body);
  next();
});

// Toutes les routes nécessitent une authentification admin/HR
router.use(authenticateToken);
router.use(requireAdminOrHR);

// Test route pour vérifier la connectivité
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Recruiter applications route is working',
    user: req.user ? req.user.username : 'No user',
    timestamp: new Date().toISOString()
  });
});

router.get('/job-offer/:job_offer_id', getApplicationsForJobOffer);
router.get('/', getAllApplications);
router.get('/statistics', getApplicationStatistics);
router.get('/available-for-interview', getAvailableApplicationsForInterview);
router.get('/:id/details', getApplicationDetails);
router.get('/cv/:cv_id/download', downloadCandidateCV);
router.put('/:id/status', updateApplicationStatus);
router.put('/:id/schedule-interview', scheduleInterview);
router.put('/bulk-update', bulkUpdateApplications);

module.exports = router;