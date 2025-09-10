
const db = require("../../models/index");
const {  User, Role, UserRole  } = db;

// Middleware pour vérifier les rôles
const requireRole = (...requiredRoles) => {
  return async (req, res, next) => {
    try {
      console.log('🔒 RequireRole middleware - Checking access for:', req.originalUrl);
      console.log('🔒 RequireRole middleware - Required roles:', requiredRoles);
      console.log('🔒 RequireRole middleware - User roles:', req.user?.roles);
      
      if (!req.user) {
        console.log('❌ RequireRole middleware - No user in request');
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Authentification requise'
        });
      }

      // Les rôles sont déjà chargés dans req.user par le middleware auth
      const userRoles = req.user.roles || [];
      
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        console.log('❌ RequireRole middleware - Access denied for:', req.originalUrl);
        console.log('❌ Required:', requiredRoles, 'User has:', userRoles);
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Accès refusé. Rôles requis: ${requiredRoles.join(', ')}`
        });
      }

      // Ajouter les rôles à la requête pour utilisation ultérieure
      req.userRoles = userRoles;
      console.log('✅ RequireRole middleware - Access granted for:', req.originalUrl);
      next();
    } catch (error) {
      console.error('Role verification error:', error);
      res.status(500).json({
        error: 'Role verification failed',
        message: 'Erreur lors de la vérification des rôles'
      });
    }
  };
};

// Middleware pour vérifier si l'utilisateur est admin
const requireAdmin = requireRole('admin');

// Middleware pour vérifier si l'utilisateur est admin ou HR
const requireAdminOrHR = requireRole('admin', 'hr');

// Middleware pour audit des actions
const auditAction = (action, tableName) => {
  return async (req, res, next) => {
    // Stocker les informations d'audit dans la requête
    req.auditInfo = {
      action,
      tableName,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    };
    next();
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireAdminOrHR,
  auditAction
};