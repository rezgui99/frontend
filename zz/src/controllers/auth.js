require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require("../../models/index");
const { User, sequelize } = db;
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const securityService = require('../services/securityService');

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

// --- Register new user ---
const register = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    console.log('📝 Register - New user registration attempt for:', email);

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

    // Générer le code de vérification OTP
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('🔢 Register - Generated verification code for:', email);

    // Création utilisateur
    const user = await User.create({
      username,
      firstName,
      lastName,
      email,
      password,
      isActive: true,
      emailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires
    }, { transaction: t });

    console.log('👤 Register - User created with ID:', user.id);

    // Envoyer l'email avec le code
    try {
      await emailService.sendVerificationCode(
        email,
        firstName,
        lastName,
        verificationCode,
        'user'
      );
      console.log('📧 Code de vérification envoyé à:', email);
    } catch (emailError) {
      console.error('Erreur envoi code vérification:', emailError);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    // Assigner le rôle HR par défaut aux nouveaux utilisateurs
    const hrRole = await db.Role.findOne({ where: { name: 'hr' }, transaction: t });
    if (hrRole) {
      await db.UserRole.create({
        user_id: user.id,
        role_id: hrRole.id,
        assigned_by: user.id // Auto-assigné
      }, { transaction: t });
      console.log('🎭 Register - HR role assigned to user:', user.id);
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
      ...userWithRoles.toJSON(),
      role: userRoles.includes('admin') ? 'admin' : 'hr',
      roles: userRoles
    };

    await t.commit();
    
    console.log('✅ Register - User registration completed for:', email);
    
    res.status(201).json({ 
      message: 'Utilisateur créé avec succès. Vérifiez votre email pour confirmer votre inscription.', 
      user: userResponse, 
      token: null, // Pas de token tant que l'email n'est pas vérifié
      emailVerificationRequired: true // Toujours true pour les nouveaux comptes
    });

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

    console.log('🔑 Login - Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('❌ Login - User not found:', email);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!user.isActive) {
      console.log('❌ Login - User account disabled:', email);
      return res.status(401).json({ error: 'Votre compte a été désactivé' });
    }

    // Vérifier si le compte est verrouillé
    if (securityService.isAccountLocked(user)) {
      const remainingTime = securityService.getLockTimeRemaining(user);
      console.log('🔒 Login - Account locked:', email);
      return res.status(401).json({ 
        error: `Compte temporairement verrouillé. Réessayez dans ${remainingTime} minute(s).`,
        lockTimeRemaining: remainingTime
      });
    }

    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      console.log('❌ Login - Invalid password for:', email);
      
      // Analyser la tentative échouée avec le service de sécurité
      const result = await securityService.analyzeLoginAttempt(
        user, 
        req.ip || req.connection.remoteAddress, 
        req.get('User-Agent'), 
        false
      );
      
      if (result.locked) {
        return res.status(401).json({ 
          error: `Trop de tentatives échouées. Compte verrouillé pour ${securityService.lockoutDuration} minutes.`,
          accountLocked: true,
          attempts: result.attempts
        });
      }
      
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier si l'email est vérifié
    if (!user.emailVerified) {
      console.log('📧 Login - Email not verified for:', email);
      return res.status(401).json({ 
        error: 'Votre email n\'est pas encore vérifié',
        emailVerificationRequired: true,
        email: user.email
      });
    }

    // Analyser la connexion réussie
    const loginResult = await securityService.analyzeLoginAttempt(
      user, 
      req.ip || req.connection.remoteAddress, 
      req.get('User-Agent'), 
      true
    );
    
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

    res.json({ 
      message: 'Connexion réussie', 
      user: userResponse, 
      token,
      hadSuspiciousActivity: loginResult.hadSuspiciousActivity
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};

// Vérifier le code de confirmation email
const verifyEmail = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email, code } = req.body;

    console.log('📧 VerifyEmail - Verification attempt for:', email, 'with code:', code);

    if (!email || !code) {
      await t.rollback();
      return res.status(400).json({ error: 'Email et code de vérification requis' });
    }

    if (!/^\d{6}$/.test(code)) {
      await t.rollback();
      return res.status(400).json({ error: 'Format de code invalide' });
    }

    const user = await User.findOne({ where: { email }, transaction: t });
    if (!user) {
      await t.rollback();
      console.log('❌ VerifyEmail - User not found:', email);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.emailVerified) {
      await t.rollback();
      console.log('⚠️ VerifyEmail - Email already verified:', email);
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    // Vérifier le code et l'expiration
    if (user.emailVerificationCode !== code) {
      await t.rollback();
      console.log('❌ VerifyEmail - Invalid code for:', email);
      return res.status(400).json({ error: 'Code de vérification invalide ou expiré' });
    }

    if (new Date() > new Date(user.emailVerificationExpires)) {
      await t.rollback();
      console.log('⏰ VerifyEmail - Expired code for:', email);
      return res.status(400).json({ error: 'Code de vérification expiré' });
    }

    // Marquer l'email comme vérifié
    await user.update({
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpires: null,
      lastLogin: new Date() // Mettre à jour lastLogin pour connexion automatique
    }, { transaction: t });

    console.log('✅ VerifyEmail - Email verified for:', email);

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
      ...userWithRoles.toJSON(),
      role: userRoles.includes('admin') ? 'admin' : 'hr',
      roles: userRoles
    };

    // Générer un token pour connexion automatique
    const token = generateToken(user.id);
    console.log('🔐 VerifyEmail - Token generated for auto-login:', email);

    // Envoyer email de confirmation
    try {
      await emailService.sendEmailVerifiedConfirmation(
        user.email,
        user.firstName,
        user.lastName,
        'user'
      );
      console.log('📧 VerifyEmail - Confirmation email sent to:', email);
    } catch (emailError) {
      console.error('Erreur envoi confirmation email:', emailError);
    }

    await t.commit();
    
    console.log('🎉 VerifyEmail - Process completed successfully for:', email);
    
    res.json({ 
      message: 'Email vérifié avec succès ! Connexion automatique...',
      emailVerified: true,
      token: token,
      user: userResponse,
      autoLogin: true // Indicateur pour le frontend
    });

  } catch (error) {
    await t.rollback();
    console.error('Erreur vérification email:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de l\'email' });
  }
};

// Renvoyer le code de vérification
const resendVerificationCode = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email } = req.body;

    console.log('📮 ResendCode - Resend request for:', email);

    if (!email) {
      await t.rollback();
      return res.status(400).json({ error: 'Email requis' });
    }

    const user = await User.findOne({ where: { email }, transaction: t });
    if (!user) {
      await t.rollback();
      console.log('❌ ResendCode - User not found:', email);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.emailVerified) {
      await t.rollback();
      console.log('⚠️ ResendCode - Email already verified:', email);
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    // Générer un nouveau code OTP
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires
    }, { transaction: t });

    console.log('🔢 ResendCode - New code generated for:', email);

    // Envoyer le nouveau code
    try {
      await emailService.sendVerificationCode(
        email,
        user.firstName,
        user.lastName,
        verificationCode,
        'user'
      );
      console.log('📧 ResendCode - New code sent to:', email);
    } catch (emailError) {
      console.error('Erreur renvoi code:', emailError);
      await t.rollback();
      return res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
    }

    await t.commit();
    console.log('✅ ResendCode - Process completed for:', email);
    res.json({ message: 'Nouveau code de vérification envoyé' });

  } catch (error) {
    await t.rollback();
    console.error('Erreur renvoi code vérification:', error);
    res.status(500).json({ error: 'Erreur lors du renvoi du code' });
  }
};

// --- Forgot password ---
const forgotPassword = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email } = req.body;
    
    console.log('🔑 ForgotPassword - Request for:', email);
    
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const user = await User.findOne({ where: { email }, transaction: t });
    if (!user) {
      console.log('❌ ForgotPassword - User not found:', email);
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
    }

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

    console.log('📧 ForgotPassword - Reset link sent to:', email);
    
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
    
    console.log('🔄 ResetPassword - Password reset attempt with token');
    
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
      console.log('❌ ResetPassword - Invalid or expired token');
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    await user.update({ 
      password: newPassword, 
      resetPasswordToken: null, 
      resetPasswordExpires: null 
    }, { transaction: t });
    
    console.log('✅ ResetPassword - Password updated for user:', user.email);
    
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
    console.log('👤 GetProfile - Request for user ID:', req.user.id);
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      console.log('❌ GetProfile - User not found:', req.user.id);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    console.log('✅ GetProfile - Profile retrieved for:', user.email);
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
    
    console.log('📝 UpdateProfile - Update request for user ID:', req.user.id);
    
    const user = await User.findByPk(req.user.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email }, transaction: t });
      if (existingUser && existingUser.id !== user.id) {
        await t.rollback();
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
      user.email = email;
      user.emailVerified = false; // Requerir la vérification pour le nouvel email
      console.log('📧 UpdateProfile - Email changed, verification required');
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
      console.log('🔑 UpdateProfile - Password updated');
    }

    await user.save({ transaction: t });
    await t.commit();

    console.log('✅ UpdateProfile - Profile updated for:', user.email);
    
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
    console.log('👋 Logout - User logout request');
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationCode,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  logout
};