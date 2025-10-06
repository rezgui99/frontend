const request = require('supertest');
const express = require('express');
const jobOfferController = require('../../src/controllers/joboffer');
const { mockDb, mockJobOffer, mockJobDescription } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

// Mock user middleware
app.use((req, res, next) => {
  req.user = { id: 1, username: 'testuser', role: 'hr' };
  next();
});

// Routes de test
app.get('/job-offers', jobOfferController.findAllJobOffers);
app.get('/job-offers/:id', jobOfferController.findJobOfferById);
app.post('/job-offers', jobOfferController.createJobOffer);
app.put('/job-offers/:id', jobOfferController.updateJobOffer);
app.delete('/job-offers/:id', jobOfferController.deleteJobOffer);
app.patch('/job-offers/:id/publish', jobOfferController.publishJobOffer);
app.patch('/job-offers/:id/close', jobOfferController.closeJobOffer);
app.get('/job-offers-stats', jobOfferController.getJobOfferStatistics);

describe('JobOffer Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /job-offers', () => {
    it('should return all job offers with pagination', async () => {
      const mockJobOffers = [mockJobOffer];
      mockDb.JobOffer.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockJobOffers
      });

      const response = await request(app).get('/job-offers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobOffers');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.jobOffers).toEqual(mockJobOffers);
    });

    it('should filter by status', async () => {
      mockDb.JobOffer.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockJobOffer]
      });

      const response = await request(app).get('/job-offers?status=published');

      expect(response.status).toBe(200);
      expect(mockDb.JobOffer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'published' })
        })
      );
    });
  });

  describe('GET /job-offers/:id', () => {
    it('should return job offer by id and increment views', async () => {
      mockDb.JobOffer.findByPk.mockResolvedValue(mockJobOffer);

      const response = await request(app).get('/job-offers/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobOffer);
      expect(mockJobOffer.increment).toHaveBeenCalledWith('views_count');
    });

    it('should return 404 if job offer not found', async () => {
      mockDb.JobOffer.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/job-offers/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Offre d'emploi non trouvée");
    });
  });

  describe('POST /job-offers', () => {
    const validJobOfferData = {
      title: 'Software Engineer',
      company: 'Test Company',
      location: 'Tunis',
      description: 'A great opportunity for a software engineer to join our team',
      job_description_id: 1,
      application_deadline: new Date(Date.now() + 86400000).toISOString() // Tomorrow
    };

    it('should create job offer successfully', async () => {
      mockDb.JobDescription.findByPk.mockResolvedValue(mockJobDescription);
      mockDb.JobOffer.create.mockResolvedValue(mockJobOffer);
      mockDb.JobOffer.findByPk.mockResolvedValue(mockJobOffer);

      const response = await request(app)
        .post('/job-offers')
        .send(validJobOfferData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockJobOffer);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/job-offers')
        .send({ title: 'Test Job' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Champs obligatoires manquants');
    });

    it('should return 404 if job description not found', async () => {
      mockDb.JobDescription.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/job-offers')
        .send(validJobOfferData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Fiche de poste non trouvée');
    });

    it('should return 400 if deadline is in the past', async () => {
      const pastDeadline = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      
      const response = await request(app)
        .post('/job-offers')
        .send({
          ...validJobOfferData,
          application_deadline: pastDeadline
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('La date limite doit être dans le futur');
    });
  });

  describe('PUT /job-offers/:id', () => {
    it('should update job offer successfully', async () => {
      const updatedJobOffer = { ...mockJobOffer, title: 'Updated Title' };
      mockJobOffer.created_by = 1; // Same as req.user.id
      mockDb.JobOffer.findByPk.mockResolvedValue(mockJobOffer);
      mockJobOffer.update.mockResolvedValue(updatedJobOffer);
      mockDb.JobOffer.findByPk.mockResolvedValueOnce(mockJobOffer).mockResolvedValueOnce(updatedJobOffer);

      const response = await request(app)
        .put('/job-offers/1')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedJobOffer);
    });

    it('should return 403 if user lacks permissions', async () => {
      mockJobOffer.created_by = 999; // Different from req.user.id
      mockDb.JobOffer.findByPk.mockResolvedValue(mockJobOffer);

      const response = await request(app)
        .put('/job-offers/1')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Permissions insuffisantes');
    });
  });

  describe('PATCH /job-offers/:id/publish', () => {
    it('should publish job offer successfully', async () => {
      mockJobOffer.created_by = 1;
      const publishedJobOffer = { ...mockJobOffer, status: 'published' };
      mockDb.JobOffer.findByPk.mockResolvedValue(mockJobOffer);
      mockJobOffer.update.mockResolvedValue(publishedJobOffer);
      mockDb.JobOffer.findByPk.mockResolvedValueOnce(mockJobOffer).mockResolvedValueOnce(publishedJobOffer);

      const response = await request(app).patch('/job-offers/1/publish');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(publishedJobOffer);
      expect(mockJobOffer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          published_at: expect.any(Date)
        }),
        expect.any(Object)
      );
    });
  });

  describe('GET /job-offers-stats', () => {
    it('should return job offer statistics', async () => {
      const mockStats = [
        { status: 'published', count: '5', total_views: '100', total_applications: '20' }
      ];
      mockDb.JobOffer.findAll.mockResolvedValue(mockStats);
      mockDb.JobOffer.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // published
        .mockResolvedValueOnce(3)  // draft
        .mockResolvedValueOnce(2); // closed

      const response = await request(app).get('/job-offers-stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_offers');
      expect(response.body).toHaveProperty('published_offers');
      expect(response.body).toHaveProperty('draft_offers');
      expect(response.body).toHaveProperty('closed_offers');
    });
  });
});