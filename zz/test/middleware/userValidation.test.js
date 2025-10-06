const {
  validateCreateUser,
  validateUpdateUser,
  validateAssignRole,
  validateAdminResetPassword
} = require('../../src/middleware/userValidation');

describe('User Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateCreateUser', () => {
    const validUserData = {
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      password: 'password123',
      roleIds: [1]
    };

    it('should pass validation with valid data', () => {
      req.body = validUserData;

      validateCreateUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation if username is missing', () => {
      req.body = { ...validUserData, username: undefined };

      validateCreateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Données invalides',
        details: expect.arrayContaining([
          expect.stringContaining('username')
        ])
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail validation if email is invalid', () => {
      req.body = { ...validUserData, email: 'invalid-email' };

      validateCreateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail validation if password is too short', () => {
      req.body = { ...validUserData, password: '123' };

      validateCreateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass validation without roleIds', () => {
      req.body = { ...validUserData, roleIds: undefined };

      validateCreateUser(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateUpdateUser', () => {
    it('should pass validation with partial update data', () => {
      req.body = {
        firstName: 'Updated',
        email: 'updated@test.com'
      };

      validateUpdateUser(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should fail validation if email is invalid', () => {
      req.body = { email: 'invalid-email' };

      validateUpdateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass validation with empty body', () => {
      req.body = {};

      validateUpdateUser(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateAssignRole', () => {
    it('should pass validation with valid role assignment data', () => {
      req.body = {
        userId: 1,
        roleId: 2
      };

      validateAssignRole(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should fail validation if userId is missing', () => {
      req.body = { roleId: 2 };

      validateAssignRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail validation if roleId is missing', () => {
      req.body = { userId: 1 };

      validateAssignRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail validation if userId is not a positive integer', () => {
      req.body = { userId: -1, roleId: 2 };

      validateAssignRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateAdminResetPassword', () => {
    it('should pass validation with valid password', () => {
      req.body = { newPassword: 'newpassword123' };

      validateAdminResetPassword(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should fail validation if password is missing', () => {
      req.body = {};

      validateAdminResetPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail validation if password is too short', () => {
      req.body = { newPassword: '123' };

      validateAdminResetPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});