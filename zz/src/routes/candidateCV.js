const express = require("express");
const router = express.Router();
const { authenticateCandidateToken } = require('../middleware/candidateAuth');
const uploadCV = require('../middleware/uploadCV');
const {
  getCandidateCVs,
  uploadCV: uploadCVController,
  updateCV,
  deleteCV,
  setPrimaryCV,
  downloadCV
} = require('../controllers/candidateCV');

// Toutes les routes nécessitent une authentification candidat
router.use(authenticateCandidateToken);

router.get('/', getCandidateCVs);
router.post('/', uploadCV.single('cv_file'), uploadCVController);
router.put('/:id', uploadCV.single('cv_file'), updateCV);
router.delete('/:id', deleteCV);
router.patch('/:id/set-primary', setPrimaryCV);
router.get('/:id/download', downloadCV);

module.exports = router;