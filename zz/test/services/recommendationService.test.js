const RecommendationService = require('../../src/services/recommendationService');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('RecommendationService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    };
    
    axios.create.mockReturnValue(mockClient);
    RecommendationService.client = mockClient;
  });

  describe('checkHealth', () => {
    it('should return healthy status', async () => {
      mockClient.get.mockResolvedValue({
        data: { models: {} },
        headers: { 'x-response-time': '10ms' }
      });

      const result = await RecommendationService.checkHealth();

      expect(result).toEqual({
        status: 'healthy',
        api_url: expect.any(String),
        response_time: '10ms',
        models: {},
        timestamp: expect.any(String)
      });
    });

    it('should handle health check failure', async () => {
      mockClient.get.mockRejectedValue(new Error('Connection refused'));

      const result = await RecommendationService.checkHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        api_url: expect.any(String),
        error: 'Connection refused',
        timestamp: expect.any(String)
      });
    });

    it('should handle network timeout', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';
      mockClient.get.mockRejectedValue(timeoutError);

      const result = await RecommendationService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Service de recommandation indisponible');
    });
  });

  describe('getTrainingRecommendations', () => {
    const mockEmployee = {
      id: 1,
      name: 'Test Employee',
      position: 'Developer',
      skills: []
    };

    const mockTargetJob = {
      id: 1,
      emploi: 'Senior Developer',
      filiere_activite: 'IT'
    };

    it('should get training recommendations successfully', async () => {
      const mockRecommendations = [
        {
          skill_name: 'JavaScript',
          priority: 'Élevée',
          training_type: 'Formation en ligne'
        }
      ];

      mockClient.post.mockResolvedValue({
        data: mockRecommendations
      });

      const result = await RecommendationService.getTrainingRecommendations(
        mockEmployee,
        mockTargetJob
      );

      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toEqual(mockRecommendations);
      expect(result.engine).toBe('ml');
    });

    it('should handle API error', async () => {
      mockClient.post.mockRejectedValue(new Error('API Error'));

      await expect(RecommendationService.getTrainingRecommendations(
        mockEmployee,
        mockTargetJob
      )).rejects.toThrow('Erreur lors de la génération des recommandations de formation');
    });
  });

  describe('getJobRecommendations', () => {
    const mockEmployee = {
      id: 1,
      name: 'Test Employee',
      skills: [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          level_value: 3
        }
      ]
    };

    const mockJobs = [
      {
        id: 1,
        emploi: 'Frontend Developer',
        required_skills: [
          {
            skill_id: 1,
            skill_name: 'JavaScript',
            required_level_value: 2
          }
        ]
      }
    ];

    it('should get job recommendations from ML API', async () => {
      const mockRecommendations = [
        {
          job_id: 1,
          job_title: 'Frontend Developer',
          compatibility_score: 0.85
        }
      ];

      mockClient.post.mockResolvedValue({
        data: mockRecommendations
      });

      const result = await RecommendationService.getJobRecommendations(
        mockEmployee,
        mockJobs
      );

      expect(result.recommendations).toEqual(mockRecommendations);
      expect(result.engine).toBe('ml');
    });

    it('should fallback to local algorithm if ML API fails', async () => {
      mockClient.post.mockRejectedValue(new Error('ML API unavailable'));

      const result = await RecommendationService.getJobRecommendations(
        mockEmployee,
        mockJobs
      );

      expect(result.engine).toBe('fallback');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('convertEmployeeFormat', () => {
    it('should convert employee with skills correctly', () => {
      const employee = {
        id: 1,
        name: 'Test Employee',
        position: 'Developer',
        department: 'IT',
        hire_date: '2022-01-01',
        email: 'test@test.com',
        skills: [
          {
            skill_id: 1,
            Skill: { name: 'JavaScript', type: { type_name: 'Technical' } },
            SkillLevel: { value: 3, level_name: 'Advanced' },
            certification: 'Certified'
          }
        ]
      };

      const result = RecommendationService.convertEmployeeFormat(employee);

      expect(result).toEqual({
        id: 1,
        name: 'Test Employee',
        position: 'Developer',
        department: 'IT',
        hire_date: '2022-01-01',
        email: 'test@test.com',
        phone: '',
        location: '',
        skills: [
          {
            skill_id: 1,
            skill_name: 'JavaScript',
            skill_type: 'Technical',
            level_value: 3,
            level_name: 'Advanced',
            acquired_date: null,
            certification: true,
            last_evaluated_date: null,
            years_experience: 0
          }
        ]
      });
    });

    it('should handle employee without skills', () => {
      const employee = {
        id: 1,
        name: 'Test Employee',
        position: 'Manager',
        department: 'HR'
      };

      const result = RecommendationService.convertEmployeeFormat(employee);

      expect(result.skills).toEqual([]);
    });

    it('should handle EmployeeSkills relation format', () => {
      const employee = {
        id: 1,
        name: 'Test Employee',
        EmployeeSkills: [
          {
            skill_id: 1,
            Skill: { name: 'Python' },
            SkillLevel: { value: 4 }
          }
        ]
      };

      const result = RecommendationService.convertEmployeeFormat(employee);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].skill_name).toBe('Python');
    });
  });

  describe('convertJobFormat', () => {
    it('should convert job with required skills correctly', () => {
      const job = {
        id: 1,
        emploi: 'Software Engineer',
        filiere_activite: 'IT',
        famille: 'Development',
        niveau_exp: 'Senior',
        requiredSkills: [
          {
            skill_id: 1,
            Skill: { name: 'JavaScript', type: { type_name: 'Technical' } },
            SkillLevel: { value: 3, level_name: 'Advanced' },
            is_mandatory: true,
            weight: 1.0
          }
        ]
      };

      const result = RecommendationService.convertJobFormat(job);

      expect(result).toEqual({
        id: 1,
        title: 'Software Engineer',
        department: 'IT',
        family: 'Development',
        experience_level: 'Senior',
        required_skills: [
          {
            skill_id: 1,
            skill_name: 'JavaScript',
            skill_type: 'Technical',
            required_level_value: 3,
            required_level_name: 'Advanced',
            is_mandatory: true,
            weight: 1.0
          }
        ]
      });
    });

    it('should handle job without required skills', () => {
      const job = {
        id: 1,
        emploi: 'Manager',
        filiere_activite: 'HR'
      };

      const result = RecommendationService.convertJobFormat(job);

      expect(result.required_skills).toEqual([]);
    });
  });

  describe('localJobFallback', () => {
    it('should calculate job compatibility scores', () => {
      const employee = {
        id: 1,
        name: 'Test Employee',
        skills: [
          {
            skill_id: 1,
            skill_name: 'JavaScript',
            level_value: 3
          }
        ]
      };

      const jobs = [
        {
          id: 1,
          title: 'Frontend Developer',
          department: 'IT',
          required_skills: [
            {
              skill_id: 1,
              skill_name: 'JavaScript',
              required_level_value: 2,
              weight: 1.0
            }
          ]
        }
      ];

      const result = RecommendationService.localJobFallback(
        employee,
        jobs,
        { maxRecommendations: 10, minCompatibilityScore: 0.5 }
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          job_id: 1,
          job_title: 'Frontend Developer',
          department: 'IT',
          compatibility_score: expect.any(Number),
          readiness_level: expect.any(String),
          matching_skills: expect.any(Array),
          missing_skills: expect.any(Array),
          exceeding_skills: expect.any(Array)
        })
      );
    });

    it('should filter jobs below minimum compatibility score', () => {
      const employee = { 
        id: 1,
        skills: [
          {
            skill_id: 1,
            skill_name: 'JavaScript',
            level_value: 1
          }
        ]
      };

      const jobs = [
        {
          id: 1,
          title: 'Senior Developer',
          department: 'IT',
          required_skills: [
            {
              skill_id: 1,
              skill_name: 'JavaScript',
              required_level_value: 5,
              weight: 1.0
            }
          ]
        }
      ];

      const result = RecommendationService.localJobFallback(
        employee,
        jobs,
        { maxRecommendations: 10, minCompatibilityScore: 0.8 }
      );

      expect(result).toHaveLength(0); // Filtré car score trop bas
    });

    it('should handle employee with no matching skills', () => {
      const employee = { 
        id: 1,
        skills: [
          {
            skill_id: 999,
            skill_name: 'Unrelated Skill',
            level_value: 3
          }
        ]
      };

      const jobs = [
        {
          id: 1,
          title: 'Developer',
          department: 'IT',
          required_skills: [
            {
              skill_id: 1,
              skill_name: 'JavaScript',
              required_level_value: 3,
              weight: 1.0
            }
          ]
        }
      ];

      const result = RecommendationService.localJobFallback(
        employee,
        jobs,
        { maxRecommendations: 10, minCompatibilityScore: 0.1 }
      );

      expect(result[0].compatibility_score).toBe(0);
      expect(result[0].missing_skills).toHaveLength(1);
      expect(result[0].matching_skills).toHaveLength(0);
      expect(result[0].exceeding_skills).toHaveLength(0);
    });

    it('should sort results by compatibility score', () => {
      const employee = {
        id: 1,
        skills: [
          { skill_id: 1, level_value: 4 },
          { skill_id: 2, level_value: 2 }
        ]
      };

      const jobs = [
        {
          id: 1,
          title: 'Job A',
          required_skills: [{ skill_id: 1, required_level_value: 5, weight: 1.0 }]
        },
        {
          id: 2,
          title: 'Job B',
          required_skills: [{ skill_id: 1, required_level_value: 3, weight: 1.0 }]
        }
      ];

      const result = RecommendationService.localJobFallback(
        employee,
        jobs,
        { maxRecommendations: 10, minCompatibilityScore: 0.1 }
      );

      expect(result[0].compatibility_score).toBeGreaterThan(result[1].compatibility_score);
    });

    it('should respect maxRecommendations limit', () => {
      const employee = { id: 1, skills: [] };
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Job ${i + 1}`,
        required_skills: []
      }));

      const result = RecommendationService.localJobFallback(
        employee,
        jobs,
        { maxRecommendations: 3, minCompatibilityScore: 0 }
      );

      expect(result).toHaveLength(3);
    });
  });

  describe('validateData', () => {
    it('should validate data successfully', async () => {
      const mockValidationResult = { valid: true, errors: [] };
      mockClient.post.mockResolvedValue({ data: mockValidationResult });

      const result = await RecommendationService.validateData({ test: 'data' });

      expect(result).toEqual(mockValidationResult);
    });

    it('should handle validation error', async () => {
      mockClient.post.mockRejectedValue(new Error('Validation failed'));

      await expect(RecommendationService.validateData({}))
        .rejects.toThrow('Erreur lors de la validation des données');
    });
  });

  describe('getModelStatus', () => {
    it('should return model status', async () => {
      const mockStatus = { initialized: true, models: ['training', 'job'] };
      mockClient.get.mockResolvedValue({ data: mockStatus });

      const result = await RecommendationService.getModelStatus();

      expect(result).toEqual(mockStatus);
    });
  });

  describe('retrainModels', () => {
    it('should retrain models successfully', async () => {
      const mockResult = { success: true, duration: '5min' };
      mockClient.post.mockResolvedValue({ data: mockResult });

      const result = await RecommendationService.retrainModels();

      expect(result).toEqual(mockResult);
    });
  });
});