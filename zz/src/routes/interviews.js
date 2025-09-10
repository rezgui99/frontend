const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR, auditAction } = require('../middleware/roleAuth');

const {
  getAllInterviews,
  scheduleInterview,
  updateInterview,
  cancelInterview,
  completeInterview,
  rescheduleInterview,
  getInterviewStatistics,
  getUpcomingInterviews
} = require('../controllers/interviews');

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`🛣️  Interview route: ${req.method} ${req.path}`);
  console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('👤 User in request:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
  next();
});

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);
router.use(requireAdminOrHR);

// Routes principales
router.get('/', getAllInterviews);
router.get('/statistics', getInterviewStatistics);
router.get('/upcoming', getUpcomingInterviews);
router.post('/', auditAction('CREATE', 'Interviews'), scheduleInterview);
router.put('/:id', auditAction('UPDATE', 'Interviews'), updateInterview);
router.patch('/:id/complete', auditAction('UPDATE', 'Interviews'), completeInterview);
router.patch('/:id/reschedule', auditAction('UPDATE', 'Interviews'), rescheduleInterview);
router.patch('/:id/cancel', auditAction('UPDATE', 'Interviews'), cancelInterview);

module.exports = router;