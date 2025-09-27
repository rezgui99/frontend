const TestUtils = require('../testUtils');

describe('Test Utilities', () => {
  describe('createMockUser', () => {
    it('should create mock user with default values', () => {
      const mockUser = TestUtils.createMockUser();

      expect(mockUser).toHaveProperty('id', 1);
      expect(mockUser).toHaveProperty('username', 'testuser');
      expect(mockUser).toHaveProperty('email', 'test@test.com');
      expect(mockUser).toHaveProperty('isActive', true);
      expect(typeof mockUser.toJSON).toBe('function');
      expect(typeof mockUser.checkPassword).toBe('function');
    });

    it('should create mock user with overrides', () => {
      const overrides = {
        id: 999,
        username: 'customuser',
        email: 'custom@test.com',
        isActive: false
      };

      const mockUser = TestUtils.createMockUser(overrides);

      expect(mockUser.id).toBe(999);
      expect(mockUser.username).toBe('customuser');
      expect(mockUser.email).toBe('custom@test.com');
      expect(mockUser.isActive).toBe(false);
    });
  });

  describe('createMockEmployee', () => {
    it('should create mock employee with default values', () => {
      const mockEmployee = TestUtils.createMockEmployee();

      expect(mockEmployee).toHaveProperty('id', 1);
      expect(mockEmployee).toHaveProperty('name', 'Test Employee');
      expect(mockEmployee).toHaveProperty('position', 'Developer');
      expect(mockEmployee).toHaveProperty('department', 'IT');
      expect(Array.isArray(mockEmployee.EmployeeSkills)).toBe(true);
    });

    it('should create mock employee with overrides', () => {
      const overrides = {
        name: 'Custom Employee',
        position: 'Manager',
        department: 'HR'
      };

      const mockEmployee = TestUtils.createMockEmployee(overrides);

      expect(mockEmployee.name).toBe('Custom Employee');
      expect(mockEmployee.position).toBe('Manager');
      expect(mockEmployee.department).toBe('HR');
    });
  });

  describe('createMockJob', () => {
    it('should create mock job with default values', () => {
      const mockJob = TestUtils.createMockJob();

      expect(mockJob).toHaveProperty('id', 1);
      expect(mockJob).toHaveProperty('emploi', 'Software Engineer');
      expect(mockJob).toHaveProperty('filiere_activite', 'IT');
      expect(Array.isArray(mockJob.requiredSkills)).toBe(true);
    });
  });

  describe('createMockSkill', () => {
    it('should create mock skill with default values', () => {
      const mockSkill = TestUtils.createMockSkill();

      expect(mockSkill).toHaveProperty('skill_id', 1);
      expect(mockSkill).toHaveProperty('skill_name', 'JavaScript');
      expect(mockSkill).toHaveProperty('skill_type', 'Technical');
      expect(mockSkill).toHaveProperty('level_value', 3);
    });
  });

  describe('generateRandomEmail', () => {
    it('should generate unique emails', () => {
      const email1 = TestUtils.generateRandomEmail();
      const email2 = TestUtils.generateRandomEmail();

      expect(email1).toMatch(/^test_\d+_[a-z0-9]+@test\.com$/);
      expect(email2).toMatch(/^test_\d+_[a-z0-9]+@test\.com$/);
      expect(email1).not.toBe(email2);
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate 6-digit codes', () => {
      const code1 = TestUtils.generateVerificationCode();
      const code2 = TestUtils.generateVerificationCode();

      expect(code1).toMatch(/^\d{6}$/);
      expect(code2).toMatch(/^\d{6}$/);
      expect(code1).not.toBe(code2);
    });
  });

  describe('waitForAsync', () => {
    it('should wait for specified time', async () => {
      const startTime = Date.now();
      await TestUtils.waitForAsync(100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(95);
      expect(endTime - startTime).toBeLessThan(150);
    });

    it('should resolve immediately with 0ms', async () => {
      const startTime = Date.now();
      await TestUtils.waitForAsync(0);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});