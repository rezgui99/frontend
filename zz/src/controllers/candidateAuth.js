require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require("../../models/index");
const { Candidate, sequelize } = db;
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const securityService = require('../services/securityService');

// Configuration email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Register new candidate
const registerCandidate = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { firstName, lastName, email, password, confirmPassword, phone, location } = req.body;

    // Validations
    if (!firstName || !lastName || !email || !password) {
      await t.rollback();
      return res.status(400).json({ error: 'Tous les champs obligatoires sont requis' });
    }

    if (password !== confirmPassword) {
      await t.rollback();
      return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
    }

    if (password.length < 6) {
      await t.rollback();
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier si le candidat existe déjà
    const existingCandidate = await Candidate.findOne({ where: { email }, transaction: t });
    if (existingCandidate) {
      await t.rollback();
      return res.status(409).json({ error: 'Un compte candidat avec cet email existe déjà' });
    }

    // Générer le code de vérification OTP
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Création du candidat
    const candidate = await Candidate.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      location,
      isActive: true,
      emailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires
    }, { transaction: t });

    // Envoyer l'email avec le code
    try {
      await emailService.sendVerificationCode(
        email,
        firstName,
        lastName,
        verificationCode,
        'candidate'
      );
      console.log('📧 Code de vérification candidat envoyé à:', email);
    } catch (emailError) {
      console.error('Erreur envoi code vérification candidat:', emailError);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    const token = generateToken(candidate.id, 'candidate');

    await t.commit();
    res.status(201).json({ 
      message: 'Compte candidat créé avec succès. Vérifiez votre email pour confirmer votre inscription.', 
      candidate: candidate.toJSON(), 
      token,
      emailVerificationRequired: true
    });

  } catch (error) {
    await t.rollback();
    console.error('Erreur inscription candidat:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Données invalides', 
        details: error.errors.map(err => err.message) 
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Cet email existe déjà' });
    }
    
    res.status(500).json({ error: 'Erreur lors de la création du compte candidat' });
  }
};

// Login candidate
const loginCandidate = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const candidate = await Candidate.findOne({ where: { email } });
    if (!candidate) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!candidate.isActive) {
      return res.status(401).json({ error: 'Votre compte a été désactivé' });
    }

    // Vérifier si le compte est verrouillé
    if (securityService.isAccountLocked(candidate)) {
      const remainingTime = securityService.getLockTimeRemaining(candidate);
      return res.status(401).json({ 
        error: `Compte temporairement verrouillé. Réessayez dans ${remainingTime} minute(s).`,
        lockTimeRemaining: remainingTime
      });
    }

    const isPasswordValid = await candidate.checkPassword(password);
    if (!isPasswordValid) {
      // Analyser la tentative échouée avec le service de sécurité
      const result = await securityService.analyzeLoginAttempt(
        candidate, 
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

    // Analyser la connexion réussie
    const loginResult = await securityService.analyzeLoginAttempt(
      candidate, 
      req.ip || req.connection.remoteAddress, 
      req.get('User-Agent'), 
      true
    );
    
    const token = generateToken(candidate.id, 'candidate');

    res.json({ 
      message: 'Connexion réussie', 
      candidate: candidate.toJSON(), 
      token,
      hadSuspiciousActivity: loginResult.hadSuspiciousActivity
    });
  } catch (error) {
    console.error('Erreur login candidat:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};

// Get candidate profile
const getCandidateProfile = async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.candidate.id, {
      include: [
        {
          model: db.CandidateCV,
          as: 'cvs'
        },
        {
          model: db.CandidateSkill,
          as: 'skills',
          include: [
            {
              model: db.Skill,
              as: 'skill'
            },
            {
              model: db.SkillLevel,
              as: 'skillLevel'
            }
          ]
        }
      ]
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    res.json({ candidate: candidate.toJSON() });
  } catch (error) {
    console.error('Erreur get candidate profile:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
};

// Update candidate profile
const updateCandidateProfile = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { firstName, lastName, email, phone, location, bio, currentPassword, newPassword } = req.body;
    const candidate = await Candidate.findByPk(req.candidate.id, { transaction: t });

    if (!candidate) {
      await t.rollback();
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    // Mise à jour des informations de base
    if (firstName) candidate.firstName = firstName;
    if (lastName) candidate.lastName = lastName;
    if (phone) candidate.phone = phone;
    if (location) candidate.location = location;
    if (bio) candidate.bio = bio;

    // Vérification email unique si modifié
    if (email && email !== candidate.email) {
      const existingCandidate = await Candidate.findOne({ where: { email }, transaction: t });
      if (existingCandidate && existingCandidate.id !== candidate.id) {
        await t.rollback();
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
      candidate.email = email;
      candidate.emailVerified = false;
    }

    // Changement de mot de passe
    if (newPassword) {
      if (!currentPassword) {
        await t.rollback();
        return res.status(400).json({ error: 'Mot de passe actuel requis' });
      }

      const isCurrentPasswordValid = await candidate.checkPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        await t.rollback();
        return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
      }

      if (newPassword.length < 6) {
        await t.rollback();
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      }

      candidate.password = newPassword;
    }

    await candidate.save({ transaction: t });
    await t.commit();

    res.json({ 
      message: 'Profil mis à jour avec succès', 
      candidate: candidate.toJSON() 
    });
  } catch (error) {
    await t.rollback();
    console.error('Erreur update candidate profile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
};

// Forgot password for candidate
const forgotPasswordCandidate = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email } = req.body;
    if (!email) {
      await t.rollback();
      return res.status(400).json({ error: 'Email requis' });
    }

    const candidate = await Candidate.findOne({ where: { email }, transaction: t });
    if (!candidate) {
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 heure

    await candidate.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpires
    }, { transaction: t });

    const resetUrl = `${process.env.FRONTEND_URL}/candidate/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Réinitialisation de votre mot de passe candidat',
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe candidat.</p>
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a>
        <p>Ce lien expire dans 1 heure.</p>
      `
    });

    await t.commit();
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });

  } catch (error) {
    await t.rollback();
    console.error('Erreur forgot password candidat:', error);
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
};

// Reset password for candidate
const resetPasswordCandidate = async (req, res) => {
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

    const candidate = await Candidate.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      transaction: t
    });

    if (!candidate) {
      await t.rollback();
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    await candidate.update({
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    await t.rollback();
    console.error('Erreur reset password candidat:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};

// Vérifier le code de confirmation email pour candidat
const verifyCandidateEmail = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email, code } = req.body;

    if (!email || !code) {
      await t.rollback();
      return res.status(400).json({ error: 'Email et code de vérification requis' });
    }

    if (!/^\d{6}$/.test(code)) {
      await t.rollback();
      return res.status(400).json({ error: 'Format de code invalide' });
    }

    const candidate = await Candidate.findOne({ where: { email }, transaction: t });
    if (!candidate) {
      await t.rollback();
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    if (candidate.emailVerified) {
      await t.rollback();
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    // Vérifier le code et l'expiration
    if (candidate.emailVerificationCode !== code) {
      await t.rollback();
      return res.status(400).json({ error: 'Code de vérification invalide ou expiré' });
    }

    if (new Date() > new Date(candidate.emailVerificationExpires)) {
      await t.rollback();
      return res.status(400).json({ error: 'Code de vérification expiré' });
    }

    // Marquer l'email comme vérifié
    await candidate.update({
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpires: null
    }, { transaction: t });

    // Envoyer email de confirmation
    try {
      await emailService.sendEmailVerifiedConfirmation(
        candidate.email,
        candidate.firstName,
        candidate.lastName,
        'candidate'
      );
    } catch (emailError) {
      console.error('Erreur envoi confirmation email candidat:', emailError);
    }

    await t.commit();
    res.json({ 
      message: 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.',
      emailVerified: true
    });

  } catch (error) {
    await t.rollback();
    console.error('Erreur vérification email candidat:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de l\'email' });
  }
};

// Renvoyer le code de vérification pour candidat
const resendCandidateVerificationCode = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email } = req.body;

    if (!email) {
      await t.rollback();
      return res.status(400).json({ error: 'Email requis' });
    }

    const candidate = await Candidate.findOne({ where: { email }, transaction: t });
    if (!candidate) {
      await t.rollback();
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    if (candidate.emailVerified) {
      await t.rollback();
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    // Générer un nouveau code OTP
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await candidate.update({
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires
    }, { transaction: t });

    // Envoyer le nouveau code
    try {
      await emailService.sendVerificationCode(
        email,
        candidate.firstName,
        candidate.lastName,
        verificationCode,
        'candidate'
      );
    } catch (emailError) {
      console.error('Erreur renvoi code candidat:', emailError);
      await t.rollback();
      return res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
    }

    await t.commit();
    res.json({ message: 'Nouveau code de vérification envoyé' });

  } catch (error) {
    await t.rollback();
    console.error('Erreur renvoi code vérification candidat:', error);
    res.status(500).json({ error: 'Erreur lors du renvoi du code' });
  }
};

module.exports = {
  registerCandidate,
  loginCandidate,
  verifyCandidateEmail,
  resendCandidateVerificationCode,
  getCandidateProfile,
  updateCandidateProfile,
  forgotPasswordCandidate,
  resetPasswordCandidate
};