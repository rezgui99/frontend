const request = require('supertest');
const express = require('express');
const candidateCVController = require('../../src/controllers/candidateCV');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('fs');
jest.mock('path');

const app = express();
app.use(express.json());

// Mock candidate middleware
app.use((req, res, next) => {
  req.candidate = { id: 1, firstName: 'Test', lastName: 'Candidate' };
  next();
});

const mockCV = {
  id: 1,
  candidate_id: 1,
  title: 'Mon CV',
  file_path: '/uploads/cv-test.pdf',
  file_name: 'cv-test.pdf',
  file_size: 1024,
  is_primary: true,
  update: jest.fn(),
  destroy: jest.fn()
};

// Routes de test
app.get('/cvs', candidateCVController.getCandidateCVs);
app.post('/cvs', candidateCVController.uploadCV);
app.put('/cvs/:id', candidateCVController.updateCV);
app.delete('/cvs/:id', candidateCVController.deleteCV);
app.patch('/cvs/:id/set-primary', candidateCVController.setPrimaryCV);
app.get('/cvs/:id/download', candidateCVController.downloadCV);

describe('CandidateCV Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /cvs', () => {
    it('should return candidate CVs', async () => {
      mockDb.CandidateCV.findAll.mockResolvedValue([mockCV]);

      const response = await request(app).get('/cvs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockCV]);
      expect(mockDb.CandidateCV.findAll).toHaveBeenCalledWith({
        where: { candidate_id: 1 },
        order: [['is_primary', 'DESC'], ['createdAt', 'DESC']]
      });
    });
  });

  describe('POST /cvs', () => {
    it('should upload CV successfully', async () => {
      // Mock file upload
      const mockFile = {
        filename: 'cv-123.pdf',
        originalname: 'my-cv.pdf',
        size: 1024,
        path: '/uploads/cv-123.pdf'
      };

      mockDb.CandidateCV.create.mockResolvedValue(mockCV);

      // Simulate file upload
      const response = await request(app)
        .post('/cvs')
        .field('title', 'Mon nouveau CV')
        .field('is_primary', 'true');

      // Note: Pour tester l'upload de fichier, il faudrait utiliser supertest avec .attach()
      // Ici on teste la logique sans le fichier réel
    });

    it('should return 400 if no file provided', async () => {
      const response = await request(app)
        .post('/cvs')
        .send({ title: 'Test CV' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Fichier CV requis');
    });
  });

  describe('PUT /cvs/:id', () => {
    it('should update CV successfully', async () => {
      mockDb.CandidateCV.findOne.mockResolvedValue(mockCV);

      const response = await request(app)
        .put('/cvs/1')
        .send({ title: 'CV mis à jour' });

      expect(response.status).toBe(200);
      expect(mockCV.update).toHaveBeenCalledWith(
        { title: 'CV mis à jour' },
        expect.any(Object)
      );
    });

    it('should return 404 if CV not found', async () => {
      mockDb.CandidateCV.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/cvs/999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CV non trouvé');
    });
  });

  describe('DELETE /cvs/:id', () => {
    it('should delete CV successfully', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn(() => true);
      fs.unlinkSync = jest.fn();

      mockDb.CandidateCV.findOne.mockResolvedValue(mockCV);
      mockCV.destroy.mockResolvedValue();

      const response = await request(app).delete('/cvs/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('CV supprimé avec succès');
      expect(mockCV.destroy).toHaveBeenCalled();
    });

    it('should return 404 if CV not found', async () => {
      mockDb.CandidateCV.findOne.mockResolvedValue(null);

      const response = await request(app).delete('/cvs/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CV non trouvé');
    });
  });

  describe('PATCH /cvs/:id/set-primary', () => {
    it('should set CV as primary successfully', async () => {
      mockDb.CandidateCV.findOne.mockResolvedValue(mockCV);
      mockDb.CandidateCV.update.mockResolvedValue([1]);

      const response = await request(app).patch('/cvs/1/set-primary');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('CV défini comme principal');
      expect(mockCV.update).toHaveBeenCalledWith(
        { is_primary: true },
        expect.any(Object)
      );
    });
  });

  describe('GET /cvs/:id/download', () => {
    it('should download CV successfully', async () => {
      const fs = require('fs');
      const path = require('path');
      
      fs.existsSync = jest.fn(() => true);
      path.join = jest.fn(() => '/full/path/to/cv.pdf');
      
      mockDb.CandidateCV.findOne.mockResolvedValue(mockCV);

      // Mock res.download
      const response = await request(app).get('/cvs/1/download');

      expect(mockDb.CandidateCV.findOne).toHaveBeenCalledWith({
        where: { id: '1', candidate_id: 1 }
      });
    });

    it('should return 404 if CV not found', async () => {
      mockDb.CandidateCV.findOne.mockResolvedValue(null);

      const response = await request(app).get('/cvs/999/download');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CV non trouvé');
    });

    it('should return 404 if file not found on server', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn(() => false);
      
      mockDb.CandidateCV.findOne.mockResolvedValue(mockCV);

      const response = await request(app).get('/cvs/1/download');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Fichier CV non trouvé sur le serveur');
    });
  });
});