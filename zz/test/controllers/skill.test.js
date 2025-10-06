const request = require('supertest');
const express = require('express');
const skillController = require('../../src/controllers/skill');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

const mockSkill = {
  id: 1,
  name: 'JavaScript',
  description: 'Programming language',
  skill_type_id: 1,
  type: { id: 1, type_name: 'Technique' },
  update: jest.fn(),
  destroy: jest.fn()
};

// Routes de test
app.get('/skills', skillController.findAllSkills);
app.get('/skills/:id', skillController.findSkillById);
app.post('/skills', skillController.createSkill);
app.put('/skills/:id', skillController.updateSkill);
app.delete('/skills/:id', skillController.deleteSkill);

describe('Skill Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /skills', () => {
    it('should return all skills', async () => {
      mockDb.Skill.findAll.mockResolvedValue([mockSkill]);

      const response = await request(app).get('/skills');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockSkill]);
    });

    it('should handle database error', async () => {
      mockDb.Skill.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/skills');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /skills/:id', () => {
    it('should return skill by id', async () => {
      mockDb.Skill.findByPk.mockResolvedValue(mockSkill);

      const response = await request(app).get('/skills/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSkill);
    });

    it('should return 404 if skill not found', async () => {
      mockDb.Skill.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/skills/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Compétence non trouvée');
    });
  });

  describe('POST /skills', () => {
    const validSkillData = {
      name: 'Python',
      description: 'Programming language',
      skill_type_id: 1
    };

    it('should create skill successfully', async () => {
      const createdSkill = { ...mockSkill, id: 2, name: 'Python' };
      mockDb.Skill.create.mockResolvedValue(createdSkill);
      mockDb.Skill.findByPk.mockResolvedValue(createdSkill);

      const response = await request(app)
        .post('/skills')
        .send(validSkillData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdSkill);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/skills')
        .send({ name: 'Python' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Champs obligatoires manquants');
    });
  });

  describe('PUT /skills/:id', () => {
    it('should update skill successfully', async () => {
      const updatedSkill = { ...mockSkill, name: 'Updated JavaScript' };
      mockDb.Skill.findByPk.mockResolvedValue(mockSkill);
      mockSkill.update.mockResolvedValue(updatedSkill);
      mockDb.Skill.findByPk.mockResolvedValueOnce(mockSkill).mockResolvedValueOnce(updatedSkill);

      const response = await request(app)
        .put('/skills/1')
        .send({ name: 'Updated JavaScript' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedSkill);
    });

    it('should return 404 if skill not found', async () => {
      mockDb.Skill.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/skills/999')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Compétence non trouvée');
    });
  });

  describe('DELETE /skills/:id', () => {
    it('should delete skill successfully', async () => {
      mockDb.Skill.findByPk.mockResolvedValue(mockSkill);
      mockSkill.destroy.mockResolvedValue();

      const response = await request(app).delete('/skills/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Compétence supprimée avec succès');
    });

    it('should return 404 if skill not found', async () => {
      mockDb.Skill.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/skills/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Compétence non trouvée');
    });
  });
});