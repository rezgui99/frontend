const db = require("../../models/index");
const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
const { Employee, EmployeeSkill, Skill, SkillLevel, SkillType, sequelize } = db;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
async function syncEmployeeSkills({ employee, skills, transaction }) {
  console.log('Syncing skills for employee:', employee.id, 'Skills count:', skills.length);
  
  // Supprimer toutes les compétences existantes
  await EmployeeSkill.destroy({
    where: { employee_id: employee.id },
    transaction,
  });

  // Ajouter les nouvelles compétences
  await addEmployeeSkills({ employee, skills, transaction });
}

async function addEmployeeSkills({ employee, skills, transaction }) {
  console.log('Adding skills to employee:', employee.id);
  
  // Ajouter les nouvelles compétences
  for (const skillData of skills) {
    console.log('Processing skill:', skillData);
    
    // Vérifier que la compétence existe
    const skillInstance = await Skill.findByPk(skillData.skill_id, { transaction });
    if (!skillInstance) {
      throw new Error(`Compétence avec id ${skillData.skill_id} n'existe pas.`);
    }

    // Vérifier que le niveau existe si fourni
    let skillLevelId = skillData.actual_skill_level_id || null;
    if (skillLevelId) {
      const level = await SkillLevel.findByPk(skillLevelId, { transaction });
      if (!level) {
        throw new Error(`Niveau avec id ${skillLevelId} n'existe pas.`);
      }
    }

    console.log('Creating EmployeeSkill:', {
      employee_id: employee.id,
      skill_id: skillInstance.id,
      actual_skill_level_id: skillLevelId
    });
    
    // Créer l'association employé-compétence
    await EmployeeSkill.create(
      {
        employee_id: employee.id,
        skill_id: skillInstance.id,
        actual_skill_level_id: skillLevelId,
        acquired_date: skillData.acquired_date || null,
        certification: skillData.certification || null,
        last_evaluated_date: skillData.last_evaluated_date || null,
      },
      { transaction }
    );
  }
  
  console.log('All skills added successfully');
}

const findAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          {
            model: Skill,
            as: 'Skill',
            include: [
              {
                model: SkillType,
                as: "type",
              },
            ],
          },
          {
            model: SkillLevel,
            as: 'SkillLevel',
          },
        ],
      }],
    });
    
    console.log('Employees loaded:', employees.length);
    if (employees.length > 0) {
      console.log('First employee skills:', employees[0].EmployeeSkills?.length || 0);
      if (employees[0].EmployeeSkills?.length > 0) {
        console.log('First skill structure:', JSON.stringify(employees[0].EmployeeSkills[0], null, 2));
      }
    }
    res.json(employees);
  } catch (error) {
    console.error('Error in findAllEmployees:', error);
    res.status(500).json({ error: error.message });
  }
};

const findEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          {
            model: Skill,
            as: 'Skill',
            include: [
              {
                model: SkillType,
                as: "type",
              },
            ],
          },
          {
            model: SkillLevel,
            as: 'SkillLevel',
          },
        ],
      }],
    });
    if (!employee)
      return res.status(404).json({ message: "L'employée n'existe pas" });
    
    console.log('Employee found with skills:', {
      id: employee.id,
      name: employee.name,
      skillsCount: employee.EmployeeSkills?.length || 0,
      skillsData: employee.EmployeeSkills
    });
    
    res.json(employee);
  } catch (error) {
    console.error('Error in findEmployeeById:', error);
    res.status(500).json({ error: error.message });
  }
};

const createEmployee = async (req, res) => {
  const {
    name,
    position,
    hire_date,
    email,
    phone,
    gender,
    location,
    department,
    notes,
    skills = '[]',
  } = req.body;

  let profile_picture = null;
  
  // Gestion de l'upload de l'image - CORRECTION DU CHEMIN
  if (req.file) {
    // Stocker seulement le chemin relatif depuis /uploads
    profile_picture = `/uploads/profile-pictures/${req.file.filename}`;
    console.log('Image uploadée:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      savedAs: profile_picture
    });
  }

  const t = await sequelize.transaction();

  try {
    console.log('Creating employee with data:', { name, position, email, profile_picture });
    
    let skillsData = [];
    try {
      skillsData = JSON.parse(skills);
      console.log('Parsed skills:', skillsData);
    } catch (parseError) {
      console.error('Error parsing skills JSON:', parseError);
      skillsData = [];
    }

    const employee = await Employee.create(
      { name, position, hire_date, email, phone, gender, location, department, notes, profile_picture },
      { transaction: t }
    );

    console.log('Employee created with ID:', employee.id);
    
    if (skillsData && skillsData.length > 0) {
      console.log('Adding skills to new employee:', skillsData);
      await addEmployeeSkills({ employee, skills: skillsData, transaction: t });
    }

    const createdEmployee = await Employee.findByPk(employee.id, {
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          {
            model: Skill,
            as: 'Skill',
            include: [
              {
                model: SkillType,
                as: "type",
              },
            ],
          },
          {
            model: SkillLevel,
            as: 'SkillLevel',
          },
        ],
      }],
      transaction: t,
    });

    console.log('Employee created successfully with skills:', createdEmployee?.EmployeeSkills?.length || 0);
    await t.commit();
    res.status(201).json(createdEmployee);
  } catch (err) {
    console.error('Error creating employee:', err);
    
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Fichier supprimé suite à l\'erreur:', req.file.path);
    }
    
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

const updateEmployee = async (req, res) => {
  const {
    name,
    position,
    hire_date,
    email,
    phone,
    gender,
    location,
    department,
    notes,
    skills = '[]',
  } = req.body;

  let newProfilePicture = null;
  
  // Gestion de l'upload de l'image - CORRECTION DU CHEMIN
  if (req.file) {
    newProfilePicture = `/uploads/profile-pictures/${req.file.filename}`;
    console.log('Nouvelle image uploadée:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      savedAs: newProfilePicture
    });
  }

  const t = await sequelize.transaction();

  try {
    console.log('Updating employee:', req.params.id);
    
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) {
      // Supprimer le nouveau fichier s'il y en a un
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      await t.rollback();
      return res.status(404).json({ message: "L'employé n'existe pas" });
    }

    let skillsData = [];
    try {
      skillsData = JSON.parse(skills);
      console.log('Parsed skills:', skillsData);
    } catch (parseError) {
      console.error('Error parsing skills JSON:', parseError);
      skillsData = [];
    }

    // Préparer les données de mise à jour
    const updateData = { 
      name, position, hire_date, email, phone, gender, 
      location, department, notes 
    };
    
    // Gestion de la photo de profil
    if (newProfilePicture) {
      // Supprimer l'ancienne photo si elle existe
      if (employee.profile_picture) {
        const oldImagePath = path.join(__dirname, '..', employee.profile_picture);
        console.log('Tentative de suppression de l\'ancienne image:', oldImagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('Ancienne image supprimée');
        }
      }
      updateData.profile_picture = newProfilePicture;
    }

    await employee.update(updateData, { transaction: t });

    await syncEmployeeSkills({ employee, skills: skillsData, transaction: t });

    const updatedEmployee = await Employee.findByPk(employee.id, {
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          {
            model: Skill,
            as: 'Skill',
            include: [
              {
                model: SkillType,
                as: "type",
              },
            ],
          },
          {
            model: SkillLevel,
            as: 'SkillLevel',
          },
        ],
      }],
      transaction: t,
    });

    console.log('Employee updated successfully:', {
      id: updatedEmployee.id,
      name: updatedEmployee.name,
      profile_picture: updatedEmployee.profile_picture,
      skillsCount: updatedEmployee?.EmployeeSkills?.length || 0
    });
    
    await t.commit();
    res.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    
    // Supprimer le nouveau fichier en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
const deleteEmployee = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) {
      await t.rollback();
      return res.status(404).json({ message: "L'employée n'existe pas" });
    }

    await EmployeeSkill.destroy({
      where: { employee_id: employee.id },
      transaction: t,
    });

    await employee.destroy({ transaction: t });

    await t.commit();
    res.json({ message: "Employee supprimée avec succès" });
  } catch (error) {
    console.error('Error deleting employee:', error);
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  findAllEmployees,
  findEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  
};
