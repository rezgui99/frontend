const mockSequelize = {
  transaction: jest.fn(() => ({
    commit: jest.fn(),
    rollback: jest.fn()
  })),
  Sequelize: {
    Op: {
      gt: 'gt',
      lt: 'lt',
      gte: 'gte',
      lte: 'lte',
      ne: 'ne',
      in: 'in',
      or: 'or',
      and: 'and',
      iLike: 'iLike',
      between: 'between'
    }
  },
  QueryTypes: {
    SELECT: 'SELECT'
  },
  fn: jest.fn(),
  col: jest.fn(),
  literal: jest.fn()
};

const mockUser = {
  id: 1,
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@test.com',
  isActive: true,
  emailVerified: false,
  login_attempts: 0,
  locked_until: null,
  suspiciousActivityCount: 0,
  securityNotificationSent: false,
  emailVerificationCode: null,
  emailVerificationExpires: null,
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
  generateVerificationCode: jest.fn(() => '123456'),
  verifyEmailCode: jest.fn(),
  isVerificationCodeExpired: jest.fn(() => false)
};

const mockCandidate = {
  id: 1,
  firstName: 'Test',
  lastName: 'Candidate',
  email: 'candidate@test.com',
  isActive: true,
  emailVerified: false,
  login_attempts: 0,
  locked_until: null,
  toJSON: jest.fn(() => ({
    id: 1,
    firstName: 'Test',
    lastName: 'Candidate',
    email: 'candidate@test.com'
  })),
  checkPassword: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  trackSuspiciousActivity: jest.fn(() => 1)
};

const mockEmployee = {
  id: 1,
  name: 'Test Employee',
  position: 'Developer',
  department: 'IT',
  email: 'employee@test.com',
  hire_date: '2022-01-01',
  EmployeeSkills: [],
  toJSON: jest.fn(() => ({
    id: 1,
    name: 'Test Employee',
    position: 'Developer'
  })),
  update: jest.fn(),
  save: jest.fn(),
  destroy: jest.fn()
};

const mockJobDescription = {
  id: 1,
  emploi: 'Software Engineer',
  filiere_activite: 'IT',
  famille: 'Development',
  requiredSkills: [],
  toJSON: jest.fn(() => ({
    id: 1,
    emploi: 'Software Engineer'
  })),
  update: jest.fn(),
  save: jest.fn(),
  destroy: jest.fn()
};

const mockJobOffer = {
  id: 1,
  title: 'Software Engineer Position',
  company: 'Test Company',
  status: 'published',
  toJSON: jest.fn(() => ({
    id: 1,
    title: 'Software Engineer Position'
  })),
  update: jest.fn(),
  save: jest.fn(),
  destroy: jest.fn(),
  increment: jest.fn()
};

const mockDb = {
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Candidate: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Role: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  UserRole: {
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  Employee: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  JobDescription: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  JobOffer: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Application: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Interview: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  CandidateCV: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  CandidateFavorite: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn()
  },
  Skill: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  SkillLevel: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  SkillType: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  EmployeeSkill: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  JobRequiredSkill: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  AuditLog: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn()
  },
  sequelize: mockSequelize,
  query: jest.fn()
};

module.exports = {
  mockSequelize,
  mockUser,
  mockCandidate,
  mockEmployee,
  mockJobDescription,
  mockJobOffer,
  mockDb
};