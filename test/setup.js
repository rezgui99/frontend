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

// Mock console.error pour éviter le spam dans les tests
global.console.error = jest.fn();
global.console.log = jest.fn();