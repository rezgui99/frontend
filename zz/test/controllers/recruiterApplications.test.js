const request = require('supertest');
const express = require('express');
const recruiterApplicationsController = require('../../src/controllers/recruiterApplications');
const { mockDb } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-id' }))
  }))
}));

const app = express();
app.use(express.json());

// Mock user middleware
app.use((req, res, next) => {
  req.user = { id: 1, username: 'recruiter', role: 'hr', firstName: 'Test', lastName: 'Recruiter' };
  next();
});

const mockApplication = {
  id: 1,
  candidate_id: 1,
  job_offer_id: 1,
  status: 'applied',
  cover_letter: 'Test cover letter',
  candidate: {
    id: 1,
    firstName: 'Test',
    lastName: 'Candidate',
    email: 'candidate@test.com'
  },
  jobOffer: {
    id: 1,
    title: 'Software Engineer',
    company: 'Test Company'
  },
  update: jest.fn(),
  toJSON: jest.fn(() => ({
    id: 1,
    status: 'applied'
  }))
};

// Routes de test
app.get('/applications', recruiterApplicationsController.getAllApplications);
app.get('/applications/job-offer/:job_offer_id', recruiterApplicationsController.getApplicationsForJobOffer);
app.put('/applications/:id/status', recruiterApplicationsController.updateApplicationStatus);
app.put('/applications/:id/schedule-interview', recruiterApplicationsController.scheduleInterview);
app.get('/applications/statistics', recruiterApplicationsController.getApplicationStatistics);
app.put('/applications/bulk-update', recruiterApplicationsController.bulkUpdateApplications);

describe('RecruiterApplications Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /applications', () => {
    it('should return all applications with pagination', async () => {
      mockDb.Application.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockApplication]
      });

      const response = await request(app).get('/applications');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('applications');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter by status', async () => {
      mockDb.Application.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockApplication]
      });

      const response = await request(app).get('/applications?status=applied');

      expect(response.status).toBe(200);
      expect(mockDb.Application.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'applied' })
        })
      );
    });
  });

  describe('PUT /applications/:id/status', () => {
    it('should update application status successfully', async () => {
      mockDb.Application.findByPk.mockResolvedValue(mockApplication);

      const response = await request(app)
        .put('/applications/1/status')
        .send({
          status: 'under_review',
          recruiter_notes: 'Good candidate'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Statut de candidature mis à jour');
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'under_review',
          recruiter_notes: 'Good candidate'
        }),
        expect.any(Object)
      );
    });

    it('should return 404 if application not found', async () => {
      mockDb.Application.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/applications/999/status')
        .send({ status: 'accepted' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Candidature non trouvée');
    });
  });

  describe('PUT /applications/:id/schedule-interview', () => {
    it('should schedule interview successfully', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      mockDb.Application.findByPk.mockResolvedValue(mockApplication);
      mockDb.Interview.findOne.mockResolvedValue(null); // No existing interview
      mockDb.Interview.create.mockResolvedValue({
        id: 1,
        application_id: 1,
        scheduled_date: futureDate
      });

      const response = await request(app)
        .put('/applications/1/schedule-interview')
        .send({
          confirmed_interview_date: futureDate,
          interview_type: 'video',
          meeting_link: 'https://meet.google.com/test'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Entretien programmé avec succès');
    });

    it('should return 400 if interview date is in the past', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockDb.Application.findByPk.mockResolvedValue(mockApplication);

      const response = await request(app)
        .put('/applications/1/schedule-interview')
        .send({
          confirmed_interview_date: pastDate,
          interview_type: 'video'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("La date d'entretien doit être dans le futur");
    });
  });

  describe('GET /applications/statistics', () => {
    it('should return application statistics', async () => {
      mockDb.Application.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // recent
        .mockResolvedValueOnce(2); // interviews scheduled
      
      mockDb.Application.findAll.mockResolvedValue([
        { status: 'applied', count: '5' },
        { status: 'accepted', count: '3' }
      ]);

      const response = await request(app).get('/applications/statistics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalApplications');
      expect(response.body).toHaveProperty('statusBreakdown');
      expect(response.body).toHaveProperty('recentApplications');
    });
  });

  describe('PUT /applications/bulk-update', () => {
    it('should bulk update applications successfully', async () => {
      const applications = [mockApplication, { ...mockApplication, id: 2 }];
      mockDb.Application.findAll.mockResolvedValue(applications);
      mockDb.Application.update.mockResolvedValue([2]); // 2 rows affected

      const response = await request(app)
        .put('/applications/bulk-update')
        .send({
          application_ids: [1, 2],
          status: 'rejected',
          recruiter_notes: 'Bulk rejection'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('2 candidature(s) mise(s) à jour');
    });

    it('should return 400 if application_ids is empty', async () => {
      const response = await request(app)
        .put('/applications/bulk-update')
        .send({
          application_ids: [],
          status: 'rejected'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Liste des candidatures requise');
    });
  });
});