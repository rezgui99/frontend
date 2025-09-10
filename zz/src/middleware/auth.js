const jwt = require('jsonwebtoken');
const db = require("../../models/index");
const {  User  } = db;

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId, type = 'user') => {
  return jwt.sign({ userId, type }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - URL:', req.method, req.originalUrl);
    console.log('🔐 Auth middleware - Headers:', req.headers.authorization ? 'Bearer token present' : 'No auth header');
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ Auth middleware - No token provided');
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }

    console.log('🔍 Auth middleware - Token found, verifying...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Auth middleware - Token decoded successfully for user ID:', decoded.userId);
    
    // Vérifier que c'est un token utilisateur (pas candidat)
    if (decoded.type && decoded.type !== 'user') {
      console.log('❌ Auth middleware - Invalid token type:', decoded.type);
      return res.status(401).json({ 
        error: 'Invalid token type',
        message: 'Token invalide pour cette ressource'
      });
    }
    
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      console.log('❌ Auth middleware - User not found or inactive');
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token invalide ou utilisateur inactif'
      });
    }

    // Récupérer l'utilisateur avec ses rôles
    const userWithRoles = await User.findByPk(decoded.userId, {
      include: [{
        model: db.Role,
        as: 'roles',
        where: { is_active: true },
        required: false,
        through: { attributes: [] }
      }]
    });

    if (!userWithRoles || !userWithRoles.isActive) {
      console.log('❌ Auth middleware - User with roles not found or inactive');
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token invalide ou utilisateur inactif'
      });
    }

    // Ajouter les rôles à l'objet user
    const userRoles = userWithRoles.roles?.filter(role => role.is_active)?.map(role => role.name) || [];
    const primaryRole = userRoles.includes('admin') ? 'admin' : userRoles.includes('hr') ? 'hr' : 'user';
    
    console.log('👤 Auth middleware - User roles:', userRoles);
    console.log('🎭 Auth middleware - Primary role:', primaryRole);
    
    req.user = {
      ...userWithRoles.toJSON(),
      role: primaryRole,
      roles: userRoles
    };
    
    console.log('✅ Auth middleware - Authentication successful for user:', req.user.username);
    console.log('🔑 Auth middleware - User has roles:', req.user.roles);
    next();
  } catch (error) {
    console.error('❌ Auth middleware - Error:', error.message);
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

// Middleware to check user roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('🔒 Role authorization - Required roles:', roles);
    console.log('👤 Role authorization - User roles:', req.user?.roles);
    console.log('🎭 Role authorization - User primary role:', req.user?.role);
    
    if (!req.user) {
      console.log('❌ Role authorization - No user in request');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Authentification requise'
      });
    }

    // Vérifier si l'utilisateur a l'un des rôles requis
    const hasRequiredRole = roles.some(role => req.user.roles?.includes(role));
    
    if (!hasRequiredRole) {
      console.log('❌ Role authorization - Insufficient permissions');
      console.log('Required:', roles, 'User has:', req.user.roles);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Permissions insuffisantes pour cette action'
      });
    }

    console.log('✅ Role authorization - Access granted');
    next();
  };
};

module.exports = {
  generateToken,
  authenticateToken,
  authorizeRoles
};