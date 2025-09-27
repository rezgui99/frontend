const Joi = require('joi');

// Validation pour la création d'utilisateur
const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  roleIds: Joi.array().items(Joi.number().integer().positive()).optional()
});

// Validation pour la mise à jour d'utilisateur
const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).optional(),
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).max(100).optional(),
  isActive: Joi.boolean().optional()
});

// Validation pour l'attribution de rôle
const assignRoleSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  roleId: Joi.number().integer().positive().required()
});

// Validation pour la réinitialisation de mot de passe par admin
const adminResetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).max(100).required()
});

// Middleware de validation
const validateCreateUser = (req, res, next) => {
  const { error } = createUserSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Données invalides',
      details: error.details.map(err => err.message)
    });
  }
  next();
};

const validateUpdateUser = (req, res, next) => {
  const { error } = updateUserSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Données invalides',
      details: error.details.map(err => err.message)
    });
  }
  next();
};

const validateAssignRole = (req, res, next) => {
  const { error } = assignRoleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Données invalides',
      details: error.details.map(err => err.message)
    });
  }
  next();
};

const validateAdminResetPassword = (req, res, next) => {
  const { error } = adminResetPasswordSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Données invalides',
      details: error.details.map(err => err.message)
    });
  }
  next();
};

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateAssignRole,
  validateAdminResetPassword
};