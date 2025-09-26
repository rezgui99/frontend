const SecurityService = require('../../src/services/securityService');

jest.mock('../../src/services/emailService', () => ({
  sendSuspiciousActivityAlert: jest.fn(),
  sendAccountLockedNotification: jest.fn(),
  sendSuccessfulLoginAfterSuspiciousActivity: jest.fn()
}));

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

  describe('parseUserAgent', () => {
    it('should parse Chrome user agent', () => {
      const result = SecurityService.parseUserAgent('Mozilla/5.0 Chrome/91.0');
      expect(result).toBe('Google Chrome');
    });

    it('should parse Firefox user agent', () => {
      const result = SecurityService.parseUserAgent('Mozilla/5.0 Firefox/89.0');
      expect(result).toBe('Mozilla Firefox');
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

  describe('generateVerificationCode', () => {
    it('should generate 6-digit code', () => {
      const code = SecurityService.generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
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
    });
  });
});