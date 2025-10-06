const request = require('supertest');
const express = require('express');
const employeeController = require('../../src/controllers/employee');
const { mockDb, mockEmployee } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('fs');
jest.mock('path');

const app = express();
app.use(express.json());

// Routes de test
app.get('/employees', employeeController.findAllEmployees);
app.get('/employees/:id', employeeController.findEmployeeById);
app.post('/employees', employeeController.createEmployee);
app.put('/employees/:id', employeeController.updateEmployee);
app.delete('/employees/:id', employeeController.deleteEmployee);

describe('Employee Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /employees', () => {
    it('should return all employees', async () => {
      mockDb.Employee.findAll.mockResolvedValue([mockEmployee]);

      const response = await request(app).get('/employees');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockEmployee]);
      expect(mockDb.Employee.findAll).toHaveBeenCalledWith({
        include: expect.any(Array)
      });
    });

    it('should handle database error', async () => {
      mockDb.Employee.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/employees');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /employees/:id', () => {
    it('should return employee by id', async () => {
      mockDb.Employee.findByPk.mockResolvedValue(mockEmployee);

      const response = await request(app).get('/employees/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEmployee);
    });

    it('should return 404 if employee not found', async () => {
      mockDb.Employee.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/employees/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("L'employée n'existe pas");
    });
  });

  describe('POST /employees', () => {
    const validEmployeeData = {
      name: 'New Employee',
      position: 'Developer',
      hire_date: '2023-01-01',
      email: 'new@test.com',
      phone: '+216123456789',
      gender: 'Homme',
      location: 'Tunis',
      department: 'IT',
      notes: 'Test notes',
      skills: JSON.stringify([])
    };

    it('should create employee successfully', async () => {
      const createdEmployee = { ...mockEmployee, id: 2 };
      mockDb.Employee.create.mockResolvedValue(createdEmployee);
      mockDb.Employee.findByPk.mockResolvedValue(createdEmployee);

      const response = await request(app)
        .post('/employees')
        .send(validEmployeeData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdEmployee);
    });

    it('should handle validation error', async () => {
      const invalidData = { name: 'Test' }; // Missing required fields

      const response = await request(app)
        .post('/employees')
        .send(invalidData);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /employees/:id', () => {
    it('should update employee successfully', async () => {
      const updatedEmployee = { ...mockEmployee, name: 'Updated Name' };
      mockDb.Employee.findByPk.mockResolvedValue(mockEmployee);
      mockEmployee.update.mockResolvedValue(updatedEmployee);
      mockDb.Employee.findByPk.mockResolvedValueOnce(mockEmployee).mockResolvedValueOnce(updatedEmployee);

      const response = await request(app)
        .put('/employees/1')
        .send({
          name: 'Updated Name',
          position: 'Senior Developer',
          skills: JSON.stringify([])
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedEmployee);
    });

    it('should return 404 if employee not found', async () => {
      mockDb.Employee.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/employees/999')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("L'employé n'existe pas");
    });
  });

  describe('DELETE /employees/:id', () => {
    it('should delete employee successfully', async () => {
      mockDb.Employee.findByPk.mockResolvedValue(mockEmployee);
      mockDb.EmployeeSkill.destroy.mockResolvedValue();
      mockEmployee.destroy.mockResolvedValue();

      const response = await request(app).delete('/employees/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Employee supprimée avec succès');
    });

    it('should return 404 if employee not found', async () => {
      mockDb.Employee.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/employees/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("L'employée n'existe pas");
    });
  });
});