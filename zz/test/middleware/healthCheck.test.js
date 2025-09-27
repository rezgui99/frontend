const { checkExternalServices, globalHealthCheck } = require('../../src/middleware/healthCheck');

// Mock des dépendances
jest.mock('../../src/services/recommendationService', () => ({
  checkHealth: jest.fn()
}));

const recommendationService = require('../../src/services/recommendationService');

describe('HealthCheck Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { path: '/test' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('checkExternalServices', () => {
    it('should pass through for non-recommendation routes', async () => {
      req.path = '/api/users';

      await checkExternalServices(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(recommendationService.checkHealth).not.toHaveBeenCalled();
    });

    it('should check ML API health for recommendation routes', async () => {
      req.path = '/api/recommendations/training';
      recommendationService.checkHealth.mockResolvedValue({ status: 'healthy' });

      await checkExternalServices(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(recommendationService.checkHealth).toHaveBeenCalled();
    });

    it('should return 503 if ML API is unhealthy', async () => {
      req.path = '/api/recommendations/training';
      recommendationService.checkHealth.mockResolvedValue({ status: 'unhealthy' });

      await checkExternalServices(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Service de recommandation indisponible',
        details: "L'API de machine learning n'est pas accessible",
        ml_api_status: { status: 'unhealthy' },
        suggestion: 'Vérifiez que l\'API de recommandation est démarrée sur le port 8001'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should continue even if health check fails', async () => {
      req.path = '/api/recommendations/training';
      recommendationService.checkHealth.mockRejectedValue(new Error('Connection failed'));

      await checkExternalServices(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip health check for health endpoint', async () => {
      req.path = '/api/recommendations/health';

      await checkExternalServices(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(recommendationService.checkHealth).not.toHaveBeenCalled();
    });
  });

  describe('globalHealthCheck', () => {
    it('should return healthy status when all services are up', async () => {
      // Mock database connection
      const mockSequelize = {
        authenticate: jest.fn().mockResolvedValue()
      };
      jest.doMock('../../models', () => ({ sequelize: mockSequelize }));
      
      recommendationService.checkHealth.mockResolvedValue({ status: 'healthy' });

      await globalHealthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          services: expect.objectContaining({
            backend: expect.objectContaining({ status: 'healthy' }),
            database: expect.objectContaining({ status: 'healthy' }),
            ml_api: expect.objectContaining({ status: 'healthy' })
          })
        })
      );
    });

    it('should return degraded status when ML API is down', async () => {
      const mockSequelize = {
        authenticate: jest.fn().mockResolvedValue()
      };
      jest.doMock('../../models', () => ({ sequelize: mockSequelize }));
      
      recommendationService.checkHealth.mockResolvedValue({ status: 'unhealthy' });

      await globalHealthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded'
        })
      );
    });

    it('should handle database connection error', async () => {
      const mockSequelize = {
        authenticate: jest.fn().mockRejectedValue(new Error('DB Connection failed'))
      };
      jest.doMock('../../models', () => ({ sequelize: mockSequelize }));
      
      recommendationService.checkHealth.mockResolvedValue({ status: 'healthy' });

      await globalHealthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          services: expect.objectContaining({
            database: expect.objectContaining({
              status: 'unhealthy',
              error: 'DB Connection failed'
            })
          })
        })
      );
    });

    it('should handle complete health check failure', async () => {
      // Simulate complete failure
      jest.doMock('../../models', () => {
        throw new Error('Models not available');
      });

      await globalHealthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
          error: expect.any(String)
        })
      );
    });
  });
});