const request = require('supertest');
const express = require('express');
const userManagementController = require('../../src/controllers/userManagement');
const { mockDb, mockUser } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

// Mock admin user middleware
app.use((req, res, next) => {
  req.user = { id: 1, username: 'admin', role: 'admin', roles: ['admin'] };
  req.auditInfo = {
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent'
  };
  next();
});

// Routes de test
app.post('/admin/users', userManagementController.createUser);
app.get('/admin/users', userManagementController.getAllUsers);
app.get('/admin/users/:id', userManagementController.getUserById);
app.put('/admin/users/:id', userManagementController.updateUser);
app.delete('/admin/users/:id', userManagementController.deleteUser);
app.post('/admin/roles/assign', userManagementController.assignRole);
app.post('/admin/roles/remove', userManagementController.removeRole);
app.get('/admin/roles', userManagementController.getAllRoles);
app.patch('/admin/users/:id/toggle-status', userManagementController.toggleUserStatus);
app.post('/admin/users/:id/reset-password', userManagementController.adminResetPassword);

describe('UserManagement Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('POST /admin/users', () => {
    const validUserData = {
      username: 'newuser',
      firstName: 'New',
      lastName: 'User',
      email: 'newuser@test.com',
      password: 'password123',
      roleIds: [1]
    };

    it('should create user successfully', async () => {
      mockDb.User.findOne.mockResolvedValue(null); // No existing user
      mockDb.User.create.mockResolvedValue(mockUser);
      mockDb.Role.findAll.mockResolvedValue([{ id: 1, name: 'hr' }]);
      mockUser.setRoles = jest.fn();
      mockDb.User.findByPk.mockResolvedValue({
        ...mockUser,
        roles: [{ name: 'hr' }]
      });
      mockDb.AuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/admin/users')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Utilisateur créé avec succès');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/admin/users')
        .send({ username: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 409 if user already exists', async () => {
      mockDb.User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/admin/users')
        .send(validUserData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('GET /admin/users', () => {
    it('should return all users with pagination', async () => {
      mockDb.User.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockUser]
      });

      const response = await request(app).get('/admin/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter users by search term', async () => {
      mockDb.User.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockUser]
      });

      const response = await request(app).get('/admin/users?search=test');

      expect(response.status).toBe(200);
      expect(mockDb.User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [mockDb.sequelize.Sequelize.Op.or]: expect.any(Array)
          })
        })
      );
    });
  });

  describe('POST /admin/roles/assign', () => {
    it('should assign role successfully', async () => {
      mockDb.User.findByPk.mockResolvedValue(mockUser);
      mockDb.Role.findByPk.mockResolvedValue({ id: 1, name: 'hr' });
      mockDb.UserRole.findOne.mockResolvedValue(null); // No existing assignment
      mockDb.UserRole.create.mockResolvedValue({});
      mockDb.AuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/admin/roles/assign')
        .send({ userId: 1, roleId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('attribué avec succès');
    });

    it('should return 409 if role already assigned', async () => {
      mockDb.User.findByPk.mockResolvedValue(mockUser);
      mockDb.Role.findByPk.mockResolvedValue({ id: 1, name: 'hr' });
      mockDb.UserRole.findOne.mockResolvedValue({ user_id: 1, role_id: 1 });

      const response = await request(app)
        .post('/admin/roles/assign')
        .send({ userId: 1, roleId: 1 });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Role already assigned');
    });
  });

  describe('PATCH /admin/users/:id/toggle-status', () => {
    it('should toggle user status successfully', async () => {
      const inactiveUser = { ...mockUser, isActive: false, update: jest.fn() };
      mockDb.User.findByPk.mockResolvedValue(inactiveUser);
      mockDb.AuditLog.create.mockResolvedValue({});

      const response = await request(app).patch('/admin/users/2/toggle-status');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('activé avec succès');
    });

    it('should prevent deactivating own account', async () => {
      mockDb.User.findByPk.mockResolvedValue(mockUser); // Same ID as req.user

      const response = await request(app).patch('/admin/users/1/toggle-status');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot deactivate own account');
    });
  });
});