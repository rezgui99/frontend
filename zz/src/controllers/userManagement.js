const bcrypt = require('bcryptjs');
const db = require("../../models/index");
const {User, Role, UserRole, AuditLog, Skill, JobDescription, Employee, sequelize } = db;

// Fonction utilitaire pour créer un log d'audit
const createAuditLog = async (userId, action, tableName, recordId, oldValues, newValues, modifiedBy, ipAddress, userAgent, transaction) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      modified_by: modifiedBy,
      ip_address: ipAddress,
      user_agent: userAgent
    }, { transaction });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
};

// Créer un utilisateur (Admin seulement)
const createUser = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { username, firstName, lastName, email, password, roleIds = [] } = req.body;

    // Validation
    if (!username || !firstName || !lastName || !email || !password) {
      await t.rollback();
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Tous les champs obligatoires sont requis'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email },
          { username }
        ]
      },
      transaction: t
    });

    if (existingUser) {
      await t.rollback();
      return res.status(409).json({
        error: 'User already exists',
        message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà'
      });
    }

    // Si aucun rôle spécifié, assigner HR par défaut
    let finalRoleIds = roleIds;
    if (!finalRoleIds || finalRoleIds.length === 0) {
      const hrRole = await Role.findOne({ where: { name: 'hr' }, transaction: t });
      if (hrRole) {
        finalRoleIds = [hrRole.id];
      }
    }

    // Créer l'utilisateur
    const user = await User.create({
      username,
      firstName,
      lastName,
      email,
      password,
      isActive: true,
      emailVerified: true // Admin peut créer des utilisateurs vérifiés
    }, { transaction: t });

    // Assigner les rôles si fournis
    if (finalRoleIds.length > 0) {
      const roles = await Role.findAll({
        where: { id: finalRoleIds, is_active: true },
        transaction: t
      });

      if (roles.length !== finalRoleIds.length) {
        await t.rollback();
        return res.status(400).json({
          error: 'Invalid roles',
          message: 'Un ou plusieurs rôles sont invalides'
        });
      }

      await user.setRoles(roles, { transaction: t });
    }

    // Audit log
    await createAuditLog(
      user.id,
      'CREATE',
      'Users',
      user.id,
      null,
      { username, firstName, lastName, email, isActive: true },
      req.user.id,
      req.auditInfo?.ip_address,
      req.auditInfo?.user_agent,
      t
    );

    // Récupérer l'utilisateur avec ses rôles
    const userWithRoles = await User.findByPk(user.id, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: ['assigned_at'] }
      }],
      transaction: t
    });

    await t.commit();

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: userWithRoles.toJSON()
    });

  } catch (error) {
    await t.rollback();
    console.error('Create user error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Données invalides',
        details: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({
      error: 'User creation failed',
      message: 'Erreur lors de la création de l\'utilisateur'
    });
  }
};

// Lister tous les utilisateurs (Admin seulement)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, isActive } = req.query;
    const offset = (page - 1) * limit;

    // Construire les conditions de recherche
    const whereConditions = {};
    
    if (search) {
      whereConditions[sequelize.Sequelize.Op.or] = [
        { username: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { firstName: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { lastName: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    if (isActive !== undefined) {
      whereConditions.isActive = isActive === 'true';
    }

    // Conditions pour les rôles
    const includeConditions = [{
      model: Role,
      as: 'roles',
      through: { attributes: ['assigned_at'] },
      required: false
    }];

    if (role) {
      includeConditions[0].where = { name: role };
      includeConditions[0].required = true;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    res.json({
      users: users.map(user => user.toJSON()),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
};

// Récupérer un utilisateur par ID (Admin seulement)
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: ['assigned_at'] }
        },
        {
          model: Skill,
          as: 'createdSkills',
          attributes: ['id', 'name', 'createdAt']
        },
        {
          model: JobDescription,
          as: 'createdJobDescriptions',
          attributes: ['id', 'emploi', 'createdAt']
        },
        {
          model: Employee,
          as: 'createdEmployees',
          attributes: ['id', 'name', 'createdAt']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};

// Modifier un utilisateur (Admin seulement)
const updateUser = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { username, firstName, lastName, email, isActive, password } = req.body;
    
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        error: 'User not found',
        message: 'Utilisateur non trouvé'
      });
    }

    // Stocker les anciennes valeurs pour l'audit
    const oldValues = {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive
    };

    // Vérifier l'unicité du username et email si modifiés
    if ((username && username !== user.username) || (email && email !== user.email)) {
      const existingUser = await User.findOne({
        where: {
          [sequelize.Sequelize.Op.and]: [
            { id: { [sequelize.Sequelize.Op.ne]: user.id } },
            {
              [sequelize.Sequelize.Op.or]: [
                username && username !== user.username ? { username } : null,
                email && email !== user.email ? { email } : null
              ].filter(Boolean)
            }
          ]
        },
        transaction: t
      });

      if (existingUser) {
        await t.rollback();
        return res.status(409).json({
          error: 'Conflict',
          message: 'Ce nom d\'utilisateur ou email est déjà utilisé'
        });
      }
    }

    // Mettre à jour les champs
    const updateData = {};
    if (username) updateData.username = username;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = password;

    await user.update(updateData, { transaction: t });

    // Audit log
    await createAuditLog(
      user.id,
      'UPDATE',
      'Users',
      user.id,
      oldValues,
      updateData,
      req.user.id,
      req.auditInfo?.ip_address,
      req.auditInfo?.user_agent,
      t
    );

    // Récupérer l'utilisateur mis à jour avec ses rôles
    const updatedUser = await User.findByPk(user.id, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: ['assigned_at'] }
      }],
      transaction: t
    });

    await t.commit();

    res.json({
      message: 'Utilisateur mis à jour avec succès',
      user: updatedUser.toJSON()
    });

  } catch (error) {
    await t.rollback();
    console.error('Update user error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Données invalides',
        details: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({
      error: 'User update failed',
      message: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
};

// Supprimer ou désactiver un utilisateur (Admin seulement)
const deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { soft = true } = req.query; // Par défaut, suppression douce
    
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        error: 'User not found',
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la suppression de son propre compte
    if (user.id === req.user.id) {
      await t.rollback();
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    if (soft === 'true') {
      // Suppression douce - désactiver l'utilisateur
      await user.update({ isActive: false }, { transaction: t });
      
      await createAuditLog(
        user.id,
        'DEACTIVATE',
        'Users',
        user.id,
        { isActive: true },
        { isActive: false },
        req.user.id,
        req.auditInfo?.ip_address,
        req.auditInfo?.user_agent,
        t
      );

      await t.commit();
      
      res.json({
        message: 'Utilisateur désactivé avec succès'
      });
    } else {
      // Suppression définitive
      await createAuditLog(
        user.id,
        'DELETE',
        'Users',
        user.id,
        user.toJSON(),
        null,
        req.user.id,
        req.auditInfo?.ip_address,
        req.auditInfo?.user_agent,
        t
      );

      await user.destroy({ transaction: t });
      await t.commit();
      
      res.json({
        message: 'Utilisateur supprimé définitivement'
      });
    }

  } catch (error) {
    await t.rollback();
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'User deletion failed',
      message: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
};

// Attribuer un rôle à un utilisateur (Admin seulement)
const assignRole = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      await t.rollback();
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'ID utilisateur et ID rôle requis'
      });
    }

    // Vérifier que l'utilisateur et le rôle existent
    const [user, role] = await Promise.all([
      User.findByPk(userId, { transaction: t }),
      Role.findByPk(roleId, { transaction: t })
    ]);

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        error: 'User not found',
        message: 'Utilisateur non trouvé'
      });
    }

    if (!role) {
      await t.rollback();
      return res.status(404).json({
        error: 'Role not found',
        message: 'Rôle non trouvé'
      });
    }

    // Vérifier si l'utilisateur a déjà ce rôle
    const existingUserRole = await UserRole.findOne({
      where: { user_id: userId, role_id: roleId },
      transaction: t
    });

    if (existingUserRole) {
      await t.rollback();
      return res.status(409).json({
        error: 'Role already assigned',
        message: 'Ce rôle est déjà attribué à cet utilisateur'
      });
    }

    // Créer l'association
    await UserRole.create({
      user_id: userId,
      role_id: roleId,
      assigned_by: req.user.id
    }, { transaction: t });

    // Audit log
    await createAuditLog(
      userId,
      'ROLE_ASSIGN',
      'UserRoles',
      null,
      null,
      { role_name: role.name, role_id: roleId },
      req.user.id,
      req.auditInfo?.ip_address,
      req.auditInfo?.user_agent,
      t
    );

    await t.commit();

    res.json({
      message: `Rôle "${role.name}" attribué avec succès à ${user.username}`
    });

  } catch (error) {
    await t.rollback();
    console.error('Assign role error:', error);
    res.status(500).json({
      error: 'Role assignment failed',
      message: 'Erreur lors de l\'attribution du rôle'
    });
  }
};

// Retirer un rôle à un utilisateur (Admin seulement)
const removeRole = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      await t.rollback();
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'ID utilisateur et ID rôle requis'
      });
    }

    // Vérifier que l'association existe
    const userRole = await UserRole.findOne({
      where: { user_id: userId, role_id: roleId },
      include: [
        { model: User, as: 'user' },
        { model: Role, as: 'role' }
      ],
      transaction: t
    });

    if (!userRole) {
      await t.rollback();
      return res.status(404).json({
        error: 'Role assignment not found',
        message: 'Cette attribution de rôle n\'existe pas'
      });
    }

    // Empêcher de retirer le rôle admin du dernier admin
    if (userRole.role.name === 'admin') {
      const adminCount = await UserRole.count({
        include: [{
          model: Role,
          as: 'role',
          where: { name: 'admin' }
        }],
        transaction: t
      });

      if (adminCount <= 1) {
        await t.rollback();
        return res.status(400).json({
          error: 'Cannot remove last admin',
          message: 'Impossible de retirer le rôle admin du dernier administrateur'
        });
      }
    }

    // Audit log avant suppression
    await createAuditLog(
      userId,
      'ROLE_REMOVE',
      'UserRoles',
      null,
      { role_name: userRole.role.name, role_id: roleId },
      null,
      req.user.id,
      req.auditInfo?.ip_address,
      req.auditInfo?.user_agent,
      t
    );

    // Supprimer l'association
    await userRole.destroy({ transaction: t });

    await t.commit();

    res.json({
      message: `Rôle "${userRole.role.name}" retiré avec succès de ${userRole.user.username}`
    });

  } catch (error) {
    await t.rollback();
    console.error('Remove role error:', error);
    res.status(500).json({
      error: 'Role removal failed',
      message: 'Erreur lors du retrait du rôle'
    });
  }
};

// Lister tous les rôles (Admin et HR)
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{
        model: User,
        as: 'users',
        through: { attributes: ['assigned_at'] },
        attributes: ['id', 'username', 'firstName', 'lastName', 'email'],
        required: false
      }],
      order: [['name', 'ASC']]
    });

    res.json({
      roles: roles.map(role => ({
        ...role.toJSON(),
        userCount: role.users.length
      }))
    });

  } catch (error) {
    console.error('Get all roles error:', error);
    res.status(500).json({
      error: 'Failed to get roles',
      message: 'Erreur lors de la récupération des rôles'
    });
  }
};

// Activer/Désactiver un utilisateur (Admin seulement)
const toggleUserStatus = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        error: 'User not found',
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la désactivation de son propre compte
    if (user.id === req.user.id) {
      await t.rollback();
      return res.status(400).json({
        error: 'Cannot deactivate own account',
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    const newStatus = !user.isActive;
    const oldValues = { isActive: user.isActive };
    
    await user.update({ isActive: newStatus }, { transaction: t });

    // Audit log
    await createAuditLog(
      user.id,
      newStatus ? 'ACTIVATE' : 'DEACTIVATE',
      'Users',
      user.id,
      oldValues,
      { isActive: newStatus },
      req.user.id,
      req.auditInfo?.ip_address,
      req.auditInfo?.user_agent,
      t
    );

    await t.commit();

    res.json({
      message: `Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`,
      user: user.toJSON()
    });

  } catch (error) {
    await t.rollback();
    console.error('Toggle user status error:', error);
    res.status(500).json({
      error: 'Status toggle failed',
      message: 'Erreur lors du changement de statut'
    });
  }
};

// Obtenir l'historique d'audit d'un utilisateur (Admin seulement)
const getUserAuditHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where: { user_id: req.params.id },
      include: [
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      auditLogs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get user audit history error:', error);
    res.status(500).json({
      error: 'Failed to get audit history',
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
};

// Réinitialiser le mot de passe d'un utilisateur (Admin seulement)
const adminResetPassword = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      await t.rollback();
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        error: 'User not found',
        message: 'Utilisateur non trouvé'
      });
    }

    await user.update({
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    }, { transaction: t });

    // Audit log
    await createAuditLog(
      user.id,
      'UPDATE',
      'Users',
      user.id,
      null,
      { password_reset_by_admin: true },
      req.user.id,
      req.auditInfo?.ip_address,
      req.auditInfo?.user_agent,
      t
    );

    await t.commit();

    res.json({
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    await t.rollback();
    console.error('Admin reset password error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
};

module.exports = {
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
};