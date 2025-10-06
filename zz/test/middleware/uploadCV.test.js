const uploadCV = require('../../src/middleware/uploadCV');
const multer = require('multer');

// Mock multer
jest.mock('multer');
jest.mock('fs');
jest.mock('path');

describe('UploadCV Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should configure multer with correct settings for CVs', () => {
    expect(multer).toHaveBeenCalledWith({
      storage: expect.any(Object),
      fileFilter: expect.any(Function),
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      }
    });
  });

  describe('fileFilter', () => {
    let fileFilter;

    beforeEach(() => {
      const multerCall = multer.mock.calls[0];
      fileFilter = multerCall[0].fileFilter;
    });

    it('should accept valid CV file types', () => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      validTypes.forEach(mimetype => {
        const cb = jest.fn();
        fileFilter({}, { mimetype }, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject invalid file types for CVs', () => {
      const invalidTypes = ['image/jpeg', 'text/plain', 'video/mp4'];
      
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

    it('should generate unique CV filename', () => {
      const filename = jest.fn();
      const file = { originalname: 'cv.pdf' };
      
      const originalDateNow = Date.now;
      const originalMathRandom = Math.random;
      Date.now = jest.fn(() => 1234567890);
      Math.random = jest.fn(() => 0.5);

      storage.filename({}, file, filename);

      expect(filename).toHaveBeenCalledWith(null, expect.stringMatching(/^cv-\d+-\d+\.pdf$/));

      Date.now = originalDateNow;
      Math.random = originalMathRandom;
    });
  });
});