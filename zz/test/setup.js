process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.FROM_EMAIL = 'noreply@test.com';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.FAST_API_URL = 'http://localhost:8000';
process.env.RECOMMENDATION_API_URL = 'http://localhost:8001/api/v1';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_pass';

// Mock console pour éviter le spam dans les tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Mock fetch global
global.fetch = jest.fn();

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    verify: jest.fn((callback) => callback(null, true)),
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-id' }))
  }))
}));

// Cleanup après chaque test
afterEach(() => {
  jest.clearAllMocks();
});