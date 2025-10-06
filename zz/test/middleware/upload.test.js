const upload = require('../../src/middleware/upload');
const multer = require('multer');

// Mock multer
jest.mock('multer');
jest.mock('fs');
jest.mock('path');

describe('Upload Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should configure multer with correct settings', () => {
    expect(multer).toHaveBeenCalledWith({
      storage: expect.any(Object),
      fileFilter: expect.any(Function),
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    });
  });

  describe('fileFilter', () => {
    let fileFilter;

    beforeEach(() => {
      const multerCall = multer.mock.calls[0];
      fileFilter = multerCall[0].fileFilter;
    });

    it('should accept valid image types', () => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      
      validTypes.forEach(mimetype => {
        const cb = jest.fn();
        fileFilter({}, { mimetype }, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4'];
      
      invalidTypes.forEach(mimetype => {
        const cb = jest.fn();
        fileFilter({}, { mimetype }, cb);
        expect(cb).toHaveBeenCalledWith(
          expect.any(Error),
          false
        );
      });
    });
  });

  describe('storage configuration', () => {
    let storage;

    beforeEach(() => {
      const multerCall = multer.mock.calls[0];
      storage = multerCall[0].storage;
    });

    it('should generate unique filename', () => {
      const filename = jest.fn();
      const file = { originalname: 'test.jpg' };
      
      // Mock Date.now and Math.random for predictable results
      const originalDateNow = Date.now;
      const originalMathRandom = Math.random;
      Date.now = jest.fn(() => 1234567890);
      Math.random = jest.fn(() => 0.5);

      storage.filename({}, file, filename);

      expect(filename).toHaveBeenCalledWith(null, expect.stringMatching(/^profile-\d+-\d+\.jpg$/));

      // Restore original functions
      Date.now = originalDateNow;
      Math.random = originalMathRandom;
    });
  });
});