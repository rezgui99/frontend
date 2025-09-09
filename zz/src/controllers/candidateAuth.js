require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require("../../models/index");
const { Candidate, sequelize } = db;
const { generateToken } = require('../middleware/auth');

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

    // Création du candidat
    const candidate = await Candidate.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      location,
      isActive: true,
      emailVerified: true
    }, { transaction: t });

    const token = generateToken(candidate.id, 'candidate');

    // Envoi email de bienvenue
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Bienvenue sur SmartHire - Espace Candidat',
        html: `
          <h1>Bienvenue ${firstName} ${lastName}!</h1>
          <p>Votre compte candidat a été créé avec succès.</p>
          <p>Vous pouvez maintenant :</p>
          <ul>
            <li>Consulter les offres d'emploi disponibles</li>
            <li>Postuler aux offres qui vous intéressent</li>
            <li>Gérer vos CVs et votre profil</li>
            <li>Suivre l'état de vos candidatures</li>
          </ul>
          <p>Bonne recherche d'emploi !</p>
        `
      });
    } catch (emailError) {
      console.error('Erreur envoi email candidat:', emailError);
    }

    await t.commit();
    res.status(201).json({ 
      message: 'Compte candidat créé avec succès', 
      candidate: candidate.toJSON(), 
      token 
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

    const isPasswordValid = await candidate.checkPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Mettre à jour la dernière connexion
    await candidate.update({ 
      lastLogin: new Date()
    });
    
    const token = generateToken(candidate.id, 'candidate');

    res.json({ 
      message: 'Connexion réussie', 
      candidate: candidate.toJSON(), 
      token 
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

module.exports = {
  registerCandidate,
  loginCandidate,
  getCandidateProfile,
  updateCandidateProfile,
  forgotPasswordCandidate,
  resetPasswordCandidate
};