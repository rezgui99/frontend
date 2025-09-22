const recommendationService = require('../services/recommendationService');
const { Employee, JobDescription, EmployeeSkill, JobRequiredSkill } = require('../../models');

/**
 * Obtenir les recommandations de formation pour un employé
 */
const getTrainingRecommendations = async (req, res) => {
  try {
    const { employeeId, targetJobId } = req.params;
    const { maxRecommendations = 5, priorityThreshold = 0.6 } = req.query;
    
    // Récupérer l'employé avec ses compétences
    const employee = await Employee.findByPk(employeeId, {
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          { model: db.Skill, as: 'Skill' },
          { model: db.SkillLevel, as: 'SkillLevel' }
        ]
      }]
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    
    // Récupérer le poste cible
    const targetJob = await JobDescription.findByPk(targetJobId, {
      include: [{
        model: JobRequiredSkill,
        as: 'requiredSkills',
        include: [
          { model: db.Skill, as: 'Skill' },
          { model: db.SkillLevel, as: 'SkillLevel' }
        ]
      }]
    });
    
    if (!targetJob) {
      return res.status(404).json({ error: 'Poste non trouvé' });
    }
    
    // Appeler l'API de recommandation
    const recommendations = await recommendationService.getTrainingRecommendations(
      employee,
      targetJob,
      { maxRecommendations, priorityThreshold }
    );
    
    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        position: employee.position
      },
      target_job: {
        id: targetJob.id,
        title: targetJob.emploi,
        department: targetJob.filiere_activite
      },
      recommendations,
      total: recommendations.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des recommandations' });
  }
};

/**
 * Obtenir les recommandations de postes pour un employé
 */
const getJobRecommendations = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { department, limit = 10, minScore = 0.5 } = req.query;
    
    // Récupérer l'employé
    const employee = await Employee.findByPk(employeeId, {
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          { model: db.Skill, as: 'Skill' },
          { model: db.SkillLevel, as: 'SkillLevel' }
        ]
      }]
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    
    // Récupérer les postes disponibles
    const whereClause = department ? { filiere_activite: department } : {};
    const availableJobs = await JobDescription.findAll({
      where: whereClause,
      include: [{
        model: JobRequiredSkill,
        as: 'requiredSkills',
        include: [
          { model: db.Skill, as: 'Skill' },
          { model: db.SkillLevel, as: 'SkillLevel' }
        ]
      }]
    });
    
    // Appeler l'API de recommandation
    const recommendations = await recommendationService.getJobRecommendations(
      employee,
      availableJobs,
      { 
        maxRecommendations: limit,
        minCompatibilityScore: minScore
      }
    );
    
    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        position: employee.position
      },
      recommendations,
      total: recommendations.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des recommandations' });
  }
};

module.exports = {
  getTrainingRecommendations,
  getJobRecommendations
};