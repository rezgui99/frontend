const validateEmployee = require('../../src/middleware/validateEmployee');

describe('ValidateEmployee Middleware', () => {
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

  const validEmployeeData = {
    name: 'Test Employee',
    position: 'Developer',
    hire_date: '2023-01-01T00:00:00.000Z',
    email: 'test@test.com',
    phone: '+216123456789',
    gender: 'Homme',
    location: 'Tunis',
    department: 'IT',
    notes: 'Test notes',
    skills: [
      {
        skill_id: 1,
        actual_skill_level_id: 3,
        acquired_date: '2022-01-01T00:00:00.000Z',
        certification: 'Test Cert'
      }
    ]
  };

  it('should pass validation with valid data', () => {
    req.body = validEmployeeData;

    validateEmployee(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should fail validation if name is missing', () => {
    req.body = { ...validEmployeeData, name: undefined };

    validateEmployee(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Erreur de validation',
      details: expect.arrayContaining([
        expect.stringContaining('name')
      ])
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail validation if position is missing', () => {
    req.body = { ...validEmployeeData, position: undefined };

    validateEmployee(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail validation if email is invalid', () => {
    req.body = { ...validEmployeeData, email: 'invalid-email' };

    validateEmployee(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail validation if hire_date is invalid', () => {
    req.body = { ...validEmployeeData, hire_date: 'invalid-date' };

    validateEmployee(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail validation if phone format is invalid', () => {
    req.body = { ...validEmployeeData, phone: 'invalid-phone' };

    validateEmployee(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail validation if gender is invalid', () => {
    req.body = { ...validEmployeeData, gender: 'Invalid' };

    validateEmployee(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass validation with optional fields as null', () => {
    req.body = {
      ...validEmployeeData,
      phone: null,
      gender: null,
      location: null,
      department: null,
      notes: null,
      skills: []
    };

    validateEmployee(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should fail validation if skills array contains invalid skill', () => {
    req.body = {
      ...validEmployeeData,
      skills: [
        {
          skill_id: 'invalid', // Should be number
          actual_skill_level_id: 3
        }
      ]
    };

    validateEmployee(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});