const { requireRole, requireAdmin, requireAdminOrHR, auditAction } = require('../../src/middleware/roleAuth');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

describe('Role Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
      originalUrl: '/test',
      userRoles: null,
      auditInfo: null,
      ip: '127.0.0.1',
      get: jest.fn(() => 'Test User Agent')
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireRole', () => {
    it('should allow access with correct role', async () => {
      req.user = { id: 1, roles: ['admin'] };
      const middleware = requireRole('admin');

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userRoles).toEqual(['admin']);
    });

    it('should allow access with any of multiple required roles', async () => {
      req.user = { id: 1, roles: ['hr'] };
      const middleware = requireRole('admin', 'hr');

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access without required role', async () => {
      req.user = { id: 1, roles: ['user'] };
      const middleware = requireRole('admin');

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'Accès refusé. Rôles requis: admin'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if no user in request', async () => {
      const middleware = requireRole('admin');

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Authentification requise'
      });
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin access', async () => {
      req.user = { id: 1, roles: ['admin'] };

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny non-admin access', async () => {
      req.user = { id: 1, roles: ['hr'] };

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAdminOrHR', () => {
    it('should allow admin access', async () => {
      req.user = { id: 1, roles: ['admin'] };

      await requireAdminOrHR(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow HR access', async () => {
      req.user = { id: 1, roles: ['hr'] };

      await requireAdminOrHR(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny regular user access', async () => {
      req.user = { id: 1, roles: ['user'] };

      await requireAdminOrHR(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('auditAction', () => {
    it('should add audit info to request', async () => {
      const middleware = auditAction('CREATE', 'Users');

      await middleware(req, res, next);

      expect(req.auditInfo).toEqual({
        action: 'CREATE',
        tableName: 'Users',
        ip_address: '127.0.0.1',
        user_agent: 'Test User Agent'
      });
      expect(next).toHaveBeenCalled();
    });
  });
});