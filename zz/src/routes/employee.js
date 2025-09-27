const express = require("express");
const router = express.Router();
const {
  createEmployee,
  updateEmployee,
  findAllEmployees,
  findEmployeeById,
  deleteEmployee,
} = require("../controllers/employee");


const validateEmployee = require("../middleware/validateEmployee");
const upload = require('../middleware/upload');

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`Employee route: ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

router.post('/', upload.single('profile_picture'),createEmployee);
router.put('/:id', upload.single('profile_picture'),updateEmployee);
router.get("/", findAllEmployees);
router.get("/:id", findEmployeeById);
router.delete("/:id", deleteEmployee);

module.exports = router;
