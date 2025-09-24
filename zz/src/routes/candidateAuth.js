const express = require("express");
const router = express.Router();
const { authenticateCandidateToken } = require('../middleware/candidateAuth');
const {
  registerCandidate,
  loginCandidate,
  verifyCandidateEmail,
  resendCandidateVerificationCode,
  getCandidateProfile,
  updateCandidateProfile,
  forgotPasswordCandidate,
  resetPasswordCandidate
} = require('../controllers/candidateAuth');

// Public routes
router.post('/register', registerCandidate);
router.post('/login', loginCandidate);
router.post('/verify-email', verifyCandidateEmail);
router.post('/resend-verification', resendCandidateVerificationCode);
router.post('/forgot-password', forgotPasswordCandidate);
router.post('/reset-password', resetPasswordCandidate);

// Protected routes
router.get('/profile', authenticateCandidateToken, getCandidateProfile);
router.put('/profile', authenticateCandidateToken, updateCandidateProfile);

module.exports = router;