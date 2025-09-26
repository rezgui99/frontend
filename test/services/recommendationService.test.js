const RecommendationService = require('../../src/services/recommendationService');
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn()
      }
    }
  }))
}));
// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('RecommendationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock axios.create
    axios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status', async () => {
      const mockClient = axios.create();
      mockClient.get.mockResolvedValue({
        data: { models: {} },
        headers: { 'x-response-time': '10ms' }
      });

      // Override the client in the service
      RecommendationService.client = mockClient;

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
      const mockClient = axios.create();
      mockClient.get.mockRejectedValue(new Error('Connection refused'));

      RecommendationService.client = mockClient;

      const result = await RecommendationService.checkHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        api_url: expect.any(String),
        error: 'Connection refused',
        timestamp: expect.any(String)
      });
    });
  });

  describe('convertEmployeeFormat', () => {
    it('should convert employee with skills correctly', () => {
      const employee = {
        id: 1,
        name: 'Test Employee',
        position: 'Developer',
        department: 'IT',
        skills: [
          {
            skill_id: 1,
            Skill: { name: 'JavaScript', type: { type_name: 'Technical' } },
            SkillLevel: { value: 3, level_name: 'Advanced' },
            certification: true
          }
        ]
      };

      const result = RecommendationService.convertEmployeeFormat(employee);

      expect(result).toEqual({
        id: 1,
        name: 'Test Employee',
        position: 'Developer',
        department: 'IT',
        hire_date: null,
        email: null,
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
  });

  describe('convertJobFormat', () => {
    it('should convert job with required skills correctly', () => {
      const job = {
        id: 1,
        emploi: 'Software Engineer',
        filiere_activite: 'IT',
        famille: 'Development',
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
        experience_level: null,
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
  });

  describe('localJobFallback', () => {
    it('should calculate job compatibility scores', () => {
      const employee = {
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
  });
});