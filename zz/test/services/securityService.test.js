const SecurityService = require('../../src/services/securityService');

jest.mock('../../src/services/emailService', () => ({
  sendSuspiciousActivityAlert: jest.fn(),
  sendAccountLockedNotification: jest.fn(),
  sendSuccessfulLoginAfterSuspiciousActivity: jest.fn()
}));

const emailService = require('../../src/services/emailService');

describe('SecurityService', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      id: 1,
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      login_attempts: 0,
      locked_until: null,
      suspiciousActivityCount: 0,
      securityNotificationSent: false,
      lastSuspiciousActivity: null,
      constructor: { name: 'User' },
      update: jest.fn(),
      trackSuspiciousActivity: jest.fn(() => 1)
    };
    jest.clearAllMocks();
  });

  describe('analyzeLoginAttempt', () => {
    it('should handle successful login', async () => {
      const result = await SecurityService.analyzeLoginAttempt(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0 Chrome',
        true
      );

      expect(result).toEqual({ success: true, hadSuspiciousActivity: false });
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          login_attempts: 0,
          locked_until: null,
          suspiciousActivityCount: 0,
          securityNotificationSent: false
        })
      );
    });

    it('should increment attempts on failed login', async () => {
      const result = await SecurityService.analyzeLoginAttempt(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0 Chrome',
        false
      );

      expect(result).toEqual({ locked: false, attempts: 1 });
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          login_attempts: 1
        })
      );
    });

    it('should lock account after max attempts', async () => {
      mockUser.login_attempts = 4; // Presque au maximum

      const result = await SecurityService.analyzeLoginAttempt(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0 Chrome',
        false
      );

      expect(result).toEqual({ locked: true, attempts: 5 });
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          login_attempts: 5,
          locked_until: expect.any(Date)
        })
      );
    });

    it('should handle suspicious activity detection', async () => {
      mockUser.login_attempts = 2; // At suspicious threshold

      await SecurityService.analyzeLoginAttempt(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0 Chrome',
        false
      );

      expect(mockUser.trackSuspiciousActivity).toHaveBeenCalled();
    });

    it('should send notification on account lock', async () => {
      mockUser.login_attempts = 4;

      await SecurityService.analyzeLoginAttempt(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0 Chrome',
        false
      );

      expect(emailService.sendAccountLockedNotification).toHaveBeenCalled();
    });

    it('should handle successful login after suspicious activity', async () => {
      mockUser.suspiciousActivityCount = 2;

      const result = await SecurityService.analyzeLoginAttempt(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0 Chrome',
        true
      );

      expect(result.hadSuspiciousActivity).toBe(true);
      expect(emailService.sendSuccessfulLoginAfterSuspiciousActivity).toHaveBeenCalled();
    });
  });

  describe('handleSuspiciousActivity', () => {
    it('should track suspicious activity and send notification', async () => {
      const activityDetails = {
        type: 'Failed login',
        timestamp: new Date().toLocaleString('fr-FR'),
        ipAddress: '192.168.1.1'
      };

      const result = await SecurityService.handleSuspiciousActivity(mockUser, activityDetails);

      expect(mockUser.trackSuspiciousActivity).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should not send notification if recently sent', async () => {
      mockUser.securityNotificationSent = true;
      mockUser.lastSuspiciousActivity = new Date();

      await SecurityService.handleSuspiciousActivity(mockUser, {});

      expect(emailService.sendSuspiciousActivityAlert).not.toHaveBeenCalled();
    });
  });

  describe('isAccountLocked', () => {
    it('should return false if no lock time', () => {
      const result = SecurityService.isAccountLocked(mockUser);
      expect(result).toBe(false);
    });

    it('should return true if locked and not expired', () => {
      mockUser.locked_until = new Date(Date.now() + 1800000); // +30 minutes

      const result = SecurityService.isAccountLocked(mockUser);
      expect(result).toBe(true);
    });

    it('should return false if lock has expired', () => {
      mockUser.locked_until = new Date(Date.now() - 1800000); // -30 minutes

      const result = SecurityService.isAccountLocked(mockUser);
      expect(result).toBe(false);
    });
  });

  describe('getLockTimeRemaining', () => {
    it('should return 0 if account not locked', () => {
      const result = SecurityService.getLockTimeRemaining(mockUser);
      expect(result).toBe(0);
    });

    it('should return remaining minutes if locked', () => {
      mockUser.locked_until = new Date(Date.now() + 1800000); // +30 minutes

      const result = SecurityService.getLockTimeRemaining(mockUser);
      expect(result).toBeGreaterThan(25);
      expect(result).toBeLessThanOrEqual(30);
    });
  });

  describe('parseUserAgent', () => {
    it('should parse Chrome user agent', () => {
      const result = SecurityService.parseUserAgent('Mozilla/5.0 Chrome/91.0');
      expect(result).toBe('Google Chrome');
    });

    it('should parse Firefox user agent', () => {
      const result = SecurityService.parseUserAgent('Mozilla/5.0 Firefox/89.0');
      expect(result).toBe('Mozilla Firefox');
    });

    it('should parse Safari user agent', () => {
      const result = SecurityService.parseUserAgent('Mozilla/5.0 Safari/14.0');
      expect(result).toBe('Safari');
    });

    it('should parse Edge user agent', () => {
      const result = SecurityService.parseUserAgent('Mozilla/5.0 Edge/91.0');
      expect(result).toBe('Microsoft Edge');
    });

    it('should return unknown for unrecognized user agent', () => {
      const result = SecurityService.parseUserAgent('UnknownBrowser/1.0');
      expect(result).toBe('Navigateur inconnu');
    });

    it('should handle null user agent', () => {
      const result = SecurityService.parseUserAgent(null);
      expect(result).toBe('Navigateur inconnu');
    });
  });

  describe('getLocationFromIP', () => {
    it('should return localhost for local IPs', async () => {
      const result1 = await SecurityService.getLocationFromIP('127.0.0.1');
      const result2 = await SecurityService.getLocationFromIP('::1');
      
      expect(result1).toBe('Localhost (développement)');
      expect(result2).toBe('Localhost (développement)');
    });

    it('should return simulated location for external IPs', async () => {
      const result = await SecurityService.getLocationFromIP('192.168.1.1');
      
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Localhost (développement)');
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate 6-digit code', () => {
      const code = SecurityService.generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = SecurityService.generateVerificationCode();
      const code2 = SecurityService.generateVerificationCode();
      
      expect(code1).not.toBe(code2);
    });
  });

  describe('isValidVerificationCode', () => {
    it('should validate correct 6-digit code', () => {
      const result = SecurityService.isValidVerificationCode('123456');
      expect(result).toBe(true);
    });

    it('should reject invalid codes', () => {
      expect(SecurityService.isValidVerificationCode('12345')).toBe(false); // trop court
      expect(SecurityService.isValidVerificationCode('1234567')).toBe(false); // trop long
      expect(SecurityService.isValidVerificationCode('12345a')).toBe(false); // contient une lettre
      expect(SecurityService.isValidVerificationCode('')).toBe(false); // vide
      expect(SecurityService.isValidVerificationCode(null)).toBe(false); // null
      expect(SecurityService.isValidVerificationCode(undefined)).toBe(false); // undefined
    });
  });
});