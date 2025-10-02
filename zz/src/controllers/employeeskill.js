const db = require("../../models/index");
const { EmployeeSkill, Skill, Employee, SkillLevel } = db;

// GET all employee skills
const findAllEmployeeSkills = async (req, res) => {
  try {
    const data = await EmployeeSkill.findAll({
      include: [
        { model: Employee, as: "Employee" },
        { model: Skill, as: "Skill" },
        { model: SkillLevel, as: "SkillLevel" },
      ],
    });
    res.json(data);
  } catch (error) {
    console.error("Erreur findAllEmployeeSkills:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET a specific employee skill
const findEmployeeSkill = async (req, res) => {
  try {
    const { employee_id, skill_id } = req.params;
    const data = await EmployeeSkill.findOne({
      where: { employee_id, skill_id },
      include: [
        { model: Employee, as: "Employee" },
        { model: Skill, as: "Skill" },
        { model: SkillLevel, as: "SkillLevel" },
      ],
    });

    if (!data) {
      return res.status(404).json({ message: "Compétence de l'employé n'existe pas" });
    }

    res.json(data);
  } catch (error) {
    console.error("Erreur findEmployeeSkill:", error);
    res.status(500).json({ error: error.message });
  }
};

// POST create a new employee skill
const createEmployeeSkill = async (req, res) => {
  try {
    const {
      employee_id,
      skill_id,
      actual_skill_level_id,
      acquired_date,
      certification,
      last_evaluated_date,
    } = req.body;

    const exists = await EmployeeSkill.findOne({ where: { employee_id, skill_id } });
    if (exists) {
      return res.status(409).json({ message: "Compétence de l'employé existe déjà" });
    }

    await EmployeeSkill.create({
      employee_id,
      skill_id,
      actual_skill_level_id,
      acquired_date,
      certification,
      last_evaluated_date: last_evaluated_date || new Date(),
    });

    const fullData = await EmployeeSkill.findOne({
      where: { employee_id, skill_id },
      include: [
        { model: Employee, as: "Employee" },
        { model: Skill, as: "Skill" },
        { model: SkillLevel, as: "SkillLevel" },
      ],
    });

    res.status(201).json(fullData);
  } catch (error) {
    console.error("Erreur createEmployeeSkill:", error);
    res.status(500).json({ error: error.message });
  }
};

// PUT update an employee skill
const updateEmployeeSkill = async (req, res) => {
  try {
    const { employee_id, skill_id } = req.params;
    const {
      actual_skill_level_id,
      acquired_date,
      certification,
      last_evaluated_date,
    } = req.body;

    const entry = await EmployeeSkill.findOne({ where: { employee_id, skill_id } });

    if (!entry) {
      return res.status(404).json({ message: "Compétence de l'employé n'existe pas" });
    }

    await entry.update({
      actual_skill_level_id,
      acquired_date,
      certification,
      last_evaluated_date: last_evaluated_date || new Date(),
    });

    const fullData = await EmployeeSkill.findOne({
      where: { employee_id, skill_id },
      include: [
        { model: Employee, as: "Employee" },
        { model: Skill, as: "Skill" },
        { model: SkillLevel, as: "SkillLevel" },
      ],
    });

    res.json(fullData);
  } catch (error) {
    console.error("Erreur updateEmployeeSkill:", error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE an employee skill
const deleteEmployeeSkill = async (req, res) => {
  try {
    const { employee_id, skill_id } = req.params;

    const entry = await EmployeeSkill.findOne({ where: { employee_id, skill_id } });

    if (!entry) {
      return res.status(404).json({ message: "Compétence de l'employé n'existe pas" });
    }

    await entry.destroy();
    res.json({ message: "Compétence de l'employé supprimée avec succès" });
  } catch (error) {
    console.error("Erreur deleteEmployeeSkill:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  findAllEmployeeSkills,
  findEmployeeSkill,
  createEmployeeSkill,
  updateEmployeeSkill,
  deleteEmployeeSkill,
};
