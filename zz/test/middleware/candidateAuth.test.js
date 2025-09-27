const { authenticateCandidateToken } = require('../../src/middleware/candidateAuth');
const { mockDb, mockCandidate } = require('../mocks');
const jwt = require('jsonwebtoken');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('jsonwebtoken');

describe('Candidate Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      candidate: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateCandidateToken', () => {
    it('should authenticate valid candidate token', async () => {
      req.headers.authorization = 'Bearer valid_candidate_token';
      jwt.verify.mockReturnValue({ userId: 1, type: 'candidate' });
      mockDb.Candidate.findByPk.mockResolvedValue(mockCandidate);

      await authenticateCandidateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.candidate).toEqual(mockCandidate.toJSON());
    });

    it('should return 401 if no token provided', async () => {
      await authenticateCandidateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token type is not candidate', async () => {
      req.headers.authorization = 'Bearer user_token';
      jwt.verify.mockReturnValue({ userId: 1, type: 'user' });

      await authenticateCandidateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token type',
        message: "Token invalide pour l'espace candidat"
      });
    });

    it('should return 401 if candidate not found', async () => {
      req.headers.authorization = 'Bearer valid_candidate_token';
      jwt.verify.mockReturnValue({ userId: 999, type: 'candidate' });
      mockDb.Candidate.findByPk.mockResolvedValue(null);

      await authenticateCandidateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token invalide ou compte candidat inactif'
      });
    });

    it('should return 401 if candidate is inactive', async () => {
      req.headers.authorization = 'Bearer valid_candidate_token';
      jwt.verify.mockReturnValue({ userId: 1, type: 'candidate' });
      mockDb.Candidate.findByPk.mockResolvedValue({
        ...mockCandidate,
        isActive: false
      });

      await authenticateCandidateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token invalide ou compte candidat inactif'
      });
    });

    it('should handle token expiration', async () => {
      req.headers.authorization = 'Bearer expired_token';
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      await authenticateCandidateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        message: 'Votre session a expiré, veuillez vous reconnecter'
      });
    });
  });
});