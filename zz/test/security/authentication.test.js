const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Authentication Security Tests', () => {
  describe('Password Hashing', () => {
    it('should hash passwords securely', async () => {
      const password = 'testpassword123';
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password, salt);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare('wrongpassword', hash)).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('should use sufficient salt rounds', async () => {
      const password = 'testpassword123';
      const startTime = Date.now();
      await bcrypt.hash(password, 12);
      const endTime = Date.now();
      
      // Hashing should take some time with 12 rounds (security vs performance)
      expect(endTime - startTime).toBeGreaterThan(50); // At least 50ms
    });
  });

  describe('JWT Token Security', () => {
    const JWT_SECRET = 'test-secret-key-for-testing';

    it('should create valid JWT tokens', () => {
      const payload = { userId: 1, type: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.type).toBe('user');
    });

    it('should reject tokens with wrong secret', () => {
      const payload = { userId: 1, type: 'user' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow();
    });

    it('should reject expired tokens', () => {
      const payload = { userId: 1, type: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' }); // Already expired

      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow('jwt expired');
    });

    it('should reject malformed tokens', () => {
      const malformedTokens = [
        'invalid.token',
        'header.payload',
        'not-a-token',
        '',
        null,
        undefined
      ];

      malformedTokens.forEach(token => {
        expect(() => {
          jwt.verify(token, JWT_SECRET);
        }).toThrow();
      });
    });
  });

  describe('Session Security', () => {
    it('should validate session data integrity', () => {
      const validateSession = (sessionData) => {
        if (!sessionData || typeof sessionData !== 'object') return false;
        
        const requiredFields = ['userId', 'createdAt', 'lastActivity'];
        const hasRequiredFields = requiredFields.every(field => 
          sessionData.hasOwnProperty(field) && sessionData[field] !== null
        );
        
        if (!hasRequiredFields) return false;
        
        // Check if session is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000;
        const sessionAge = Date.now() - new Date(sessionData.createdAt).getTime();
        
        return sessionAge <= maxAge;
      };

      // Valid session
      expect(validateSession({
        userId: 1,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      })).toBe(true);

      // Invalid sessions
      expect(validateSession(null)).toBe(false);
      expect(validateSession({})).toBe(false);
      expect(validateSession({ userId: 1 })).toBe(false);
      expect(validateSession({
        userId: 1,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        lastActivity: new Date().toISOString()
      })).toBe(false);
    });
  });

  describe('Account Lockout Security', () => {
    it('should implement progressive lockout delays', () => {
      const calculateLockoutDelay = (attemptCount) => {
        if (attemptCount <= 3) return 0;
        if (attemptCount <= 5) return 5 * 60 * 1000; // 5 minutes
        if (attemptCount <= 10) return 30 * 60 * 1000; // 30 minutes
        return 60 * 60 * 1000; // 1 hour
      };

      expect(calculateLockoutDelay(1)).toBe(0);
      expect(calculateLockoutDelay(3)).toBe(0);
      expect(calculateLockoutDelay(4)).toBe(5 * 60 * 1000);
      expect(calculateLockoutDelay(5)).toBe(5 * 60 * 1000);
      expect(calculateLockoutDelay(6)).toBe(30 * 60 * 1000);
      expect(calculateLockoutDelay(15)).toBe(60 * 60 * 1000);
    });

    it('should track failed login attempts per IP', () => {
      const attemptTracker = new Map();
      
      const trackFailedAttempt = (ip) => {
        const current = attemptTracker.get(ip) || { count: 0, lastAttempt: null };
        current.count++;
        current.lastAttempt = Date.now();
        attemptTracker.set(ip, current);
        return current.count;
      };

      const resetAttempts = (ip) => {
        attemptTracker.delete(ip);
      };

      const testIP = '192.168.1.1';
      
      expect(trackFailedAttempt(testIP)).toBe(1);
      expect(trackFailedAttempt(testIP)).toBe(2);
      expect(trackFailedAttempt(testIP)).toBe(3);
      
      resetAttempts(testIP);
      expect(trackFailedAttempt(testIP)).toBe(1);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive data', () => {
      const crypto = require('crypto');
      
      const encrypt = (text, key) => {
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
          encrypted,
          iv: iv.toString('hex')
        };
      };

      const decrypt = (encryptedData, key) => {
        const algorithm = 'aes-256-gcm';
        const decipher = crypto.createDecipher(algorithm, key);
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      };

      const originalText = 'sensitive data';
      const key = 'encryption-key';
      
      const encrypted = encrypt(originalText, key);
      expect(encrypted.encrypted).not.toBe(originalText);
      expect(encrypted.iv).toHaveLength(32); // 16 bytes = 32 hex chars
      
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(originalText);
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens', () => {
      const crypto = require('crypto');
      
      const generateCSRFToken = () => {
        return crypto.randomBytes(32).toString('hex');
      };

      const validateCSRFToken = (token, sessionToken) => {
        return token === sessionToken;
      };

      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token1).not.toBe(token2);
      expect(validateCSRFToken(token1, token1)).toBe(true);
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });
  });
});