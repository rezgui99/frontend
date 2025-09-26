const mockSequelize = {
  transaction: jest.fn(() => ({
    commit: jest.fn(),
    rollback: jest.fn()
  })),
  Sequelize: {
    Op: {
      gt: 'gt',
      lt: 'lt'
    }
  }
};

const mockUser = {
  id: 1,
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@test.com',
  isActive: true,
  emailVerified: false,
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
  trackSuspiciousActivity: jest.fn(() => 1)
};

const mockDb = {
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Candidate: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Role: {
    findOne: jest.fn()
  },
  UserRole: {
    create: jest.fn()
  },
  Employee: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  JobDescription: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  sequelize: mockSequelize
};

module.exports = {
  mockSequelize,
  mockUser,
  mockDb
};