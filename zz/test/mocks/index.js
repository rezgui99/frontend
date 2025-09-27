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
  literal: jest.fn(),
  query: jest.fn(),
  authenticate: jest.fn()
};

// Fonction utilitaire pour nettoyer les objets Sequelize
const cleanSequelizeObject = (obj) => {
  if (!obj) return obj;
  const cleaned = JSON.parse(JSON.stringify(obj));
  // Supprimer les méthodes Sequelize communes
  delete cleaned.update;
  delete cleaned.destroy;
  delete cleaned.save;
  delete cleaned.toJSON;
  delete cleaned.checkPassword;
  delete cleaned.trackSuspiciousActivity;
  delete cleaned.increment;
  delete cleaned.setRoles;
  delete cleaned.getRoles;
  return cleaned;
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
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@test.com',
    isActive: true,
    emailVerified: false
  })),
  checkPassword: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  trackSuspiciousActivity: jest.fn(() => 1),
  generateVerificationCode: jest.fn(() => '123456'),
  verifyEmailCode: jest.fn(),
  isVerificationCodeExpired: jest.fn(() => false),
  setRoles: jest.fn(),
  getRoles: jest.fn(() => [])
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
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    firstName: 'Test',
    lastName: 'Candidate',
    email: 'candidate@test.com',
    isActive: true,
    emailVerified: false
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
  profile_picture: null,
  EmployeeSkills: [],
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    name: 'Test Employee',
    position: 'Developer',
    department: 'IT',
    email: 'employee@test.com',
    hire_date: '2022-01-01',
    EmployeeSkills: []
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
  finalite: 'Develop software',
  requiredSkills: [],
  missions: [],
  moyens: [],
  aireProximites: [],
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    emploi: 'Software Engineer',
    filiere_activite: 'IT',
    famille: 'Development',
    finalite: 'Develop software',
    requiredSkills: []
  })),
  update: jest.fn(),
  save: jest.fn(),
  destroy: jest.fn(),
  setMissions: jest.fn(),
  setMoyens: jest.fn(),
  setAireProximites: jest.fn(),
  addMission: jest.fn(),
  addMoyen: jest.fn(),
  addAireProximite: jest.fn(),
  getMissions: jest.fn(() => []),
  getMoyens: jest.fn(() => []),
  getAireProximites: jest.fn(() => [])
};

const mockJobOffer = {
  id: 1,
  title: 'Software Engineer Position',
  company: 'Test Company',
  status: 'published',
  application_deadline: new Date(Date.now() + 86400000),
  created_by: 1,
  views_count: 0,
  applications_count: 0,
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    title: 'Software Engineer Position',
    company: 'Test Company',
    status: 'published',
    application_deadline: new Date(Date.now() + 86400000)
  })),
  update: jest.fn(),
  save: jest.fn(),
  destroy: jest.fn(),
  increment: jest.fn()
};

const mockApplication = {
  id: 1,
  candidate_id: 1,
  job_offer_id: 1,
  cv_id: 1,
  status: 'applied',
  cover_letter: 'Test cover letter',
  applied_at: new Date(),
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    candidate_id: 1,
    job_offer_id: 1,
    cv_id: 1,
    status: 'applied',
    cover_letter: 'Test cover letter'
  })),
  update: jest.fn(),
  destroy: jest.fn()
};

const mockCV = {
  id: 1,
  candidate_id: 1,
  title: 'Mon CV',
  file_path: '/uploads/cv-test.pdf',
  file_name: 'cv-test.pdf',
  file_size: 1024,
  is_primary: true,
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    candidate_id: 1,
    title: 'Mon CV',
    file_path: '/uploads/cv-test.pdf',
    file_name: 'cv-test.pdf',
    file_size: 1024,
    is_primary: true
  })),
  update: jest.fn(),
  destroy: jest.fn()
};

const mockSkill = {
  id: 1,
  name: 'JavaScript',
  description: 'Programming language',
  skill_type_id: 1,
  type: { id: 1, type_name: 'Technique' },
  toJSON: jest.fn(() => cleanSequelizeObject({
    id: 1,
    name: 'JavaScript',
    description: 'Programming language',
    skill_type_id: 1,
    type: { id: 1, type_name: 'Technique' }
  })),
  update: jest.fn(),
  destroy: jest.fn()
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
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  UserRole: {
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    update: jest.fn()
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
    findOne: jest.fn(),
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
    destroy: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  Skill: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  SkillLevel: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  SkillType: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  EmployeeSkill: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  JobRequiredSkill: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  AuditLog: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  Moyen: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  Mission: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  AireProximite: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  sequelize: mockSequelize
};

module.exports = {
  mockSequelize,
  mockUser,
  mockCandidate,
  mockEmployee,
  mockJobDescription,
  mockJobOffer,
  mockApplication,
  mockCV,
  mockSkill,
  mockDb,
  cleanSequelizeObject
};