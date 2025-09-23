// controllers/recommendationController.js

const recommendationService = require('../services/recommendationService');

// Import des modèles Sequelize
const db = require("../../models/index");
const { Employee, JobDescription, Skill, SkillLevel, SkillType, EmployeeSkill, JobRequiredSkill } = db;

/* ===================== Helpers UI ===================== */

const normalizeDurationToHours = (d) => {
  if (!d || typeof d !== 'string') return null;        // gère null/undefined
  // "20-40 heures", "16-24 heures", "80-120 heures"
  const range = d.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const a = parseInt(range[1], 10), b = parseInt(range[2], 10);
    return Math.round((a + b) / 2);
  }
  // "20 h", "24 heures"
  const single = d.match(/(\d+)/);
  return single ? parseInt(single[1], 10) : null;
};

const inferDifficulty = (gap) => {
  if (gap >= 3) return 'Difficile';
  if (gap === 2) return 'Moyenne';
  return 'Facile';
};

const inferSuccessProb = (gap, hasCert) => {
  // Heuristique explicable et stable
  let base = gap >= 3 ? 0.55 : gap === 2 ? 0.70 : 0.85;
  if (hasCert) base += 0.05;
  return Math.max(0.10, Math.min(0.98, base));
};

/* ===================== Healthcheck ===================== */

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
      ml_api: { status: 'unhealthy', error: error.message },
      backend_status: 'healthy'
    });
  }
};

/* ===================== Training Recommendations ===================== */
/**
 * GET /api/recommendations/training/:employeeId/:jobId
 */
const getTrainingRecommendations = async (req, res) => {
  try {
    const { employeeId, jobId } = req.params;
    const { maxRecommendations, priorityThreshold } = req.query;

    console.log(`🎓 Getting training recommendations for employee ${employeeId} -> job ${jobId}`);

    // Validation
    if (!employeeId || !jobId) {
      return res.status(400).json({
        error: 'Paramètres manquants',
        details: 'employeeId et jobId sont requis'
      });
    }

    // Employé + compétences
    const employee = await Employee.findByPk(employeeId, {
      include: [
        {
          model: EmployeeSkill,
          as: 'EmployeeSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [{ model: SkillType, as: 'type' }]
            },
            { model: SkillLevel, as: 'SkillLevel' }
          ]
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({
        error: 'Employé non trouvé',
        employeeId: parseInt(employeeId, 10)
      });
    }

    // Poste cible + compétences requises
    const targetJob = await JobDescription.findByPk(jobId, {
      include: [
        {
          model: JobRequiredSkill,
          as: 'requiredSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [{ model: SkillType, as: 'type' }]
            },
            { model: SkillLevel, as: 'SkillLevel' }
          ]
        }
      ]
    });

    if (!targetJob) {
      return res.status(404).json({
        error: 'Poste non trouvé',
        jobId: parseInt(jobId, 10)
      });
    }

    // Génération brute
    const rawRecommendations = await generateTrainingRecommendations(employee, targetJob, {
      maxRecommendations: maxRecommendations ? parseInt(maxRecommendations, 10) : undefined,
      priorityThreshold: priorityThreshold ? parseFloat(priorityThreshold) : undefined
    });

    // Mapping UI pour coller au template Angular
    const recommendations = (rawRecommendations || []).map(r => ({
      // Noms attendus par l'UI
      skill_name: r.skill,
      skill_type: r.skillType,
      skill_id: r.skillId,

      current_level: r.currentLevelValue ?? 0,
      target_level: r.requiredLevelValue ?? 1,
      gap: r.gap ?? Math.max(0, (r.requiredLevelValue ?? 1) - (r.currentLevelValue ?? 0)),

      training_type: r.trainingType,
      estimated_duration_hours: normalizeDurationToHours(r.estimatedDuration),
      difficulty: inferDifficulty(r.gap),
      success_probability: inferSuccessProb(r.gap, r.hasCertification),

      estimated_cost: r.estimatedCost ?? null,
      roi_estimate: r.estimatedCost ? 1.0 : null, // adapte si tu calcules un vrai ROI
      justification: r.description ?? '',

      priority: r.priority,

      // Pour affichages optionnels
      expected_benefits: r.expected_benefits || []
    }));

    // Optionnel : filtrer par seuil de priorité s'il est fourni (0..1)
    // Ici on mappe un seuil à une priorité minimale
    if (priorityThreshold !== undefined) {
      const p = parseFloat(priorityThreshold);
      const mapToMinPriority = (t) => (t >= 0.8 ? 'Critique' : t >= 0.6 ? 'Élevée' : t >= 0.4 ? 'Moyenne' : 'Faible');
      const minPriority = mapToMinPriority(p);
      const order = { 'Critique': 4, 'Élevée': 3, 'Moyenne': 2, 'Faible': 1 };
      recommendations.splice(0, recommendations.length,
        ...recommendations.filter(r => order[r.priority] >= order[minPriority])
      );
    }

    // Optionnel : limiter maxRecommendations si fourni
    const maxRecs = maxRecommendations ? parseInt(maxRecommendations, 10) : undefined;
    const cappedRecs = maxRecs ? recommendations.slice(0, maxRecs) : recommendations;

    const response = {
      employeeId: parseInt(employeeId, 10),
      jobId: parseInt(jobId, 10),
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
      recommendations: cappedRecs,
      totalRecommendations: cappedRecs.length,
      generatedAt: new Date().toISOString()
    };

    console.log(`✅ Generated ${cappedRecs.length} training recommendations (UI-ready)`);
    res.json(response);

  } catch (error) {
    console.error('❌ Error getting training recommendations:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération des recommandations de formation',
      details: error.message,
      employeeId: req.params.employeeId ? parseInt(req.params.employeeId, 10) : null,
      jobId: req.params.jobId ? parseInt(req.params.jobId, 10) : null
    });
  }
};

/**
 * Générer les recommandations de formation (brut)
 */
const generateTrainingRecommendations = async (employee, targetJob) => {
  console.log('🔍 Generating training recommendations...');
  console.log('Employee:', {
    id: employee.id,
    name: employee.name,
    skillsCount: employee.EmployeeSkills ? employee.EmployeeSkills.length : 0
  });
  console.log('Target Job:', {
    id: targetJob.id,
    title: targetJob.emploi,
    requiredSkillsCount: targetJob.requiredSkills ? targetJob.requiredSkills.length : 0
  });

  const recommendations = [];

  // Map compétences employé
  const employeeSkillsMap = {};
  const employeeSkills = employee.EmployeeSkills || employee.skills || [];
  console.log('📊 Employee skills found:', employeeSkills.length);

  employeeSkills.forEach(empSkill => {
    const skillId = empSkill.skill_id;
    employeeSkillsMap[skillId] = {
      currentLevel: empSkill.SkillLevel?.value || empSkill.current_level || 1,
      currentLevelName: empSkill.SkillLevel?.level_name || empSkill.level_name || 'Débutant',
      skillName: empSkill.Skill?.name || empSkill.skill_name || 'Compétence inconnue',
      skillType: empSkill.Skill?.type?.type_name || empSkill.skill_type || 'Non défini',
      certification: empSkill.certification
    };
    console.log(`  ✅ Skill ${skillId}: ${employeeSkillsMap[skillId].skillName} (Level: ${employeeSkillsMap[skillId].currentLevel})`);
  });

  // Compétences requises poste
  const requiredSkills = targetJob.requiredSkills || [];
  console.log('📋 Required skills found:', requiredSkills.length);

  if (requiredSkills.length === 0) {
    console.log('⚠️ No required skills found for this job');
    return recommendations;
  }

  for (const requiredSkill of requiredSkills) {
    const skillId = requiredSkill.skill_id;
    const requiredLevel = requiredSkill.SkillLevel?.value || requiredSkill.required_skill_level_id || requiredSkill.required_level || 3;
    const requiredLevelName = requiredSkill.SkillLevel?.level_name || requiredSkill.level_name || 'Autonome';
    const skillName = requiredSkill.Skill?.name || requiredSkill.skill_name || 'Compétence inconnue';
    const skillType = requiredSkill.Skill?.type?.type_name || requiredSkill.skill_type || 'Non défini';

    console.log(`🎯 Analyzing required skill: ${skillName} (ID: ${skillId})`);
    console.log(`   Required level: ${requiredLevel} (${requiredLevelName})`);

    const employeeSkill = employeeSkillsMap[skillId];
    const currentLevel = employeeSkill ? employeeSkill.currentLevel : 0;
    const currentLevelName = employeeSkill ? employeeSkill.currentLevelName : 'Aucun';

    console.log(`   Current level: ${currentLevel} (${currentLevelName})`);

    if (currentLevel < requiredLevel) {
      const gap = requiredLevel - currentLevel;
      console.log(`   📈 Gap found: ${gap} level(s)`);

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

      console.log(`   ✅ Recommendation created: ${trainingRecommendation.training}`);
    } else {
      console.log(`   ✅ No gap - employee already at required level or higher`);
    }
  }

  // Tri par priorité puis par gap
  recommendations.sort((a, b) => {
    if (a.priority !== b.priority) {
      const priorityOrder = { 'Critique': 4, 'Élevée': 3, 'Moyenne': 2, 'Faible': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.gap - a.gap;
  });

  console.log(`🎉 Generated ${recommendations.length} training recommendations`);
  return recommendations;
};

/**
 * Déterminer le type de formation recommandée selon l'écart
 */
const determineTrainingType = (skillName, skillType, gap, currentLevel, requiredLevel) => {
  let training, type, duration, priority, description, cost;

  // Priorité
  if (gap >= 3 || currentLevel === 0) {
    priority = 'Critique';
  } else if (gap >= 2) {
    priority = 'Élevée';
  } else if (gap >= 1) {
    priority = 'Moyenne';
  } else {
    priority = 'Faible';
  }

  const hasSkill = currentLevel > 0;
  const skillLevelText = hasSkill ? `du niveau ${currentLevel} au niveau ${requiredLevel}` : `au niveau ${requiredLevel}`;

  if (skillType === 'Technique' || skillType === 'Technical') {
    if (gap === 1) {
      training = `Formation ${skillName} - Perfectionnement`;
      type = 'Formation en ligne';
      duration = '20-40 heures';
      cost = 500;
      description = `Formation pour passer ${skillLevelText} en ${skillName}`;
    } else if (gap === 2) {
      training = `Formation ${skillName} - Niveau Avancé`;
      type = 'Formation présentielle';
      duration = '40-80 heures';
      cost = 1200;
      description = `Formation intensive pour maîtriser ${skillName} ${skillLevelText}`;
    } else {
      training = `Certification ${skillName} + Formation complète`;
      type = 'Certification professionnelle';
      duration = '80-120 heures';
      cost = 2000;
      description = `Programme complet avec certification pour atteindre l'expertise ${skillLevelText} en ${skillName}`;
    }
  } else if (skillType === 'Managériale' || skillType === 'Management') {
    if (gap === 1) {
      training = `Formation Leadership - ${skillName}`;
      type = 'Atelier pratique';
      duration = '16-24 heures';
      cost = 800;
      description = `Développement des compétences managériales ${skillLevelText} en ${skillName}`;
    } else {
      training = `Programme Management - ${skillName}`;
      type = 'Formation longue durée';
      duration = '40-60 heures';
      cost = 1500;
      description = `Programme complet de développement managérial ${skillLevelText}`;
    }
  } else if (skillType === 'Communication') {
    training = `Formation Communication - ${skillName}`;
    type = 'Atelier interactif';
    duration = '12-20 heures';
    cost = 600;
    description = `Amélioration des compétences de communication ${skillLevelText}`;
  } else {
    training = `Formation ${skillName}`;
    type = 'Formation mixte';
    duration = '20-40 heures';
    cost = 700;
    description = `Formation pour développer la compétence ${skillName} ${skillLevelText}`;
  }

  return { training, type, duration, priority, description, cost };
};

/* ===================== Job Recommendations ===================== */
/**
/**
 * Obtenir des recommandations de poste pour un employé (version robuste)
 * Route: GET /api/recommendations/employee/:employeeId/jobs
 */
const getEmployeeJobRecommendations = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { department, maxRecommendations, minCompatibilityScore } = req.query;

    console.log(`💼 [Jobs] employeeId=${employeeId} dept=${department || '(all)'} max=${maxRecommendations || 10} min=${minCompatibilityScore || 0.5}`);

    // 1) Charger l'employé + skills
    const employee = await Employee.findByPk(employeeId, {
      include: [
        {
          model: EmployeeSkill,
          as: 'EmployeeSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [{ model: SkillType, as: 'type' }]
            },
            { model: SkillLevel, as: 'SkillLevel' }
          ]
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé', employeeId: Number(employeeId) });
    }

    // 2) Charger les jobs (optionnellement filtrés par département)
    const whereClause = {};
    if (department && String(department).trim() !== '') {
      whereClause.filiere_activite = department;
    }

    const jobs = await JobDescription.findAll({
      where: whereClause,
      include: [
        {
          model: JobRequiredSkill,
          as: 'requiredSkills',
          include: [
            {
              model: Skill,
              as: 'Skill',
              include: [{ model: SkillType, as: 'type' }]
            },
            { model: SkillLevel, as: 'SkillLevel' }
          ]
        }
      ]
    });

    if (!jobs || jobs.length === 0) {
      return res.json({
        employee: { id: employee.id, name: employee.name, position: employee.position },
        recommendations: [],
        total: 0,
        message: 'Aucun poste disponible trouvé',
        generatedAt: new Date().toISOString()
      });
    }

    // 3) 🚑 SÉRIALISATION → objets "plats" attendus par le service
    const plainEmployee = {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department || null,
      skills: (employee.EmployeeSkills || []).map(es => ({
        skill_id: es.skill_id,
        skill_name: es.Skill?.name || null,
        skill_type: es.Skill?.type?.type_name || null,
        level_value: es.SkillLevel?.value ?? es.current_level ?? 0,
        level_name: es.SkillLevel?.level_name ?? es.level_name ?? 'Aucun'
      }))
    };

    const plainJobs = jobs.map(j => ({
      id: j.id,
      emploi: j.emploi,
      department: j.filiere_activite || null,
      family: j.famille || null,
      requiredSkills: (j.requiredSkills || []).map(rs => ({
        skill_id: rs.skill_id,
        skill_name: rs.Skill?.name || null,
        skill_type: rs.Skill?.type?.type_name || null,
        required_level_value: rs.SkillLevel?.value ?? rs.required_level ?? 1,
        required_level_name: rs.SkillLevel?.level_name ?? rs.level_name ?? 'Autonome'
      }))
    }));

    // 4) Options normalisées
    const options = {
      maxRecommendations: maxRecommendations ? parseInt(maxRecommendations, 10) : 10,
      minCompatibilityScore: minCompatibilityScore ? parseFloat(minCompatibilityScore) : 0.5
    };

    // 5) Appel service avec des données sûres
    let result;
    try {
      result = await recommendationService.getJobRecommendations(plainEmployee, plainJobs, options);
    } catch (svcErr) {
      console.error('❌ Service getJobRecommendations failed:', svcErr?.message || svcErr);
      // INFO: log rapide pour voir une structure type (ne log pas tout en prod)
      console.log('[Debug] plainEmployee.skills.length =', plainEmployee.skills.length);
      console.log('[Debug] plainJobs.count =', plainJobs.length, 'ex first job reqSkills=', plainJobs[0]?.requiredSkills?.length || 0);

      // On renvoie une 500 claire au front
      return res.status(500).json({
        error: 'Erreur interne du moteur de recommandation de postes',
        details: svcErr?.message || String(svcErr)
      });
    }

    // 6) Uniformiser la réponse (tableau ou objet)
    if (Array.isArray(result)) {
      return res.json({
        recommendations: result,
        total: result.length,
        generatedAt: new Date().toISOString()
      });
    }
    return res.json({
      ...result,
      total: typeof result?.total === 'number' ? result.total : (Array.isArray(result?.recommendations) ? result.recommendations.length : 0),
      generatedAt: result?.generatedAt || new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting job recommendations (controller):', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération des recommandations de poste',
      details: error.message
    });
  }
};


/* ===================== Utils / Admin ===================== */

const validateRecommendationData = async (req, res) => {
  try {
    const validationResult = await recommendationService.validateData(req.body);
    res.json(validationResult);
  } catch (error) {
    console.error('❌ Error validating recommendation data:', error);
    res.status(500).json({ error: 'Erreur lors de la validation des données', details: error.message });
  }
};

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
    res.status(500).json({ error: 'Erreur lors de la récupération du statut des modèles', details: error.message });
  }
};

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
    res.status(500).json({ error: 'Erreur lors du réentraînement des modèles', details: error.message });
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
