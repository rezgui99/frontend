const request = require('supertest');
const express = require('express');
const candidateAuthController = require('../../src/controllers/candidateAuth');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

jest.mock('../../src/middleware/auth', () => ({
  generateToken: jest.fn(() => 'candidate_test_token')
}));

jest.mock('../../src/services/emailService', () => ({
  sendVerificationCode: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  sendEmailVerifiedConfirmation: jest.fn().mockResolvedValue({ messageId: 'test-id' })
}));

jest.mock('../../src/services/securityService', () => ({
  isAccountLocked: jest.fn(() => false),
  getLockTimeRemaining: jest.fn(() => 0),
  analyzeLoginAttempt: jest.fn(() => Promise.resolve({ hadSuspiciousActivity: false }))
}));

const mockCandidate = {
  id: 1,
  firstName: 'Test',
  lastName: 'Candidate',
  email: 'candidate@test.com',
  isActive: true,
  emailVerified: false,
  login_attempts: 0,
  locked_until: null,
  toJSON: jest.fn(() => ({
    id: 1,
    firstName: 'Test',
    lastName: 'Candidate',
    email: 'candidate@test.com'
  })),
  checkPassword: jest.fn(),
  update: jest.fn().mockResolvedValue(),
  save: jest.fn().mockResolvedValue()
};

const candidateApp = express();
candidateApp.use(express.json());

// Mock candidate middleware for protected routes
candidateApp.use((req, res, next) => {
  if (req.path === '/profile' || req.path.includes('update')) {
    req.candidate = { id: 1, firstName: 'Test', lastName: 'Candidate' };
  }
  next();
});

candidateApp.post('/register-candidate', candidateAuthController.registerCandidate);
candidateApp.post('/login-candidate', candidateAuthController.loginCandidate);
candidateApp.post('/verify-email', candidateAuthController.verifyCandidateEmail);
candidateApp.post('/resend-verification', candidateAuthController.resendCandidateVerificationCode);
candidateApp.post('/forgot-password', candidateAuthController.forgotPasswordCandidate);
candidateApp.post('/reset-password', candidateAuthController.resetPasswordCandidate);
candidateApp.get('/profile', candidateAuthController.getCandidateProfile);
candidateApp.put('/profile', candidateAuthController.updateCandidateProfile);

describe('Candidate Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue()
    });
  });

  describe('POST /register-candidate', () => {
    const validCandidateData = {
      firstName: 'Test',
      lastName: 'Candidate',
      email: 'candidate@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      phone: '+216123456789',
      location: 'Tunis'
    };

    it('should register a new candidate successfully', async () => {
      mockDb.Candidate.findOne.mockResolvedValue(null);
      mockDb.Candidate.create.mockResolvedValue(mockCandidate);

      const response = await request(candidateApp)
        .post('/register-candidate')
        .send(validCandidateData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Compte candidat créé avec succès. Vérifiez votre email pour confirmer votre inscription.');
      expect(response.body).toHaveProperty('candidate');
      expect(response.body).toHaveProperty('token');
      expect(response.body.emailVerificationRequired).toBe(true);
    });

    it('should return 409 if candidate already exists', async () => {
      mockDb.Candidate.findOne.mockResolvedValue(mockCandidate);

      const response = await request(candidateApp)
        .post('/register-candidate')
        .send(validCandidateData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Un compte candidat avec cet email existe déjà');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(candidateApp)
        .post('/register-candidate')
        .send({ email: 'candidate@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tous les champs obligatoires sont requis');
    });

    it('should return 400 if passwords do not match', async () => {
      const response = await request(candidateApp)
        .post('/register-candidate')
        .send({
          ...validCandidateData,
          confirmPassword: 'different_password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Les mots de passe ne correspondent pas');
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(candidateApp)
        .post('/register-candidate')
        .send({
          ...validCandidateData,
          password: '123',
          confirmPassword: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Le mot de passe doit contenir au moins 6 caractères');
    });
  });

  describe('POST /login-candidate', () => {
    it('should login candidate successfully', async () => {
      mockCandidate.checkPassword.mockResolvedValue(true);
      mockDb.Candidate.findOne.mockResolvedValue(mockCandidate);

      const response = await request(candidateApp)
        .post('/login-candidate')
        .send({
          email: 'candidate@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Connexion réussie');
      expect(response.body).toHaveProperty('candidate');
      expect(response.body).toHaveProperty('token');
      expect(response.body.hadSuspiciousActivity).toBe(false);
    });

    it('should return 401 if candidate not found', async () => {
      mockDb.Candidate.findOne.mockResolvedValue(null);

      const response = await request(candidateApp)
        .post('/login-candidate')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Email ou mot de passe incorrect');
    });

    it('should return 401 if password is incorrect', async () => {
      mockCandidate.checkPassword.mockResolvedValue(false);
      mockDb.Candidate.findOne.mockResolvedValue(mockCandidate);

      const response = await request(candidateApp)
        .post('/login-candidate')
        .send({
          email: 'candidate@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Email ou mot de passe incorrect');
    });

    it('should return 401 if candidate is inactive', async () => {
      mockDb.Candidate.findOne.mockResolvedValue({
        ...mockCandidate,
        isActive: false
      });

      const response = await request(candidateApp)
        .post('/login-candidate')
        .send({
          email: 'candidate@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Votre compte a été désactivé');
    });

    it('should return 400 if credentials are missing', async () => {
      const response = await request(candidateApp)
        .post('/login-candidate')
        .send({ email: 'candidate@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email et mot de passe requis');
    });
  });

  describe('POST /verify-email', () => {
    it('should verify candidate email successfully', async () => {
      const mockCandidateWithCode = {
        ...mockCandidate,
        emailVerified: false,
        emailVerificationCode: '123456',
        emailVerificationExpires: new Date(Date.now() + 600000),
        update: jest.fn().mockResolvedValue()
      };

      mockDb.Candidate.findOne.mockResolvedValue(mockCandidateWithCode);

      const response = await request(candidateApp)
        .post('/verify-email')
        .send({
          email: 'candidate@test.com',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Email vérifié avec succès');
      expect(response.body.emailVerified).toBe(true);
    });

    it('should return 400 if code is invalid', async () => {
      const mockCandidateWithCode = {
        ...mockCandidate,
        emailVerified: false,
        emailVerificationCode: '123456',
        emailVerificationExpires: new Date(Date.now() + 600000)
      };

      mockDb.Candidate.findOne.mockResolvedValue(mockCandidateWithCode);

      const response = await request(candidateApp)
        .post('/verify-email')
        .send({
          email: 'candidate@test.com',
          code: '654321'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Code de vérification invalide ou expiré');
    });

    it('should return 400 if email or code is missing', async () => {
      const response = await request(candidateApp)
        .post('/verify-email')
        .send({ email: 'candidate@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email et code de vérification requis');
    });

    it('should return 400 if code format is invalid', async () => {
      const response = await request(candidateApp)
        .post('/verify-email')
        .send({
          email: 'candidate@test.com',
          code: '12345' // Trop court
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Format de code invalide');
    });
  });

  describe('GET /profile', () => {
    it('should return candidate profile', async () => {
      mockDb.Candidate.findByPk.mockResolvedValue(mockCandidate);

      const response = await request(candidateApp).get('/profile');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('candidate');
    });

    it('should return 404 if candidate not found', async () => {
      mockDb.Candidate.findByPk.mockResolvedValue(null);

      const response = await request(candidateApp).get('/profile');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Candidat non trouvé');
    });
  });

  describe('PUT /profile', () => {
    it('should update candidate profile successfully', async () => {
      const updatedCandidate = { ...mockCandidate, firstName: 'Updated' };
      mockDb.Candidate.findByPk.mockResolvedValue(mockCandidate);
      mockCandidate.save = jest.fn().mockResolvedValue(updatedCandidate);

      const response = await request(candidateApp)
        .put('/profile')
        .send({ firstName: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profil mis à jour avec succès');
    });

    it('should return 404 if candidate not found', async () => {
      mockDb.Candidate.findByPk.mockResolvedValue(null);

      const response = await request(candidateApp)
        .put('/profile')
        .send({ firstName: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Candidat non trouvé');
    });
  });
});