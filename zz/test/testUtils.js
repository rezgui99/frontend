class TestUtils {
  static createMockUser(overrides = {}) {
    return {
      id: 1,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      isActive: true,
      emailVerified: false,
      login_attempts: 0,
      locked_until: null,
      toJSON: jest.fn(() => ({
        id: 1,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com'
      })),
      checkPassword: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      trackSuspiciousActivity: jest.fn(() => 1),
      ...overrides
    };
  }

  static createMockEmployee(overrides = {}) {
    return {
      id: 1,
      name: 'Test Employee',
      position: 'Developer',
      department: 'IT',
      email: 'employee@test.com',
      EmployeeSkills: [],
      ...overrides
    };
  }

  static createMockJob(overrides = {}) {
    return {
      id: 1,
      emploi: 'Software Engineer',
      filiere_activite: 'IT',
      famille: 'Development',
      requiredSkills: [],
      ...overrides
    };
  }

  static createMockSkill(overrides = {}) {
    return {
      skill_id: 1,
      skill_name: 'JavaScript',
      skill_type: 'Technical',
      level_value: 3,
      level_name: 'Advanced',
      ...overrides
    };
  }

  static async waitForAsync(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateRandomEmail() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`;
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = TestUtils;