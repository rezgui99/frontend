const { authenticateToken, authorizeRoles, generateToken } = require('../../src/middleware/auth');
const { mockDb, mockUser } = require('../mocks');
const jwt = require('jsonwebtoken');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      jwt.sign.mockReturnValue('test_token');

      const token = generateToken(1, 'user');

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, type: 'user' },
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
      expect(token).toBe('test_token');
    });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      req.headers.authorization = 'Bearer valid_token';
      jwt.verify.mockReturnValue({ userId: 1, type: 'user' });
      mockDb.User.findByPk.mockResolvedValue(mockUser);
      mockDb.User.findByPk.mockResolvedValueOnce(mockUser).mockResolvedValueOnce({
        ...mockUser,
        roles: [{ name: 'hr', is_active: true }]
      });

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toHaveProperty('id', 1);
      expect(req.user).toHaveProperty('role', 'hr');
      expect(req.user).toHaveProperty('roles', ['hr']);
    });

    it('should return 401 if no token provided', async () => {
      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid_token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token invalide'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      req.headers.authorization = 'Bearer expired_token';
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        message: 'Votre session a expiré, veuillez vous reconnecter'
      });
    });

    it('should return 401 if user not found', async () => {
      req.headers.authorization = 'Bearer valid_token';
      jwt.verify.mockReturnValue({ userId: 999, type: 'user' });
      mockDb.User.findByPk.mockResolvedValue(null);

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token invalide ou utilisateur inactif'
      });
    });

    it('should return 401 if user is inactive', async () => {
      req.headers.authorization = 'Bearer valid_token';
      jwt.verify.mockReturnValue({ userId: 1, type: 'user' });
      mockDb.User.findByPk.mockResolvedValue({
        ...mockUser,
        isActive: false
      });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token invalide ou utilisateur inactif'
      });
    });
  });

  describe('authorizeRoles', () => {
    it('should authorize user with required role', () => {
      req.user = { roles: ['admin', 'hr'] };
      const middleware = authorizeRoles('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access if user lacks required role', () => {
      req.user = { roles: ['user'] };
      const middleware = authorizeRoles('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'Permissions insuffisantes pour cette action'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should authorize if user has any of the required roles', () => {
      req.user = { roles: ['hr'] };
      const middleware = authorizeRoles('admin', 'hr');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no user in request', () => {
      req.user = null;
      const middleware = authorizeRoles('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Authentification requise'
      });
    });
  });
});