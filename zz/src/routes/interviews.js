const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrHR, auditAction } = require('../middleware/roleAuth');

const {
  getAllInterviews,
  getInterviewStatistics,
  getUpcomingInterviews,
  scheduleInterview,
  updateInterview,
  cancelInterview,
  completeInterview,
  rescheduleInterview,
  confirmInterview,            
  sendInterviewConfirmation 
} = require('../controllers/interviews');

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`🛣️  Interview route: ${req.method} ${req.path}`);
  console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('👤 User in request:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
  next();
});

// Middleware d'authentification + autorisation
router.use(authenticateToken);
router.use(requireAdminOrHR);

// Routes principales
router.get('/', getAllInterviews);
router.get('/statistics', getInterviewStatistics);
router.get('/upcoming', getUpcomingInterviews);

// Route pour obtenir les types d'entretien
router.get('/interview-types', (req, res) => {
  res.json({
    phone: 'Entretien téléphonique',
    video: 'Entretien vidéo',
    in_person: 'Entretien en personne',
    technical: 'Entretien technique',
    hr: 'Entretien RH',
    final: 'Entretien final'
  });
});

router.post('/', auditAction('CREATE', 'Interviews'), scheduleInterview);
router.put('/:id', auditAction('UPDATE', 'Interviews'), updateInterview);
router.patch('/:id/confirm', auditAction('UPDATE', 'Interviews'), confirmInterview);
router.patch('/:id/complete', auditAction('UPDATE', 'Interviews'), completeInterview);
router.patch('/:id/reschedule', auditAction('UPDATE', 'Interviews'), rescheduleInterview);
router.patch('/:id/cancel', auditAction('UPDATE', 'Interviews'), cancelInterview);

// Route pour envoyer une confirmation manuelle
router.post('/:id/send-confirmation', auditAction('NOTIFY', 'Interviews'), sendInterviewConfirmation);

module.exports = router;
