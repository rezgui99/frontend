const EmailService = require('../../src/services/emailService');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn((callback) => callback(null, true)),
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-id' }))
  }))
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationCode', () => {
    it('should send verification code email', async () => {
      const result = await EmailService.sendVerificationCode(
        'test@test.com',
        'Test',
        'User',
        '123456',
        'user'
      );

      expect(result).toHaveProperty('messageId');
    });

    it('should send verification code for candidate', async () => {
      const result = await EmailService.sendVerificationCode(
        'candidate@test.com',
        'Test',
        'Candidate',
        '654321',
        'candidate'
      );

      expect(result).toHaveProperty('messageId');
    });
  });

  describe('sendSuspiciousActivityAlert', () => {
    it('should send suspicious activity alert', async () => {
      const activityDetails = {
        type: 'Tentative de connexion échouée',
        timestamp: new Date().toLocaleString('fr-FR'),
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        attemptCount: 3,
        location: 'Tunis, Tunisie'
      };

      const result = await EmailService.sendSuspiciousActivityAlert(
        'test@test.com',
        'Test',
        'User',
        activityDetails,
        'user'
      );

      expect(result).toHaveProperty('messageId');
    });
  });

  describe('sendEmailVerifiedConfirmation', () => {
    it('should send email verification confirmation', async () => {
      const result = await EmailService.sendEmailVerifiedConfirmation(
        'test@test.com',
        'Test',
        'User',
        'user'
      );

      expect(result).toHaveProperty('messageId');
    });
  });
});
