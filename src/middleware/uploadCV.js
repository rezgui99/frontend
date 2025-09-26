const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier de destination s'il n'existe pas
const uploadDir = path.join(__dirname, '../uploads/candidate-cvs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Dossier d\'upload CV créé:', uploadDir);
}

// Configuration de Multer pour le stockage des CVs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cv-' + uniqueSuffix + ext);
  }
});

// Filtrage des types de fichiers pour les CVs
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers PDF, DOC et DOCX sont autorisés pour les CVs!'), false);
  }
};

const uploadCV = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size for CVs
  }
});

module.exports = uploadCV;