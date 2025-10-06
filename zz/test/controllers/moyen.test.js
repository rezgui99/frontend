const request = require('supertest');
const express = require('express');
const moyenController = require('../../src/controllers/moyen');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

const mockMoyen = {
  id: 1,
  moyen: 'Test Moyen',
  update: jest.fn(),
  destroy: jest.fn()
};

// Routes de test
app.get('/moyens', moyenController.getAllMoyens);
app.get('/moyens/:id', moyenController.getMoyenById);
app.post('/moyens', moyenController.createMoyen);
app.put('/moyens/:id', moyenController.updateMoyen);
app.delete('/moyens/:id', moyenController.deleteMoyen);

describe('Moyen Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /moyens', () => {
    it('should return all moyens', async () => {
      mockDb.Moyen.findAll.mockResolvedValue([mockMoyen]);

      const response = await request(app).get('/moyens');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockMoyen]);
    });

    it('should handle database error', async () => {
      mockDb.Moyen.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/moyens');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Erreur serveur');
    });
  });

  describe('GET /moyens/:id', () => {
    it('should return moyen by id', async () => {
      mockDb.Moyen.findByPk.mockResolvedValue(mockMoyen);

      const response = await request(app).get('/moyens/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMoyen);
    });

    it('should return 404 if moyen not found', async () => {
      mockDb.Moyen.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/moyens/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Moyen non trouvé');
    });
  });

  describe('POST /moyens', () => {
    it('should create moyen successfully', async () => {
      mockDb.Moyen.create.mockResolvedValue(mockMoyen);

      const response = await request(app)
        .post('/moyens')
        .send({ moyen: 'Nouveau Moyen' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockMoyen);
    });

    it('should return 400 if moyen field is missing', async () => {
      const response = await request(app)
        .post('/moyens')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Le champ "moyen" est requis');
    });
  });

  describe('PUT /moyens/:id', () => {
    it('should update moyen successfully', async () => {
      const updatedMoyen = { ...mockMoyen, moyen: 'Moyen mis à jour' };
      mockDb.Moyen.findByPk.mockResolvedValue(mockMoyen);
      mockMoyen.update.mockResolvedValue(updatedMoyen);

      const response = await request(app)
        .put('/moyens/1')
        .send({ moyen: 'Moyen mis à jour' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedMoyen);
    });

    it('should return 404 if moyen not found', async () => {
      mockDb.Moyen.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/moyens/999')
        .send({ moyen: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Moyen non trouvé');
    });
  });

  describe('DELETE /moyens/:id', () => {
    it('should delete moyen successfully', async () => {
      mockDb.Moyen.findByPk.mockResolvedValue(mockMoyen);
      mockMoyen.destroy.mockResolvedValue();

      const response = await request(app).delete('/moyens/1');

      expect(response.status).toBe(204);
    });

    it('should return 404 if moyen not found', async () => {
      mockDb.Moyen.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/moyens/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Moyen non trouvé');
    });
  });
});