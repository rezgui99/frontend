const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireAdminOrHR, auditAction } = require('../middleware/roleAuth');
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignRole,
  removeRole,
  getAllRoles,
  toggleUserStatus,
  getUserAuditHistory,
  adminResetPassword
} = require('../controllers/userManagement');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour la gestion des utilisateurs (Admin seulement)
router.post('/users', requireAdmin, auditAction('CREATE', 'Users'), createUser);
router.get('/users', requireAdmin, getAllUsers);
router.get('/users/:id', requireAdmin, getUserById);
router.put('/users/:id', requireAdmin, auditAction('UPDATE', 'Users'), updateUser);
router.delete('/users/:id', requireAdmin, auditAction('DELETE', 'Users'), deleteUser);
router.patch('/users/:id/toggle-status', requireAdmin, auditAction('UPDATE', 'Users'), toggleUserStatus);
router.post('/users/:id/reset-password', requireAdmin, auditAction('UPDATE', 'Users'), adminResetPassword);

// Routes pour la gestion des rôles
router.post('/roles/assign', requireAdmin, auditAction('ROLE_ASSIGN', 'UserRoles'), assignRole);
router.post('/roles/remove', requireAdmin, auditAction('ROLE_REMOVE', 'UserRoles'), removeRole);
router.get('/roles', requireAdminOrHR, getAllRoles);

// Routes pour l'audit
router.get('/users/:id/audit', requireAdmin, getUserAuditHistory);

module.exports = router;