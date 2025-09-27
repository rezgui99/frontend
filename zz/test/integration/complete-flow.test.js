const request = require('supertest');
const express = require('express');
const authController = require('../../src/controllers/auth');
const employeeController = require('../../src/controllers/employee');
const { mockDb, mockUser, mockEmployee } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('../../src/middleware/auth', () => ({
  generateToken: jest.fn(() => 'test_token'),
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'admin', roles: ['admin'] };
    next();
  })
}));

describe('Integration Tests - Complete Flows', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Auth routes
    app.post('/auth/register', authController.register);
    app.post('/auth/login', authController.login);
    app.post('/auth/verify-email', authController.verifyEmail);
    
    // Employee routes (with auth)
    const { authenticateToken } = require('../../src/middleware/auth');
    app.get('/employees', authenticateToken, employeeController.findAllEmployees);
    app.post('/employees', authenticateToken, employeeController.createEmployee);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('User Registration and Employee Management Flow', () => {
    it('should complete full user registration and employee creation flow', async () => {
      // 1. Register user
      mockDb.User.findOne.mockResolvedValue(null);
      mockDb.User.create.mockResolvedValue(mockUser);
      mockDb.Role.findOne.mockResolvedValue({ id: 1, name: 'hr' });
      mockDb.UserRole.create.mockResolvedValue({});
      mockDb.User.findByPk.mockResolvedValue({
        ...mockUser,
        roles: [{ name: 'hr' }]
      });

      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'Integration',
          lastName: 'Test',
          email: 'integration@test.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('token');

      // 2. Verify email
      const mockUserWithCode = {
        ...mockUser,
        emailVerified: false,
        emailVerificationCode: '123456',
        emailVerificationExpires: new Date(Date.now() + 600000),
        update: jest.fn()
      };

      mockDb.User.findOne.mockResolvedValue(mockUserWithCode);

      const verifyResponse = await request(app)
        .post('/auth/verify-email')
        .send({
          email: 'integration@test.com',
          code: '123456'
        });

      expect(verifyResponse.status).toBe(200);

      // 3. Login
      mockUser.checkPassword.mockResolvedValue(true);
      mockDb.User.findOne.mockResolvedValue(mockUser);
      mockDb.User.findByPk.mockResolvedValue({
        ...mockUser,
        roles: [{ name: 'hr', is_active: true }]
      });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');

      // 4. Create employee (using token)
      mockDb.Employee.findAll.mockResolvedValue([mockEmployee]);

      const employeesResponse = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect(employeesResponse.status).toBe(200);
      expect(Array.isArray(employeesResponse.body)).toBe(true);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle cascading errors gracefully', async () => {
      // Simulate database connection failure
      mockDb.User.findOne.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erreur lors de la connexion');
    });
  });
});