const recommendationService = require('../services/recommendationService');

// Import des modèles Sequelize
const db = require("../../models/index");
const { Employee, JobDescription, Skill, SkillLevel, SkillType, EmployeeSkill, JobRequiredSkill } = db;

/**
 * Vérifier la santé de l'API de recommandation
 */
const checkRecommendationAPIHealth = async (req, res) => {
  try {
    console.log('🏥 Checking recommendation API health...');
    
    const healthStatus = await recommendationService.checkHealth();
    
    res.json({
      message: 'Statut de l\'API de recommandation',
      ml_api: healthStatus,
      backend_status: 'healthy',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error checking recommendation API health:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification de l\'API de recommandation',
      details: error.message,
      ml_api: {
        status: 'unhealthy',
        error: error.message
      },
      backend_status: 'healthy'
    });
  }
};

/**
 * Obtenir des recommandations de formation pour un employé vers un poste spécifique
 * Route: GET /api/recommendations/training/:employeeId/:jobId
 */
const getTrainingRecommendations = async (req, res) => {
  try {
    const { employeeId, jobId } = req.params;
    const { maxRecommendations, priorityThreshold } = req.query;
    
    console.log(`🎓 Getting training recommendations for employee ${employeeId} -> job ${jobId}`);
    
    // Validation des paramètres
    if (!employeeId || !jobId) {
      return res.status(400).json({ 
        error: 'Paramètres manquants',
        details: 'employeeId et jobId sont requis'
      });
    }

    // Récupérer l'employé avec ses compétences
    const employee = await Employee.findByPk(employeeId, {
      include: [
        {
          model: EmployeeSkill,
          as: 'EmployeeSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [
                {
                  model: SkillType,
                  as: 'type'
                }
              ]
            },
            {
              model: SkillLevel,
              as: 'SkillLevel'
            }
          ]
        }
      ]
    });
    
    if (!employee) {
      return res.status(404).json({ 
        error: 'Employé non trouvé',
        employeeId: parseInt(employeeId)
      });
    }
    
    // Récupérer le poste cible avec ses compétences requises
    const targetJob = await JobDescription.findByPk(jobId, {
      include: [
        {
          model: JobRequiredSkill,
          as: 'requiredSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [
                {
                  model: SkillType,
                  as: 'type'
                }
              ]
            },
            {
              model: SkillLevel,
              as: 'SkillLevel'
            }
          ]
        }
      ]
    });
    
    if (!targetJob) {
      return res.status(404).json({ 
        error: 'Poste non trouvé',
        jobId: parseInt(jobId)
      });
    }

    // Analyser les écarts de compétences et générer les recommandations
    const recommendations = await generateTrainingRecommendations(employee, targetJob);
    
    // Format de réponse selon vos spécifications
    const response = {
      employeeId: parseInt(employeeId),
      jobId: parseInt(jobId),
      employee: {
        name: employee.name,
        position: employee.position,
        department: employee.department
      },
      targetJob: {
        title: targetJob.emploi,
        department: targetJob.filiere_activite,
        family: targetJob.famille
      },
      recommendations: recommendations,
      totalRecommendations: recommendations.length,
      generatedAt: new Date().toISOString()
    };
    
    console.log(`✅ Generated ${recommendations.length} training recommendations`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error getting training recommendations:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération des recommandations de formation',
      details: error.message,
      employeeId: req.params.employeeId ? parseInt(req.params.employeeId) : null,
      jobId: req.params.jobId ? parseInt(req.params.jobId) : null
    });
  }
};

/**
 * Générer les recommandations de formation en analysant les écarts
 */
const generateTrainingRecommendations = async (employee, targetJob) => {
  const recommendations = [];
  
  // Créer un mapping des compétences de l'employé
  const employeeSkillsMap = {};
  const employeeSkills = employee.EmployeeSkills || employee.skills || [];
  
  employeeSkills.forEach(empSkill => {
    employeeSkillsMap[empSkill.skill_id] = {
      currentLevel: empSkill.SkillLevel?.value || 1,
      currentLevelName: empSkill.SkillLevel?.level_name || 'Débutant',
      skillName: empSkill.Skill?.name || 'Compétence inconnue',
      skillType: empSkill.Skill?.type?.type_name || 'Non défini',
      certification: empSkill.certification
    };
  });

  // Analyser chaque compétence requise pour le poste
  const requiredSkills = targetJob.requiredSkills || [];
  
  for (const requiredSkill of requiredSkills) {
    const skillId = requiredSkill.skill_id;
    const requiredLevel = requiredSkill.SkillLevel?.value || requiredSkill.required_skill_level_id || 3;
    const requiredLevelName = requiredSkill.SkillLevel?.level_name || 'Autonome';
    const skillName = requiredSkill.Skill?.name || 'Compétence inconnue';
    const skillType = requiredSkill.Skill?.type?.type_name || 'Non défini';
    
    const employeeSkill = employeeSkillsMap[skillId];
    const currentLevel = employeeSkill ? employeeSkill.currentLevel : 0;
    const currentLevelName = employeeSkill ? employeeSkill.currentLevelName : 'Aucun';
    
    // Si il y a un écart de compétence
    if (currentLevel < requiredLevel) {
      const gap = requiredLevel - currentLevel;
      
      // Déterminer le type de formation recommandée
      const trainingRecommendation = determineTrainingType(skillName, skillType, gap, currentLevel, requiredLevel);
      
      recommendations.push({
        skill: skillName,
        skillType: skillType,
        skillId: skillId,
        currentLevel: currentLevelName,
        currentLevelValue: currentLevel,
        requiredLevel: requiredLevelName,
        requiredLevelValue: requiredLevel,
        gap: gap,
        training: trainingRecommendation.training,
        trainingType: trainingRecommendation.type,
        estimatedDuration: trainingRecommendation.duration,
        priority: trainingRecommendation.priority,
        description: trainingRecommendation.description,
        estimatedCost: trainingRecommendation.cost,
        hasCertification: employeeSkill ? !!employeeSkill.certification : false
      });
    }
  }

  // Trier par priorité (gap le plus important en premier)
  recommendations.sort((a, b) => {
    if (a.priority !== b.priority) {
      const priorityOrder = { 'Critique': 4, 'Élevée': 3, 'Moyenne': 2, 'Faible': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.gap - a.gap;
  });

  return recommendations;
};

/**
 * Déterminer le type de formation recommandée selon l'écart
 */
const determineTrainingType = (skillName, skillType, gap, currentLevel, requiredLevel) => {
  let training, type, duration, priority, description, cost;

  // Déterminer la priorité selon l'écart
  if (gap >= 3) {
    priority = 'Critique';
  } else if (gap >= 2) {
    priority = 'Élevée';
  } else if (gap >= 1) {
    priority = 'Moyenne';
  } else {
    priority = 'Faible';
  }

  // Déterminer le type de formation selon le type de compétence et l'écart
  if (skillType === 'Technique') {
    if (gap === 1) {
      training = `Formation ${skillName} - Niveau Intermédiaire`;
      type = 'Formation en ligne';
      duration = '20-40 heures';
      cost = 500;
      description = `Formation pour passer du niveau ${currentLevel} au niveau ${requiredLevel} en ${skillName}`;
    } else if (gap === 2) {
      training = `Formation ${skillName} - Niveau Avancé`;
      type = 'Formation présentielle';
      duration = '40-80 heures';
      cost = 1200;
      description = `Formation intensive pour maîtriser ${skillName} au niveau requis`;
    } else {
      training = `Certification ${skillName} + Formation complète`;
      type = 'Certification professionnelle';
      duration = '80-120 heures';
      cost = 2000;
      description = `Programme complet avec certification pour atteindre l'expertise en ${skillName}`;
    }
  } else if (skillType === 'Managériale') {
    if (gap === 1) {
      training = `Formation Leadership - ${skillName}`;
      type = 'Atelier pratique';
      duration = '16-24 heures';
      cost = 800;
      description = `Développement des compétences managériales en ${skillName}`;
    } else {
      training = `Programme Management - ${skillName}`;
      type = 'Formation longue durée';
      duration = '40-60 heures';
      cost = 1500;
      description = `Programme complet de développement managérial`;
    }
  } else if (skillType === 'Communication') {
    training = `Formation Communication - ${skillName}`;
    type = 'Atelier interactif';
    duration = '12-20 heures';
    cost = 600;
    description = `Amélioration des compétences de communication`;
  } else {
    // Compétence générale
    training = `Formation ${skillName}`;
    type = 'Formation mixte';
    duration = '20-40 heures';
    cost = 700;
    description = `Formation pour développer la compétence ${skillName}`;
  }

  return {
    training,
    type,
    duration,
    priority,
    description,
    cost
  };
};

/**
 * Obtenir des recommandations de poste pour un employé
 */
const getEmployeeJobRecommendations = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { department, maxRecommendations, minCompatibilityScore } = req.query;
    
    console.log(`💼 Getting job recommendations for employee ${employeeId}`);
    
    // Récupérer l'employé avec ses compétences
    const employee = await Employee.findByPk(employeeId, {
      include: [
        {
          model: EmployeeSkill,
          as: 'EmployeeSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [
                {
                  model: SkillType,
                  as: 'type'
                }
              ]
            },
            {
              model: SkillLevel,
              as: 'SkillLevel'
            }
          ]
        }
      ]
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    
    // Récupérer tous les postes disponibles (ou filtrer par département)
    const whereClause = {};
    if (department) {
      whereClause.filiere_activite = department;
    }
    
    const availableJobs = await JobDescription.findAll({
      where: whereClause,
      include: [
        {
          model: JobRequiredSkill,
          as: 'requiredSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [
                {
                  model: SkillType,
                  as: 'type'
                }
              ]
            },
            {
              model: SkillLevel,
              as: 'SkillLevel'
            }
          ]
        }
      ]
    });
    
    if (availableJobs.length === 0) {
      return res.json({
        employee: {
          id: employee.id,
          name: employee.name,
          position: employee.position
        },
        recommendations: [],
        total: 0,
        message: 'Aucun poste disponible trouvé'
      });
    }
    
    // Appeler l'API de recommandation
    const options = {
      maxRecommendations: maxRecommendations ? parseInt(maxRecommendations) : 10,
      minCompatibilityScore: minCompatibilityScore ? parseFloat(minCompatibilityScore) : 0.5
    };
    
    const recommendations = await recommendationService.getJobRecommendations(
      employee,
      availableJobs,
      options
    );
    
    res.json(recommendations);
    
  } catch (error) {
    console.error('❌ Error getting job recommendations:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération des recommandations de poste',
      details: error.message 
    });
  }
};

/**
 * Valider les données avant envoi à l'API ML
 */
const validateRecommendationData = async (req, res) => {
  try {
    const validationResult = await recommendationService.validateData(req.body);
    res.json(validationResult);
  } catch (error) {
    console.error('❌ Error validating recommendation data:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la validation des données',
      details: error.message 
    });
  }
};

/**
 * Obtenir le statut des modèles ML
 */
const getModelStatus = async (req, res) => {
  try {
    const modelStatus = await recommendationService.getModelStatus();
    res.json({
      message: 'Statut des modèles ML',
      models: modelStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting model status:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du statut des modèles',
      details: error.message 
    });
  }
};

/**
 * Réentraîner les modèles ML
 */
const retrainModels = async (req, res) => {
  try {
    console.log('🔄 Starting model retraining...');
    
    const retrainResult = await recommendationService.retrainModels();
    
    res.json({
      message: 'Réentraînement des modèles terminé',
      result: retrainResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error retraining models:', error);
    res.status(500).json({ 
      error: 'Erreur lors du réentraînement des modèles',
      details: error.message 
    });
  }
};

module.exports = {
  checkRecommendationAPIHealth,
  getTrainingRecommendations,
  getEmployeeJobRecommendations,
  validateRecommendationData,
  getModelStatus,
  retrainModels
};