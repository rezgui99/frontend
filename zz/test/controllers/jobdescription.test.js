const request = require('supertest');
const express = require('express');
const jobDescriptionController = require('../../src/controllers/jobdescription');
const { mockDb, mockJobDescription } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

// Routes de test
app.get('/jobdescriptions', jobDescriptionController.findAllJobDescription);
app.get('/jobdescriptions/:id', jobDescriptionController.findJobDescriptionById);
app.post('/jobdescriptions', jobDescriptionController.createJobDescription);
app.put('/jobdescriptions/:id', jobDescriptionController.updateJobDescription);
app.delete('/jobdescriptions/:id', jobDescriptionController.deleteJobDescription);

describe('JobDescription Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /jobdescriptions', () => {
    it('should return all job descriptions', async () => {
      mockDb.JobDescription.findAll.mockResolvedValue([mockJobDescription]);

      const response = await request(app).get('/jobdescriptions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockJobDescription]);
    });
  });

  describe('GET /jobdescriptions/:id', () => {
    it('should return job description by id', async () => {
      mockDb.JobDescription.findByPk.mockResolvedValue(mockJobDescription);

      const response = await request(app).get('/jobdescriptions/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobDescription);
    });

    it('should return 404 if not found', async () => {
      mockDb.JobDescription.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/jobdescriptions/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Not found');
    });
  });

  describe('POST /jobdescriptions', () => {
    const validJobData = {
      emploi: 'Software Engineer',
      filiere_activite: 'IT',
      famille: 'Development',
      finalite: 'Develop software',
      missions: [],
      moyens: [],
      airesProximites: [],
      requiredSkills: []
    };

    it('should create job description successfully', async () => {
      const createdJob = { ...mockJobDescription, id: 2 };
      mockDb.JobDescription.create.mockResolvedValue(createdJob);
      mockDb.JobDescription.findByPk.mockResolvedValue(createdJob);
      
      // Mock les méthodes de relation
      createdJob.addMission = jest.fn();
      createdJob.addMoyen = jest.fn();
      createdJob.addAireProximite = jest.fn();

      const response = await request(app)
        .post('/jobdescriptions')
        .send(validJobData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdJob);
    });
  });

  describe('PUT /jobdescriptions/:id', () => {
    it('should update job description successfully', async () => {
      const updatedJob = { ...mockJobDescription, emploi: 'Updated Position' };
      mockDb.JobDescription.findByPk.mockResolvedValue({
        ...mockJobDescription,
        missions: [],
        moyens: [],
        aireProximites: [],
        requiredSkills: [],
        update: jest.fn(),
        setMissions: jest.fn(),
        setMoyens: jest.fn(),
        setAireProximites: jest.fn()
      });
      mockDb.JobDescription.findByPk.mockResolvedValueOnce(mockJobDescription).mockResolvedValueOnce(updatedJob);

      const response = await request(app)
        .put('/jobdescriptions/1')
        .send({
          emploi: 'Updated Position',
          filiere_activite: 'IT',
          famille: 'Development',
          missions: [],
          moyens: [],
          airesProximites: [],
          requiredSkills: []
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedJob);
    });

    it('should return 404 if job description not found', async () => {
      mockDb.JobDescription.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/jobdescriptions/999')
        .send({ emploi: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Not found');
    });
  });

  describe('DELETE /jobdescriptions/:id', () => {
    it('should delete job description successfully', async () => {
      const jobToDelete = {
        ...mockJobDescription,
        setMissions: jest.fn(),
        setMoyens: jest.fn(),
        setAireProximites: jest.fn(),
        destroy: jest.fn()
      };
      mockDb.JobDescription.findByPk.mockResolvedValue(jobToDelete);
      mockDb.JobRequiredSkill.destroy.mockResolvedValue();

      const response = await request(app).delete('/jobdescriptions/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Fiche de poste supprimée avec succès');
    });

    it('should return 404 if job description not found', async () => {
      mockDb.JobDescription.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/jobdescriptions/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Fiche de poste n'existe pas");
    });
  });
});