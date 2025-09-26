
const request = require('supertest');
const express = require('express'); // ✅ AJOUTÉ
const candidateAuthController = require('../../src/controllers/candidateAuth');
const { mockDb } = require('../mocks');
const mockCandidate = {
  id: 1,
  firstName: 'Test',
  lastName: 'Candidate',
  email: 'candidate@test.com',
  isActive: true,
  emailVerified: false,
  toJSON: jest.fn(() => ({
    id: 1,
    firstName: 'Test',
    lastName: 'Candidate',
    email: 'candidate@test.com'
  })),
  checkPassword: jest.fn(),
  update: jest.fn(),
  save: jest.fn()
};

const candidateApp = express();
candidateApp.use(express.json());
candidateApp.post('/register-candidate', candidateAuthController.registerCandidate);
candidateApp.post('/login-candidate', candidateAuthController.loginCandidate);

describe('Candidate Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(response.body).toHaveProperty('message');
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
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('candidate');
      expect(response.body).toHaveProperty('token');
    });
  });
});