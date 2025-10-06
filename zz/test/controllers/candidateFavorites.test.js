const request = require('supertest');
const express = require('express');
const candidateFavoritesController = require('../../src/controllers/candidateFavorites');
const { mockDb, mockJobOffer } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

// Mock candidate middleware
app.use((req, res, next) => {
  req.candidate = { id: 1, firstName: 'Test', lastName: 'Candidate' };
  next();
});

const mockFavorite = {
  id: 1,
  candidate_id: 1,
  job_offer_id: 1,
  jobOffer: mockJobOffer,
  destroy: jest.fn()
};

// Routes de test
app.get('/favorites', candidateFavoritesController.getFavorites);
app.post('/favorites', candidateFavoritesController.addToFavorites);
app.delete('/favorites/:job_offer_id', candidateFavoritesController.removeFromFavorites);
app.get('/favorites/:job_offer_id/check', candidateFavoritesController.isFavorite);

describe('CandidateFavorites Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /favorites', () => {
    it('should return candidate favorites', async () => {
      mockDb.CandidateFavorite.findAll.mockResolvedValue([mockFavorite]);

      const response = await request(app).get('/favorites');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockFavorite]);
      expect(mockDb.CandidateFavorite.findAll).toHaveBeenCalledWith({
        where: { candidate_id: 1 },
        include: expect.any(Array),
        order: [['createdAt', 'DESC']]
      });
    });
  });

  describe('POST /favorites', () => {
    it('should add job offer to favorites successfully', async () => {
      mockDb.JobOffer.findByPk.mockResolvedValue(mockJobOffer);
      mockDb.CandidateFavorite.findOne.mockResolvedValue(null); // Not already favorite
      mockDb.CandidateFavorite.create.mockResolvedValue(mockFavorite);
      mockDb.CandidateFavorite.findByPk.mockResolvedValue(mockFavorite);

      const response = await request(app)
        .post('/favorites')
        .send({ job_offer_id: 1 });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Offre ajoutée aux favoris');
      expect(response.body.favorite).toEqual(mockFavorite);
    });

    it('should return 400 if job_offer_id is missing', async () => {
      const response = await request(app)
        .post('/favorites')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("ID de l'offre requis");
    });

    it('should return 404 if job offer not found', async () => {
      mockDb.JobOffer.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/favorites')
        .send({ job_offer_id: 999 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Offre d'emploi non trouvée");
    });

    it('should return 409 if already in favorites', async () => {
      mockDb.JobOffer.findByPk.mockResolvedValue(mockJobOffer);
      mockDb.CandidateFavorite.findOne.mockResolvedValue(mockFavorite);

      const response = await request(app)
        .post('/favorites')
        .send({ job_offer_id: 1 });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Cette offre est déjà dans vos favoris');
    });
  });

  describe('DELETE /favorites/:job_offer_id', () => {
    it('should remove from favorites successfully', async () => {
      mockDb.CandidateFavorite.findOne.mockResolvedValue(mockFavorite);

      const response = await request(app).delete('/favorites/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Offre retirée des favoris');
      expect(mockFavorite.destroy).toHaveBeenCalled();
    });

    it('should return 404 if favorite not found', async () => {
      mockDb.CandidateFavorite.findOne.mockResolvedValue(null);

      const response = await request(app).delete('/favorites/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Favori non trouvé');
    });
  });

  describe('GET /favorites/:job_offer_id/check', () => {
    it('should return true if job offer is favorite', async () => {
      mockDb.CandidateFavorite.findOne.mockResolvedValue(mockFavorite);

      const response = await request(app).get('/favorites/1/check');

      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(true);
    });

    it('should return false if job offer is not favorite', async () => {
      mockDb.CandidateFavorite.findOne.mockResolvedValue(null);

      const response = await request(app).get('/favorites/999/check');

      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(false);
    });
  });
});