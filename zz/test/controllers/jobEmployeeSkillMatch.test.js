const jobEmployeeSkillMatchController = require('../../src/controllers/jobemployeeskillmatch');

// Mock fetch global
global.fetch = jest.fn();

const mockJobSkillMatchData = {
  job_description_id: 1,
  required_skills_level: [
    {
      skill_id: 1,
      skill_name: 'JavaScript',
      level_id: 3,
      level_value: 3
    }
  ],
  matching_employees: [
    {
      employee_id: 1,
      name: 'John Doe',
      email: 'john@test.com',
      position: 'Developer',
      actual_skills_level: [
        {
          skill_id: 1,
          skill_name: 'JavaScript',
          level_id: 4,
          level_value: 4
        }
      ]
    }
  ]
};

const mockDb2 = {
  JobDescription: {
    findByPk: jest.fn()
  },
  JobRequiredSkill: {
    findAll: jest.fn()
  },
  Employee: {
    findAll: jest.fn()
  },
  Skill: {},
  SkillLevel: {},
  EmployeeSkill: {}
};

jest.mock('../../models/index', () => mockDb2);

describe('JobEmployeeSkillMatch Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FAST_API_URL = 'http://localhost:8000';
  });

  describe('JobEmployeeSkillMatch', () => {
    it('should return job skill match results successfully', async () => {
      const mockJob = { id: 1, emploi: 'Developer' };
      const mockJobSkills = [
        {
          skill_id: 1,
          required_skill_level_id: 3,
          Skill: { id: 1, name: 'JavaScript' },
          SkillLevel: { id: 3, value: 3 }
        }
      ];
      const mockEmployees = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@test.com',
          position: 'Developer',
          EmployeeSkills: [
            {
              skill_id: 1,
              Skill: { id: 1, name: 'JavaScript' },
              SkillLevel: { id: 4, value: 4 }
            }
          ]
        }
      ];

      mockDb2.JobDescription.findByPk.mockResolvedValue(mockJob);
      mockDb2.JobRequiredSkill.findAll.mockResolvedValue(mockJobSkills);
      mockDb2.Employee.findAll.mockResolvedValue(mockEmployees);

      // Mock FastAPI response
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockJobSkillMatchData)
      });

      const req = { params: { jobId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await jobEmployeeSkillMatchController.JobEmployeeSkillMatch(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockJobSkillMatchData);
    });

    it('should return 404 if job not found', async () => {
      mockDb2.JobDescription.findByPk.mockResolvedValue(null);

      const req = { params: { jobId: '999' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await jobEmployeeSkillMatchController.JobEmployeeSkillMatch(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Fiche de poste introuvable."
      });
    });

    it('should handle no required skills', async () => {
      const mockJob = { id: 1, emploi: 'Developer' };
      
      mockDb2.JobDescription.findByPk.mockResolvedValue(mockJob);
      mockDb2.JobRequiredSkill.findAll.mockResolvedValue([]); // Pas de compétences requises

      const req = { params: { jobId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await jobEmployeeSkillMatchController.JobEmployeeSkillMatch(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Aucune compétence requise définie pour cette fiche de poste.",
        job_description_id: 1,
        required_skills_level: [],
        matching_employees: []
      });
    });

    it('should handle FastAPI error', async () => {
      const mockJob = { id: 1, emploi: 'Developer' };
      const mockJobSkills = [
        {
          skill_id: 1,
          required_skill_level_id: 3,
          Skill: { id: 1, name: 'JavaScript' },
          SkillLevel: { id: 3, value: 3 }
        }
      ];
      const mockEmployees = [];

      mockDb2.JobDescription.findByPk.mockResolvedValue(mockJob);
      mockDb2.JobRequiredSkill.findAll.mockResolvedValue(mockJobSkills);
      mockDb2.Employee.findAll.mockResolvedValue(mockEmployees);

      // Mock FastAPI error
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      const req = { params: { jobId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await jobEmployeeSkillMatchController.JobEmployeeSkillMatch(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Erreur serveur interne."
      });
    });
  });
});
