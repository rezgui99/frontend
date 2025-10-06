const request = require('supertest');
const express = require('express');
const candidateApplicationController = require('../../src/controllers/candidateApplication');
const { mockDb, mockJobOffer, mockCandidate } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-id' }))
  }))
}));

const app = express();
app.use(express.json());

// Mock candidate middleware
app.use((req, res, next) => {
  req.candidate = { id: 1, firstName: 'Test', lastName: 'Candidate' };
  next();
});

const mockApplication = {
  id: 1,
  candidate_id: 1,
  job_offer_id: 1,
  cv_id: 1,
  status: 'applied',
  cover_letter: 'Test cover letter',
  toJSON: jest.fn(() => ({
    id: 1,
    status: 'applied'
  }))
};

const mockCV = {
  id: 1,
  candidate_id: 1,
  title: 'Mon CV',
  file_path: '/uploads/cv.pdf'
};

// Routes de test
app.post('/applications/apply', candidateApplicationController.applyToJobOffer);
app.get('/applications', candidateApplicationController.getCandidateApplications);
app.get('/applications/:id', candidateApplicationController.getApplicationById);

describe('CandidateApplication Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('POST /applications/apply', () => {
    const validApplicationData = {
      job_offer_id: 1,
      cv_id: 1,
      cover_letter: 'This is a test cover letter with more than 50 characters to meet the minimum requirement.'
    };

    it('should apply to job offer successfully', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const publishedJobOffer = {
        ...mockJobOffer,
        status: 'published',
        application_deadline: futureDate,
        jobDescription: { id: 1, emploi: 'Software Engineer' }
      };

      mockDb.JobOffer.findOne.mockResolvedValue(publishedJobOffer);
      mockDb.Application.findOne.mockResolvedValue(null); // No existing application
      mockDb.CandidateCV.findOne.mockResolvedValue(mockCV);
      mockDb.Application.create.mockResolvedValue(mockApplication);
      mockDb.Application.findByPk.mockResolvedValue({
        ...mockApplication,
        jobOffer: publishedJobOffer,
        cv: mockCV
      });
      mockDb.Candidate.findByPk.mockResolvedValue(mockCandidate);
      mockDb.User.findAll.mockResolvedValue([{ id: 1, firstName: 'Recruiter', lastName: 'Test' }]);
      mockDb.Interview.count.mockResolvedValue(0);
      mockDb.Interview.create.mockResolvedValue({ id: 1 });

      const response = await request(app)
        .post('/applications/apply')
        .send(validApplicationData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Candidature envoyée avec succès');
      expect(response.body).toHaveProperty('application');
    });

    it('should return 400 if job_offer_id is missing', async () => {
      const response = await request(app)
        .post('/applications/apply')
        .send({
          cv_id: 1,
          cover_letter: 'Test cover letter'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("ID de l'offre requis");
    });

    it('should return 400 if cv_id is missing', async () => {
      const response = await request(app)
        .post('/applications/apply')
        .send({
          job_offer_id: 1,
          cover_letter: 'Test cover letter'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('CV requis pour postuler');
    });

    it('should return 400 if cover letter is too short', async () => {
      const response = await request(app)
        .post('/applications/apply')
        .send({
          job_offer_id: 1,
          cv_id: 1,
          cover_letter: 'Short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Lettre de motivation requise (minimum 50 caractères)');
    });

    it('should return 404 if job offer not found', async () => {
      mockDb.JobOffer.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/applications/apply')
        .send(validApplicationData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Offre d'emploi non trouvée ou non publiée");
    });

    it('should return 400 if application deadline passed', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      const expiredJobOffer = {
        ...mockJobOffer,
        status: 'published',
        application_deadline: pastDate
      };

      mockDb.JobOffer.findOne.mockResolvedValue(expiredJobOffer);

      const response = await request(app)
        .post('/applications/apply')
        .send(validApplicationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('La date limite de candidature est dépassée');
    });

    it('should return 409 if already applied', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const publishedJobOffer = {
        ...mockJobOffer,
        status: 'published',
        application_deadline: futureDate
      };

      mockDb.JobOffer.findOne.mockResolvedValue(publishedJobOffer);
      mockDb.Application.findOne.mockResolvedValue(mockApplication); // Existing application

      const response = await request(app)
        .post('/applications/apply')
        .send(validApplicationData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Vous avez déjà postulé à cette offre');
    });

    it('should return 404 if CV not found or not owned', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const publishedJobOffer = {
        ...mockJobOffer,
        status: 'published',
        application_deadline: futureDate
      };

      mockDb.JobOffer.findOne.mockResolvedValue(publishedJobOffer);
      mockDb.Application.findOne.mockResolvedValue(null);
      mockDb.CandidateCV.findOne.mockResolvedValue(null); // CV not found

      const response = await request(app)
        .post('/applications/apply')
        .send(validApplicationData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CV non trouvé ou ne vous appartient pas');
    });
  });

  describe('GET /applications', () => {
    it('should return candidate applications', async () => {
      mockDb.Application.findAll.mockResolvedValue([mockApplication]);

      const response = await request(app).get('/applications');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(mockDb.Application.findAll).toHaveBeenCalledWith({
        where: { candidate_id: 1 },
        include: expect.any(Array),
        order: [['applied_at', 'DESC']]
      });
    });

    it('should filter by status', async () => {
      mockDb.Application.findAll.mockResolvedValue([mockApplication]);

      const response = await request(app).get('/applications?status=applied');

      expect(response.status).toBe(200);
      expect(mockDb.Application.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            candidate_id: 1,
            status: 'applied'
          })
        })
      );
    });
  });

  describe('GET /applications/:id', () => {
    it('should return application by id', async () => {
      mockDb.Application.findOne.mockResolvedValue(mockApplication);
      mockDb.Interview.findOne.mockResolvedValue(null);

      const response = await request(app).get('/applications/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
      expect(mockDb.Application.findOne).toHaveBeenCalledWith({
        where: { id: 1, candidate_id: 1 },
        include: expect.any(Array)
      });
    });

    it('should return 404 if application not found', async () => {
      mockDb.Application.findOne.mockResolvedValue(null);

      const response = await request(app).get('/applications/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Candidature non trouvée');
    });

    it('should return 400 if invalid application id', async () => {
      const response = await request(app).get('/applications/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID de candidature invalide');
    });
  });
});