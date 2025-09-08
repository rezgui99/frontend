const jwt = require('jsonwebtoken');
const db = require("../../models/index");
const { Candidate } = db;

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware to verify candidate JWT token
const authenticateCandidateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Vérifier que c'est un token candidat
    if (decoded.type !== 'candidate') {
      return res.status(401).json({ 
        error: 'Invalid token type',
        message: 'Token invalide pour l\'espace candidat'
      });
    }

    const candidate = await Candidate.findByPk(decoded.userId);

    if (!candidate || !candidate.isActive) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token invalide ou compte candidat inactif'
      });
    }

    req.candidate = candidate.toJSON();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Votre session a expiré, veuillez vous reconnecter'
      });
    }
    
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Token invalide'
    });
  }
};

module.exports = {
  authenticateCandidateToken
};