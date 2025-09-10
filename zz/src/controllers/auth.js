require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require("../../models/index");
const { User, sequelize } = db;
const { generateToken } = require('../middleware/auth');

// --- Nodemailer transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) ,
  secure: false, // false pour TLS sur port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS // mot de passe d'application Gmail
  }
});

// Test envoi email
transporter.verify((err, success) => {
  if (err) console.error('Erreur configuration email:', err);
  else console.log('Serveur email prêt à envoyer des emails');
});

// --- Helper pour hash du mot de passe ---
// Les hooks sont maintenant définis dans le modèle User

// --- Register new user ---
const register = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validations
    if (!firstName || !lastName || !email || !password) {
      await t.rollback();
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }

    if (password !== confirmPassword) {
      await t.rollback();
      return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
    }

    if (password.length < 6) {
      await t.rollback();
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email }, transaction: t });
    if (existingUser) {
      await t.rollback();
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    // Générer un username unique basé sur l'email
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

    // Création utilisateur
    const user = await User.create({
      username,
      firstName,
      lastName,
      email,
      password,
      isActive: true,
      emailVerified: true,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    }, { transaction: t });

    // Assigner le rôle HR par défaut aux nouveaux utilisateurs
    const hrRole = await db.Role.findOne({ where: { name: 'hr' }, transaction: t });
    if (hrRole) {
      await db.UserRole.create({
        user_id: user.id,
        role_id: hrRole.id,
        assigned_by: user.id // Auto-assigné
      }, { transaction: t });
    }

    const token = generateToken(user.id);

    // Envoi email de bienvenue
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Bienvenue sur SmartHire',
        html: `
          <h1>Bienvenue ${firstName} ${lastName}!</h1>
          <p>Votre compte a été créé avec succès.</p>
          <p>Votre nom d'utilisateur : <strong>${username}</strong></p>
          <p>Votre rôle : <strong>HR</strong></p>
          <p>Vous pouvez maintenant vous connecter à votre espace.</p>
        `
      });
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    // Récupérer l'utilisateur avec ses rôles pour la réponse
    const userWithRoles = await User.findByPk(user.id, {
      include: [{
        model: db.Role,
        as: 'roles',
        where: { is_active: true },
        required: false,
        through: { attributes: [] }
      }],
      transaction: t
    });

    const userRoles = userWithRoles?.roles?.map(role => role.name) || [];
    const userResponse = {
      ...user.toJSON(),
      role: userRoles.includes('admin') ? 'admin' : 'hr',
      roles: userRoles
    };

    await t.commit();
    res.status(201).json({ message: 'Utilisateur créé avec succès', user: userResponse, token });

  } catch (error) {
    await t.rollback();
    console.error('Erreur inscription:', error);
    
    // Gestion des erreurs spécifiques
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Données invalides', 
        details: error.errors.map(err => err.message) 
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Cet email ou nom d\'utilisateur existe déjà' });
    }
    
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
};

// --- Login user ---
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    if (!user.isActive) return res.status(401).json({ error: 'Votre compte a été désactivé' });

    // Vérifier si le compte est verrouillé
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      return res.status(401).json({ error: 'Compte temporairement verrouillé. Réessayez plus tard.' });
    }

    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      // Incrémenter les tentatives de connexion échouées
      const attempts = (user.login_attempts || 0) + 1;
      const updateData = { login_attempts: attempts };
      
      // Verrouiller le compte après 5 tentatives
      if (attempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await user.update(updateData);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Réinitialiser les tentatives de connexion et mettre à jour la dernière connexion
    await user.update({ 
      lastLogin: new Date(),
      login_attempts: 0,
      locked_until: null,
      last_login_ip: req.ip || req.connection.remoteAddress
    });
    
    // Récupérer les rôles de l'utilisateur
    const userWithRoles = await User.findByPk(user.id, {
      include: [{
        model: db.Role,
        as: 'roles',
        where: { is_active: true },
        required: false,
        through: { attributes: [] }
      }]
    });
    
    // Récupérer tous les rôles de l'utilisateur
    const userRoles = userWithRoles?.roles?.filter(role => role.is_active)?.map(role => role.name) || [];
    const primaryRole = userRoles.includes('admin') ? 'admin' : userRoles.includes('hr') ? 'hr' : 'user';
    
    console.log('🔑 Login - User roles found:', userRoles);
    console.log('🎭 Login - Primary role assigned:', primaryRole);
    
    const userResponse = {
      ...user.toJSON(),
      role: primaryRole,
      roles: userRoles
    };
    
    const token = generateToken(user.id);

    console.log('✅ Login successful - Token generated for user:', user.username);
    console.log('📋 Login - Final user response:', {
      id: userResponse.id,
      username: userResponse.username,
      role: userResponse.role,
      roles: userResponse.roles
    });

    res.json({ message: 'Connexion réussie', user: userResponse, token });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};

// --- Forgot password ---
const forgotPassword = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const user = await User.findOne({ where: { email }, transaction: t });
    if (!user) return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000);

    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpires
    }, { transaction: t });

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      `
    });

    await t.commit();
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });

  } catch (error) {
    await t.rollback();
    console.error('Erreur forgot password:', error);
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
};

// --- Reset password ---
const resetPassword = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) {
      await t.rollback();
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (newPassword !== confirmPassword) {
      await t.rollback();
      return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
    }

    if (newPassword.length < 6) {
      await t.rollback();
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      transaction: t
    });

    if (!user) {
      await t.rollback();
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    await user.update({ password: newPassword, resetPasswordToken: null, resetPasswordExpires: null }, { transaction: t });
    await t.commit();

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    await t.rollback();
    console.error('Erreur reset password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};

// --- Profile ---
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Erreur get profile:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
};

const updateProfile = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { firstName, lastName, email, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id, { transaction: t });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email }, transaction: t });
      if (existingUser && existingUser.id !== user.id) {
        await t.rollback();
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
      user.email = email;
      user.emailVerified = false;
    }

    if (newPassword) {
      if (!currentPassword) {
        await t.rollback();
        return res.status(400).json({ error: 'Mot de passe actuel requis' });
      }

      const isCurrentPasswordValid = await user.checkPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        await t.rollback();
        return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
      }

      if (newPassword.length < 6) {
        await t.rollback();
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      }

      user.password = newPassword;
    }

    await user.save({ transaction: t });
    await t.commit();

    res.json({ message: 'Profil mis à jour avec succès', user: user.toJSON() });
  } catch (error) {
    await t.rollback();
    console.error('Erreur update profile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
};

// --- Logout ---
const logout = async (req, res) => {
  try {
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  logout
};
