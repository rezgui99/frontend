const request = require('supertest');
const express = require('express');
const authController = require('../../src/controllers/auth');
const { mockDb, mockUser } = require('../mocks');

// Mock des dépendances
jest.mock('../../src/middleware/auth', () => ({
  generateToken: jest.fn(() => 'test_token')
}));

jest.mock('../../models/index', () => require('../mocks').mockDb);

jest.mock('../../src/services/emailService', () => ({
  sendVerificationCode: jest.fn(),
  sendEmailVerifiedConfirmation: jest.fn()
}));

jest.mock('../../src/services/securityService', () => ({
  isAccountLocked: jest.fn(() => false),
  getLockTimeRemaining: jest.fn(() => 0),
  analyzeLoginAttempt: jest.fn(() => ({ hadSuspiciousActivity: false }))
}));

jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    verify: jest.fn((callback) => callback(null, true)),
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-id' }))
  }))
}));

const app = express();
app.use(express.json());

// Routes de test
app.post('/register', authController.register);
app.post('/login', authController.login);
app.post('/verify-email', authController.verifyEmail);
app.post('/resend-verification', authController.resendVerificationCode);
app.post('/forgot-password', authController.forgotPassword);
app.post('/reset-password', authController.resetPassword);
app.get('/profile', authController.getProfile);
app.put('/profile', authController.updateProfile);
app.post('/logout', authController.logout);

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('POST /register', () => {
    const validRegisterData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    it('should register a new user successfully', async () => {
      mockDb.User.findOne.mockResolvedValue(null); // Pas d'utilisateur existant
      mockDb.User.create.mockResolvedValue(mockUser);
      mockDb.Role.findOne.mockResolvedValue({ id: 1, name: 'hr' });
      mockDb.UserRole.create.mockResolvedValue({});
      mockDb.User.findByPk.mockResolvedValue({
        ...mockUser,
        roles: [{ name: 'hr' }]
      });

      const response = await request(app)
        .post('/register')
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.emailVerificationRequired).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/register')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tous les champs sont obligatoires');
    });

    it('should return 400 if passwords do not match', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          ...validRegisterData,
          confirmPassword: 'different_password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Les mots de passe ne correspondent pas');
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          ...validRegisterData,
          password: '123',
          confirmPassword: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Le mot de passe doit contenir au moins 6 caractères');
    });

    it('should return 409 if user already exists', async () => {
      mockDb.User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/register')
        .send(validRegisterData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Un utilisateur avec cet email existe déjà');
    });
  });

  describe('POST /login', () => {
    const validLoginData = {
      email: 'test@test.com',
      password: 'password123'
    };

    it('should login successfully', async () => {
      mockUser.checkPassword.mockResolvedValue(true);
      mockDb.User.findOne.mockResolvedValue(mockUser);
      mockDb.User.findByPk.mockResolvedValue({
        ...mockUser,
        roles: [{ name: 'hr', is_active: true }]
      });

      const response = await request(app)
        .post('/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    it('should return 400 if credentials are missing', async () => {
      const response = await request(app)
        .post('/login')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email et mot de passe requis');
    });

    it('should return 401 if user not found', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Email ou mot de passe incorrect');
    });

    it('should return 401 if user is inactive', async () => {
      mockDb.User.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false
      });

      const response = await request(app)
        .post('/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Votre compte a été désactivé');
    });

    it('should return 401 if password is incorrect', async () => {
      mockUser.checkPassword.mockResolvedValue(false);
      mockDb.User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Email ou mot de passe incorrect');
    });
  });

  describe('POST /verify-email', () => {
    const validVerificationData = {
      email: 'test@test.com',
      code: '123456'
    };

    it('should verify email successfully', async () => {
      const mockUserWithVerification = {
        ...mockUser,
        emailVerified: false,
        emailVerificationCode: '123456',
        emailVerificationExpires: new Date(Date.now() + 600000),
        update: jest.fn()
      };

      mockDb.User.findOne.mockResolvedValue(mockUserWithVerification);

      const response = await request(app)
        .post('/verify-email')
        .send(validVerificationData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Email vérifié avec succès');
      expect(response.body.emailVerified).toBe(true);
    });

    it('should return 400 if email or code is missing', async () => {
      const response = await request(app)
        .post('/verify-email')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email et code de vérification requis');
    });

    it('should return 400 if code format is invalid', async () => {
      const response = await request(app)
        .post('/verify-email')
        .send({
          email: 'test@test.com',
          code: '12345' // Trop court
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Format de code invalide');
    });

    it('should return 404 if user not found', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/verify-email')
        .send(validVerificationData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Utilisateur non trouvé');
    });

    it('should return 400 if email already verified', async () => {
      mockDb.User.findOne.mockResolvedValue({
        ...mockUser,
        emailVerified: true
      });

      const response = await request(app)
        .post('/verify-email')
        .send(validVerificationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email déjà vérifié');
    });

    it('should return 400 if verification code is incorrect', async () => {
      mockDb.User.findOne.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        emailVerificationCode: '654321',
        emailVerificationExpires: new Date(Date.now() + 600000)
      });

      const response = await request(app)
        .post('/verify-email')
        .send(validVerificationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Code de vérification invalide ou expiré');
    });

    it('should return 400 if verification code is expired', async () => {
      mockDb.User.findOne.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        emailVerificationCode: '123456',
        emailVerificationExpires: new Date(Date.now() - 600000) // Expiré
      });

      const response = await request(app)
        .post('/verify-email')
        .send(validVerificationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Code de vérification expiré');
    });
  });

  describe('POST /resend-verification', () => {
    it('should resend verification code successfully', async () => {
      const mockUserWithCode = {
        ...mockUser,
        emailVerified: false,
        update: jest.fn()
      };

      mockDb.User.findOne.mockResolvedValue(mockUserWithCode);

      const response = await request(app)
        .post('/resend-verification')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Nouveau code de vérification envoyé');
    });

    it('should return 400 if email already verified', async () => {
      mockDb.User.findOne.mockResolvedValue({
        ...mockUser,
        emailVerified: true
      });

      const response = await request(app)
        .post('/resend-verification')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email déjà vérifié');
    });
  });

  describe('POST /forgot-password', () => {
    it('should send reset password email', async () => {
      mockDb.User.findOne.mockResolvedValue({
        ...mockUser,
        update: jest.fn()
      });

      const response = await request(app)
        .post('/forgot-password')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('lien de réinitialisation a été envoyé');
    });

    it('should return same message even if user not found', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('lien de réinitialisation a été envoyé');
    });
  });

  describe('POST /reset-password', () => {
    it('should reset password successfully', async () => {
      const mockUserWithToken = {
        ...mockUser,
        resetPasswordToken: 'valid_token',
        resetPasswordExpires: new Date(Date.now() + 3600000),
        update: jest.fn()
      };

      mockDb.User.findOne.mockResolvedValue(mockUserWithToken);

      const response = await request(app)
        .post('/reset-password')
        .send({
          token: 'valid_token',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Mot de passe réinitialisé avec succès');
    });

    it('should return 400 if token is invalid', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/reset-password')
        .send({
          token: 'invalid_token',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Token invalide ou expiré');
    });
  });
});