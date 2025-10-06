const request = require('supertest');
const express = require('express');
const jobRequiredSkillController = require('../../src/controllers/jobrequiredskill');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

const mockJobRequiredSkill = {
  job_description_id: 1,
  skill_id: 1,
  required_skill_level_id: 3,
  JobDescription: { id: 1, emploi: 'Software Engineer' },
  Skill: { id: 1, name: 'JavaScript' },
  SkillLevel: { id: 3, level_name: 'Advanced', value: 3 },
  update: jest.fn(),
  destroy: jest.fn()
};

// Routes de test
app.get('/job-required-skills', jobRequiredSkillController.findAllJobRequiredSkills);
app.get('/job-required-skills/:job_description_id/:skill_id', jobRequiredSkillController.findJobRequiredSkill);
app.post('/job-required-skills', jobRequiredSkillController.createJobRequiredSkill);
app.put('/job-required-skills/:job_description_id/:skill_id', jobRequiredSkillController.updateJobRequiredSkill);
app.delete('/job-required-skills/:job_description_id/:skill_id', jobRequiredSkillController.deleteJobRequiredSkill);

describe('JobRequiredSkill Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /job-required-skills', () => {
    it('should return all job required skills', async () => {
      mockDb.JobRequiredSkill.findAll.mockResolvedValue([mockJobRequiredSkill]);

      const response = await request(app).get('/job-required-skills');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockJobRequiredSkill]);
    });
  });

  describe('GET /job-required-skills/:job_description_id/:skill_id', () => {
    it('should return specific job required skill', async () => {
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(mockJobRequiredSkill);

      const response = await request(app).get('/job-required-skills/1/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobRequiredSkill);
    });

    it('should return 404 if not found', async () => {
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(null);

      const response = await request(app).get('/job-required-skills/999/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Compétence requise pour la fiche de poste non trouvée');
    });
  });

  describe('POST /job-required-skills', () => {
    const validData = {
      job_description_id: 1,
      skill_id: 2,
      required_skill_level_id: 3
    };

    it('should create job required skill successfully', async () => {
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(null); // No existing
      mockDb.JobRequiredSkill.create.mockResolvedValue(mockJobRequiredSkill);
      mockDb.JobRequiredSkill.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockJobRequiredSkill);

      const response = await request(app)
        .post('/job-required-skills')
        .send(validData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockJobRequiredSkill);
    });

    it('should return 409 if already exists', async () => {
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(mockJobRequiredSkill);

      const response = await request(app)
        .post('/job-required-skills')
        .send(validData);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('La compétence requise pour cette fiche de poste existe déjà');
    });
  });

  describe('PUT /job-required-skills/:job_description_id/:skill_id', () => {
    it('should update job required skill successfully', async () => {
      const updated = { ...mockJobRequiredSkill, required_skill_level_id: 4 };
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(mockJobRequiredSkill);
      mockJobRequiredSkill.update.mockResolvedValue(updated);
      mockDb.JobRequiredSkill.findOne.mockResolvedValueOnce(mockJobRequiredSkill).mockResolvedValueOnce(updated);

      const response = await request(app)
        .put('/job-required-skills/1/1')
        .send({ required_skill_level_id: 4 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updated);
    });

    it('should return 404 if not found', async () => {
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/job-required-skills/999/999')
        .send({ required_skill_level_id: 4 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Compétence requise pour la fiche de poste non trouvée');
    });
  });

  describe('DELETE /job-required-skills/:job_description_id/:skill_id', () => {
    it('should delete job required skill successfully', async () => {
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(mockJobRequiredSkill);
      mockJobRequiredSkill.destroy.mockResolvedValue();

      const response = await request(app).delete('/job-required-skills/1/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Compétence requise pour la fiche de poste supprimée avec succès');
    });

    it('should return 404 if not found', async () => {
      mockDb.JobRequiredSkill.findOne.mockResolvedValue(null);

      const response = await request(app).delete('/job-required-skills/999/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("La compétence requise pour cette fiche de poste n'existe pas");
    });
  });
});