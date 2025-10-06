const request = require('supertest');
const express = require('express');
const employeeSkillController = require('../../src/controllers/employeeskill');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

const mockEmployeeSkill = {
  employee_id: 1,
  skill_id: 1,
  actual_skill_level_id: 3,
  acquired_date: '2022-01-01',
  certification: 'Certified',
  Employee: { id: 1, name: 'Test Employee' },
  Skill: { id: 1, name: 'JavaScript' },
  SkillLevel: { id: 3, level_name: 'Advanced', value: 3 },
  update: jest.fn(),
  destroy: jest.fn()
};

// Routes de test
app.get('/employee-skills', employeeSkillController.findAllEmployeeSkills);
app.get('/employee-skills/:employee_id/:skill_id', employeeSkillController.findEmployeeSkill);
app.post('/employee-skills', employeeSkillController.createEmployeeSkill);
app.put('/employee-skills/:employee_id/:skill_id', employeeSkillController.updateEmployeeSkill);
app.delete('/employee-skills/:employee_id/:skill_id', employeeSkillController.deleteEmployeeSkill);

describe('EmployeeSkill Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /employee-skills', () => {
    it('should return all employee skills', async () => {
      mockDb.EmployeeSkill.findAll.mockResolvedValue([mockEmployeeSkill]);

      const response = await request(app).get('/employee-skills');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockEmployeeSkill]);
    });

    it('should handle database error', async () => {
      mockDb.EmployeeSkill.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/employee-skills');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /employee-skills/:employee_id/:skill_id', () => {
    it('should return specific employee skill', async () => {
      mockDb.EmployeeSkill.findOne.mockResolvedValue(mockEmployeeSkill);

      const response = await request(app).get('/employee-skills/1/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEmployeeSkill);
    });

    it('should return 404 if employee skill not found', async () => {
      mockDb.EmployeeSkill.findOne.mockResolvedValue(null);

      const response = await request(app).get('/employee-skills/999/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Compétence de l'employé n'existe pas");
    });
  });

  describe('POST /employee-skills', () => {
    const validEmployeeSkillData = {
      employee_id: 1,
      skill_id: 2,
      actual_skill_level_id: 3,
      acquired_date: '2023-01-01',
      certification: 'New Certification'
    };

    it('should create employee skill successfully', async () => {
      mockDb.EmployeeSkill.findOne.mockResolvedValue(null); // No existing skill
      mockDb.EmployeeSkill.create.mockResolvedValue(mockEmployeeSkill);
      mockDb.EmployeeSkill.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockEmployeeSkill);

      const response = await request(app)
        .post('/employee-skills')
        .send(validEmployeeSkillData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockEmployeeSkill);
    });

    it('should return 409 if employee skill already exists', async () => {
      mockDb.EmployeeSkill.findOne.mockResolvedValue(mockEmployeeSkill);

      const response = await request(app)
        .post('/employee-skills')
        .send(validEmployeeSkillData);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Compétence de l'employé existe déjà");
    });
  });

  describe('PUT /employee-skills/:employee_id/:skill_id', () => {
    it('should update employee skill successfully', async () => {
      const updatedEmployeeSkill = { ...mockEmployeeSkill, certification: 'Updated Cert' };
      mockDb.EmployeeSkill.findOne.mockResolvedValue(mockEmployeeSkill);
      mockEmployeeSkill.update.mockResolvedValue(updatedEmployeeSkill);
      mockDb.EmployeeSkill.findOne.mockResolvedValueOnce(mockEmployeeSkill).mockResolvedValueOnce(updatedEmployeeSkill);

      const response = await request(app)
        .put('/employee-skills/1/1')
        .send({ certification: 'Updated Cert' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedEmployeeSkill);
    });

    it('should return 404 if employee skill not found', async () => {
      mockDb.EmployeeSkill.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/employee-skills/999/999')
        .send({ certification: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Compétence de l'employé n'existe pas");
    });
  });

  describe('DELETE /employee-skills/:employee_id/:skill_id', () => {
    it('should delete employee skill successfully', async () => {
      mockDb.EmployeeSkill.findOne.mockResolvedValue(mockEmployeeSkill);
      mockEmployeeSkill.destroy.mockResolvedValue();

      const response = await request(app).delete('/employee-skills/1/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Compétence de l'employé supprimée avec succès");
    });

    it('should return 404 if employee skill not found', async () => {
      mockDb.EmployeeSkill.findOne.mockResolvedValue(null);

      const response = await request(app).delete('/employee-skills/999/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Compétence de l'employé n'existe pas");
    });
  });
});