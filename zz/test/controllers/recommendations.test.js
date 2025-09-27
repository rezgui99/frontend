const recommendationsController = require('../../src/controllers/recommendations');

// Mock du service de recommandation
jest.mock('../../src/services/recommendationService', () => ({
  checkHealth: jest.fn(),
  getJobRecommendations: jest.fn(),
  getTrainingRecommendations: jest.fn(),
  validateData: jest.fn(),
  getModelStatus: jest.fn(),
  retrainModels: jest.fn()
}));

const recommendationService = require('../../src/services/recommendationService');

const mockDb3 = {
  Employee: {
    findByPk: jest.fn()
  },
  JobDescription: {
    findByPk: jest.fn(),
    findAll: jest.fn()
  },
  EmployeeSkill: {},
  JobRequiredSkill: {},
  Skill: {},
  SkillLevel: {},
  SkillType: {}
};

jest.mock('../../models/index', () => mockDb3)
jest.mock('../../src/services/recommendationService', () => ({
  checkHealth: jest.fn(),
  getJobRecommendations: jest.fn(),
  getTrainingRecommendations: jest.fn(),
  validateData: jest.fn(),
  getModelStatus: jest.fn(),
  retrainModels: jest.fn()
}));;

describe('Recommendations Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRecommendationAPIHealth', () => {
    it('should return healthy API status', async () => {
      const mockHealthStatus = {
        status: 'healthy',
        api_url: 'http://localhost:8001',
        models: {}
      };

      recommendationService.checkHealth.mockResolvedValue(mockHealthStatus);

      const req = {};
      const res = {
        json: jest.fn()
      };

      await recommendationsController.checkRecommendationAPIHealth(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Statut de l\'API de recommandation',
        ml_api: mockHealthStatus,
        backend_status: 'healthy',
        timestamp: expect.any(String)
      });
    });

    it('should handle API health check error', async () => {
      recommendationService.checkHealth.mockRejectedValue(new Error('API unavailable'));

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.checkRecommendationAPIHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la vérification de l\'API de recommandation',
        details: 'API unavailable',
        ml_api: { status: 'unhealthy', error: 'API unavailable' },
        backend_status: 'healthy'
      });
    });
  });

  describe('getTrainingRecommendations', () => {
    const mockEmployee = {
      id: 1,
      name: 'Test Employee',
      position: 'Developer',
      department: 'IT',
      EmployeeSkills: []
    };

    const mockTargetJob = {
      id: 1,
      emploi: 'Senior Developer',
      filiere_activite: 'IT',
      famille: 'Development',
      requiredSkills: []
    };

    it('should get training recommendations successfully', async () => {
      mockDb3.Employee.findByPk.mockResolvedValue(mockEmployee);
      mockDb3.JobDescription.findByPk.mockResolvedValue(mockTargetJob);

      const req = {
        params: { employeeId: '1', jobId: '1' },
        query: {}
      };
      const res = {
        json: jest.fn()
      };

      // Mock la génération de recommandations (pas de service ML ici, juste le controller interne)
      await recommendationsController.getTrainingRecommendations(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 1,
          jobId: 1,
          employee: expect.objectContaining({
            name: 'Test Employee',
            position: 'Developer'
          }),
          targetJob: expect.objectContaining({
            title: 'Senior Developer'
          }),
          recommendations: expect.any(Array),
          totalRecommendations: expect.any(Number)
        })
      );
    });

    it('should return 404 if employee not found', async () => {
      mockDb3.Employee.findByPk.mockResolvedValue(null);

      const req = {
        params: { employeeId: '999', jobId: '1' },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.getTrainingRecommendations(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Employé non trouvé',
        employeeId: 999
      });
    });

    it('should return 404 if job not found', async () => {
      mockDb3.Employee.findByPk.mockResolvedValue(mockEmployee);
      mockDb3.JobDescription.findByPk.mockResolvedValue(null);

      const req = {
        params: { employeeId: '1', jobId: '999' },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.getTrainingRecommendations(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Poste non trouvé',
        jobId: 999
      });
    });

    it('should return 400 if parameters are missing', async () => {
      const req = {
        params: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.getTrainingRecommendations(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Paramètres manquants',
        details: 'employeeId et jobId sont requis'
      });
    });
  });

  describe('getEmployeeJobRecommendations', () => {
    const mockEmployee = {
      id: 1,
      name: 'Test Employee',
      position: 'Developer',
      department: 'IT',
      EmployeeSkills: []
    };

    const mockJobs = [
      {
        id: 1,
        emploi: 'Senior Developer',
        filiere_activite: 'IT',
        famille: 'Development',
        requiredSkills: []
      }
    ];

    it('should get job recommendations successfully', async () => {
      mockDb3.Employee.findByPk.mockResolvedValue(mockEmployee);
      mockDb3.JobDescription.findAll.mockResolvedValue(mockJobs);

      const mockRecommendations = [
        {
          job_id: 1,
          job_title: 'Senior Developer',
          compatibility_score: 0.85,
          readiness_level: 'Prêt'
        }
      ];

      recommendationService.getJobRecommendations.mockResolvedValue({
        recommendations: mockRecommendations,
        total: 1
      });

      const req = {
        params: { employeeId: '1' },
        query: {}
      };
      const res = {
        json: jest.fn()
      };

      await recommendationsController.getEmployeeJobRecommendations(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          recommendations: mockRecommendations,
          total: 1,
          generatedAt: expect.any(String)
        })
      );
    });

    it('should return 404 if employee not found', async () => {
      mockDb3.Employee.findByPk.mockResolvedValue(null);

      const req = {
        params: { employeeId: '999' },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.getEmployeeJobRecommendations(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Employé non trouvé',
        employeeId: 999
      });
    });

    it('should handle service error and return 500', async () => {
      mockDb3.Employee.findByPk.mockResolvedValue(mockEmployee);
      mockDb3.JobDescription.findAll.mockResolvedValue(mockJobs);

      recommendationService.getJobRecommendations.mockRejectedValue(
        new Error('Service unavailable')
      );

      const req = {
        params: { employeeId: '1' },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.getEmployeeJobRecommendations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur interne du moteur de recommandation de postes',
        details: 'Service unavailable'
      });
    });

    it('should filter jobs by department', async () => {
      mockDb3.Employee.findByPk.mockResolvedValue(mockEmployee);
      mockDb3.JobDescription.findAll.mockImplementation(({ where }) => {
        expect(where).toEqual({ filiere_activite: 'IT' });
        return Promise.resolve(mockJobs);
      });

      recommendationService.getJobRecommendations.mockResolvedValue({
        recommendations: [],
        total: 0
      });

      const req = {
        params: { employeeId: '1' },
        query: { department: 'IT' }
      };
      const res = {
        json: jest.fn()
      };

      await recommendationsController.getEmployeeJobRecommendations(req, res);

      expect(mockDb3.JobDescription.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { filiere_activite: 'IT' }
        })
      );
    });
  });

  describe('validateRecommendationData', () => {
    it('should validate data successfully', async () => {
      const mockValidationResult = { valid: true, errors: [] };
      recommendationService.validateData.mockResolvedValue(mockValidationResult);

      const req = { body: { data: 'test' } };
      const res = { json: jest.fn() };

      await recommendationsController.validateRecommendationData(req, res);

      expect(res.json).toHaveBeenCalledWith(mockValidationResult);
    });

    it('should handle validation error', async () => {
      recommendationService.validateData.mockRejectedValue(new Error('Validation failed'));

      const req = { body: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.validateRecommendationData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la validation des données',
        details: 'Validation failed'
      });
    });
  });

  describe('getModelStatus', () => {
    it('should return model status', async () => {
      const mockModelStatus = {
        training_model: { status: 'ready' },
        job_model: { status: 'ready' }
      };
      recommendationService.getModelStatus.mockResolvedValue(mockModelStatus);

      const req = {};
      const res = { json: jest.fn() };

      await recommendationsController.getModelStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Statut des modèles ML',
        models: mockModelStatus,
        timestamp: expect.any(String)
      });
    });
  });

  describe('retrainModels', () => {
    it('should retrain models successfully', async () => {
      const mockRetrainResult = { success: true, duration: '5min' };
      recommendationService.retrainModels.mockResolvedValue(mockRetrainResult);

      const req = {};
      const res = { json: jest.fn() };

      await recommendationsController.retrainModels(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Réentraînement des modèles terminé',
        result: mockRetrainResult,
        timestamp: expect.any(String)
      });
    });

    it('should handle retrain error', async () => {
      recommendationService.retrainModels.mockRejectedValue(new Error('Retrain failed'));

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await recommendationsController.retrainModels(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors du réentraînement des modèles',
        details: 'Retrain failed'
      });
    });
  });
});
