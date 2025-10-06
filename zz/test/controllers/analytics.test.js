const request = require('supertest');
const express = require('express');
const analyticsController = require('../../src/controllers/analytics');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('../../src/middleware/gemini.service', () => ({
  generateAnalyticsReport: jest.fn(() => 'Mock AI Report'),
  generateEmployeeRecommendations: jest.fn(() => 'Mock Employee Recommendations')
}));
jest.mock('../../src/middleware/pdf.service', () => ({
  generateReportPDF: jest.fn(() => Buffer.from('Mock PDF')),
  generateEmployeeRecommendationPDF: jest.fn(() => Buffer.from('Mock Employee PDF'))
}));

const app = express();
app.use(express.json());

// Mock user middleware
app.use((req, res, next) => {
  req.user = { id: 1, username: 'testuser', role: 'admin' };
  next();
});

// Routes de test
app.get('/analytics/overview', analyticsController.getAnalyticsOverview);
app.get('/analytics/dashboard', analyticsController.getAdvancedDashboard);
app.get('/analytics/employee/:employeeId/recommendations', analyticsController.getEmployeeSkillRecommendations);
app.post('/analytics/predict-success', analyticsController.predictApplicationSuccess);
app.get('/analytics/departments', analyticsController.getDepartmentStatistics);
app.get('/analytics/contract-types', analyticsController.getContractTypeStatistics);
app.get('/analytics/skills-demand', analyticsController.getSkillsDemandAnalysis);
app.get('/analytics/reports/ai-generated', analyticsController.generateAIReport);

describe('Analytics Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock sequelize query method
    mockDb.sequelize.query = jest.fn();
  });

  describe('GET /analytics/overview', () => {
    it('should return analytics overview', async () => {
      mockDb.Employee.count.mockResolvedValue(50);
      mockDb.JobDescription.count.mockResolvedValue(25);
      mockDb.JobOffer.count.mockResolvedValue(30);
      mockDb.sequelize.query.mockResolvedValue([
        { filiere_activite: 'IT', job_count: '10' },
        { skill_id: 1, skill_name: 'JavaScript', demand_count: '5' }
      ]);

      const response = await request(app).get('/analytics/overview');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_employees');
      expect(response.body).toHaveProperty('total_job_descriptions');
      expect(response.body).toHaveProperty('total_applications');
      expect(response.body).toHaveProperty('overall_success_rate');
    });
  });

  describe('GET /analytics/dashboard', () => {
    it('should return advanced dashboard', async () => {
      mockDb.Employee.count.mockResolvedValue(50);
      mockDb.JobDescription.count.mockResolvedValue(25);
      mockDb.JobOffer.count.mockResolvedValue(30);

      const response = await request(app).get('/analytics/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('departmentAnalysis');
      expect(response.body).toHaveProperty('skillsAnalysis');
      expect(response.body).toHaveProperty('recommendations');
    });
  });

  describe('GET /analytics/employee/:employeeId/recommendations', () => {
    it('should return employee skill recommendations', async () => {
      mockDb.Employee.findByPk.mockResolvedValue({
        id: 1,
        name: 'Test Employee',
        position: 'Developer'
      });
      mockDb.sequelize.query
        .mockResolvedValueOnce([]) // departments
        .mockResolvedValueOnce([]) // employee skills
        .mockResolvedValueOnce([]); // required skills

      const response = await request(app).get('/analytics/employee/1/recommendations');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employee_id');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('career_opportunities');
    });

    it('should return 404 if employee not found', async () => {
      mockDb.Employee.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/analytics/employee/999/recommendations');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Employé non trouvé');
    });
  });

  describe('POST /analytics/predict-success', () => {
    it('should predict application success', async () => {
      mockDb.Employee.findByPk.mockResolvedValue({
        id: 1,
        name: 'Test Employee',
        hire_date: '2020-01-01'
      });
      mockDb.JobDescription.findByPk.mockResolvedValue({
        id: 1,
        emploi: 'Software Engineer'
      });
      mockDb.sequelize.query
        .mockResolvedValueOnce([]) // employee skills
        .mockResolvedValueOnce([]); // required skills

      const response = await request(app)
        .post('/analytics/predict-success')
        .send({
          employee_id: 1,
          job_description_id: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success_probability');
      expect(response.body).toHaveProperty('confidence_level');
      expect(response.body).toHaveProperty('key_factors');
    });
  });

  describe('GET /analytics/departments', () => {
    it('should return department statistics', async () => {
      mockDb.sequelize.query.mockResolvedValue([
        { department: 'IT', employee_count: '10' },
        { department: 'HR', employee_count: '5' }
      ]);

      const response = await request(app).get('/analytics/departments');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('department');
      expect(response.body[0]).toHaveProperty('employee_count');
    });
  });

  describe('GET /analytics/skills-demand', () => {
    it('should return skills demand analysis', async () => {
      mockDb.sequelize.query.mockResolvedValue([
        { skill_id: 1, skill_name: 'JavaScript', demand_count: '5' },
        { skill_id: 2, skill_name: 'Python', demand_count: '3' }
      ]);

      const response = await request(app).get('/analytics/skills-demand');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('skill_name');
      expect(response.body[0]).toHaveProperty('demand_count');
    });
  });

  describe('GET /analytics/reports/ai-generated', () => {
    it('should generate AI report as PDF', async () => {
      mockDb.Employee.count.mockResolvedValue(50);
      mockDb.JobOffer.count.mockResolvedValue(30);

      const response = await request(app).get('/analytics/reports/ai-generated');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });
});