const request = require('supertest');
const express = require('express');
const publicJobOffersController = require('../../src/controllers/publicJobOffers');
const { mockDb, mockJobOffer } = require('../mocks');

// Mock des dépendances
jest.mock('../../models/index', () => require('../mocks').mockDb);

const app = express();
app.use(express.json());

// Routes de test
app.get('/public/job-offers', publicJobOffersController.getPublicJobOffers);
app.get('/public/job-offers/:id', publicJobOffersController.getPublicJobOfferById);
app.get('/public/job-offers/filters', publicJobOffersController.getFilterOptions);
app.get('/public/job-offers/stats', publicJobOffersController.getJobOfferStats);

describe('PublicJobOffers Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockReturnValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  });

  describe('GET /public/job-offers', () => {
    it('should return published job offers', async () => {
      mockDb.JobOffer.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockJobOffer]
      });

      const response = await request(app).get('/public/job-offers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobOffers');
      expect(response.body).toHaveProperty('pagination');
      expect(mockDb.JobOffer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'published',
            application_deadline: expect.any(Object)
          })
        })
      );
    });

    it('should filter by search term', async () => {
      mockDb.JobOffer.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockJobOffer]
      });

      const response = await request(app).get('/public/job-offers?search=developer');

      expect(response.status).toBe(200);
      expect(mockDb.JobOffer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [mockDb.sequelize.Sequelize.Op.or]: expect.any(Array)
          })
        })
      );
    });

    it('should filter by location', async () => {
      mockDb.JobOffer.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockJobOffer]
      });

      const response = await request(app).get('/public/job-offers?location=Tunis');

      expect(response.status).toBe(200);
      expect(mockDb.JobOffer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: expect.any(Object)
          })
        })
      );
    });

    it('should filter by contract type', async () => {
      mockDb.JobOffer.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockJobOffer]
      });

      const response = await request(app).get('/public/job-offers?contract_type=CDI');

      expect(response.status).toBe(200);
      expect(mockDb.JobOffer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contract_type: 'CDI'
          })
        })
      );
    });

    it('should filter by salary range', async () => {
      mockDb.JobOffer.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockJobOffer]
      });

      const response = await request(app).get('/public/job-offers?salary_min=30000&salary_max=50000');

      expect(response.status).toBe(200);
      expect(mockDb.JobOffer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            salary_min: expect.any(Object),
            salary_max: expect.any(Object)
          })
        })
      );
    });
  });

  describe('GET /public/job-offers/:id', () => {
    it('should return job offer by id and increment views', async () => {
      mockDb.JobOffer.findOne.mockResolvedValue(mockJobOffer);

      const response = await request(app).get('/public/job-offers/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobOffer);
      expect(mockJobOffer.increment).toHaveBeenCalledWith('views_count', expect.any(Object));
    });

    it('should return 404 if job offer not found or expired', async () => {
      mockDb.JobOffer.findOne.mockResolvedValue(null);

      const response = await request(app).get('/public/job-offers/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Offre d'emploi non trouvée ou expirée");
    });
  });

  describe('GET /public/job-offers/filters', () => {
    it('should return filter options', async () => {
      mockDb.JobOffer.findAll
        .mockResolvedValueOnce([{ contract_type: 'CDI' }]) // contract types
        .mockResolvedValueOnce([{ work_mode: 'Hybride' }]) // work modes
        .mockResolvedValueOnce([{ location: 'Tunis' }]) // locations
        .mockResolvedValueOnce([{ min_salary: 25000, max_salary: 80000 }]); // salary ranges

      mockDb.sequelize.query
        .mockResolvedValueOnce([{ department: 'IT' }]) // departments
        .mockResolvedValueOnce([{ experience_level: 'Senior' }]) // experience levels
        .mockResolvedValueOnce([{ name: 'JavaScript', demand_count: 5 }]); // skills

      const response = await request(app).get('/public/job-offers/filters');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('contractTypes');
      expect(response.body).toHaveProperty('workModes');
      expect(response.body).toHaveProperty('departments');
      expect(response.body).toHaveProperty('experienceLevels');
      expect(response.body).toHaveProperty('locations');
      expect(response.body).toHaveProperty('topSkills');
      expect(response.body).toHaveProperty('salaryRange');
    });
  });

  describe('GET /public/job-offers/stats', () => {
    it('should return job offer statistics', async () => {
      mockDb.JobOffer.findAll.mockResolvedValue([{
        total_offers: '10',
        total_views: '100',
        total_applications: '25',
        active_offers: '8'
      }]);
      mockDb.JobOffer.count.mockResolvedValue(3); // recent offers

      const response = await request(app).get('/public/job-offers/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalOffers');
      expect(response.body).toHaveProperty('totalViews');
      expect(response.body).toHaveProperty('totalApplications');
      expect(response.body).toHaveProperty('activeOffers');
      expect(response.body).toHaveProperty('recentOffers');
    });
  });
});