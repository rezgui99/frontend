const db = require("../../models/index");
const { 
  Employee, 
  JobDescription, 
  EmployeeSkill, 
  JobRequiredSkill,
  Skill, 
  SkillLevel,
  SkillType,
  JobOffer,
  sequelize 
} = db;

// Vue d'ensemble des analytics
const getAnalyticsOverview = async (req, res) => {
  try {
    const { date_from, date_to, department, contract_type } = req.query;
    
    // Construire les conditions de filtre
    const whereConditions = {};
    if (date_from) whereConditions.createdAt = { [sequelize.Sequelize.Op.gte]: new Date(date_from) };
    if (date_to) {
      whereConditions.createdAt = { 
        ...whereConditions.createdAt,
        [sequelize.Sequelize.Op.lte]: new Date(date_to) 
      };
    }

    // Statistiques de base
    const totalEmployees = await Employee.count();
    const totalJobDescriptions = await JobDescription.count();
    const totalJobOffers = await JobOffer.count({ where: whereConditions });
    
    // Calcul du taux de succès simulé (à adapter selon vos données réelles)
    const publishedOffers = await JobOffer.count({ 
      where: { ...whereConditions, status: 'published' } 
    });
    const overallSuccessRate = totalJobOffers > 0 ? (publishedOffers / totalJobOffers) * 100 : 0;

    // Top départements (basé sur les filières d'activité)
    const topDepartments = await JobDescription.findAll({
      attributes: [
        'filiere_activite',
        [sequelize.fn('COUNT', sequelize.col('id')), 'job_count']
      ],
      group: ['filiere_activite'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Compétences les plus demandées - requête simplifiée
    const topSkillsRaw = await sequelize.query(`
      SELECT 
        s.id as skill_id,
        s.name as skill_name,
        COUNT(jrs.skill_id) as demand_count
      FROM "Skills" s
      INNER JOIN "JobRequiredSkills" jrs ON s.id = jrs.skill_id
      GROUP BY s.id, s.name
      ORDER BY COUNT(jrs.skill_id) DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    const skillsInHighDemand = topSkillsRaw.map(skill => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      demand_count: parseInt(skill.demand_count),
      success_rate_with_skill: 75 + Math.random() * 20, // Simulé
      average_level_required: 2.5 + Math.random() * 2
    }));

    // Types de contrat (simulé car pas encore dans la DB)
    const contractTypeBreakdown = [
      { contract_type: 'CDI', total_applications: 200, successful_applications: 140, success_rate: 70.0 },
      { contract_type: 'CDD', total_applications: 100, successful_applications: 65, success_rate: 65.0 },
      { contract_type: 'Stage', total_applications: 80, successful_applications: 60, success_rate: 75.0 },
      { contract_type: 'Freelance', total_applications: 70, successful_applications: 45, success_rate: 64.3 }
    ];

    const overview = {
      total_employees: totalEmployees,
      total_job_descriptions: totalJobDescriptions,
      total_applications: totalJobOffers,
      overall_success_rate: overallSuccessRate,
      top_performing_departments: topDepartments.map(dept => ({
        department: dept.filiere_activite,
        total_applications: parseInt(dept.job_count) * 5, // Simulé
        successful_applications: parseInt(dept.job_count) * 3, // Simulé
        success_rate: 60 + Math.random() * 30,
        average_time_to_hire: 10 + Math.random() * 15,
        top_skills_requested: []
      })),
      skills_in_high_demand: skillsInHighDemand,
      contract_type_breakdown: contractTypeBreakdown,
      recent_trends: []
    };

    res.json(overview);
  } catch (error) {
    console.error('Error in getAnalyticsOverview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Recommandations de compétences pour un employé
const getEmployeeSkillRecommendations = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    
    // Récupérer l'employé avec ses compétences - requête simplifiée
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Récupérer les départements disponibles depuis les fiches de poste
    const departments = await sequelize.query(`
      SELECT DISTINCT filiere_activite as department
      FROM "JobDescriptions"
      WHERE filiere_activite IS NOT NULL
      ORDER BY filiere_activite
    `, { type: sequelize.QueryTypes.SELECT });

    // Récupérer les compétences de l'employé
    const employeeSkills = await sequelize.query(`
      SELECT 
        es.skill_id,
        s.name as skill_name,
        es.actual_skill_level_id,
        sl.value as current_level,
        st.type_name as skill_type
      FROM "EmployeeSkills" es
      INNER JOIN "Skills" s ON es.skill_id = s.id
      LEFT JOIN "SkillLevels" sl ON es.actual_skill_level_id = sl.id
      LEFT JOIN "SkillTypes" st ON s.skill_type_id = st.id
      WHERE es.employee_id = :employeeId
    `, {
      replacements: { employeeId },
      type: sequelize.QueryTypes.SELECT
    });

    // Récupérer toutes les compétences requises - requête simplifiée
    const allRequiredSkills = await sequelize.query(`
      SELECT 
        jrs.skill_id,
        s.name as skill_name,
        jrs.required_skill_level_id,
        sl.value as required_level,
        jd.id as job_id,
        jd.emploi as job_title,
        jd.filiere_activite as department,
        st.type_name as skill_type
      FROM "JobRequiredSkills" jrs
      INNER JOIN "Skills" s ON jrs.skill_id = s.id
      INNER JOIN "JobDescriptions" jd ON jrs.job_description_id = jd.id
      LEFT JOIN "SkillLevels" sl ON jrs.required_skill_level_id = sl.id
      LEFT JOIN "SkillTypes" st ON s.skill_type_id = st.id
    `, { type: sequelize.QueryTypes.SELECT });

    // Analyser les compétences de l'employé
    const employeeSkillsMap = new Map();
    employeeSkills.forEach(empSkill => {
      employeeSkillsMap.set(empSkill.skill_id, {
        current_level: empSkill.current_level || 0,
        skill_type: empSkill.skill_type || 'Non défini'
      });
    });

    // Générer les recommandations
    const skillRecommendations = [];
    const skillDemandMap = new Map();
    const careerOpportunities = [];

    // Analyser la demande pour chaque compétence
    allRequiredSkills.forEach(reqSkill => {
      const skillId = reqSkill.skill_id;
      const requiredLevel = reqSkill.required_level || 2;
      const currentLevel = employeeSkillsMap.get(skillId)?.current_level || 0;
      
      if (!skillDemandMap.has(skillId)) {
        skillDemandMap.set(skillId, {
          skill_name: reqSkill.skill_name,
          skill_type: reqSkill.skill_type || 'Non défini',
          demand_count: 0,
          total_required_level: 0,
          positions: [],
          current_level: currentLevel
        });
      }
      
      const skillData = skillDemandMap.get(skillId);
      skillData.demand_count++;
      skillData.total_required_level += requiredLevel;
      skillData.positions.push({
        job_id: reqSkill.job_id,
        job_title: reqSkill.job_title,
        department: reqSkill.department
      });
    });

    // Créer les recommandations
    for (const [skillId, skillData] of skillDemandMap) {
      const currentLevel = skillData.current_level;
      const averageRequiredLevel = skillData.total_required_level / skillData.demand_count;
      
      if (currentLevel < averageRequiredLevel) {
        const gap = averageRequiredLevel - currentLevel;
        const priorityScore = Math.min(100, (gap * 25) + (skillData.demand_count * 5));
        
        skillRecommendations.push({
          skill_id: skillId,
          skill_name: skillData.skill_name,
          skill_type: skillData.skill_type,
          current_level: currentLevel,
          recommended_level: Math.ceil(averageRequiredLevel),
          priority_score: Math.round(priorityScore),
          justification: `Compétence demandée dans ${skillData.demand_count} poste(s). Écart de ${gap.toFixed(1)} niveau(x).`,
          estimated_learning_time: gap <= 1 ? '1-2 mois' : gap <= 2 ? '3-6 mois' : '6-12 mois',
          available_positions_count: skillData.demand_count,
          potential_salary_increase: Math.round(gap * 2000) // Estimation
        });
      }
    }

    // Trier par score de priorité
    skillRecommendations.sort((a, b) => b.priority_score - a.priority_score);

    // Analyser les opportunités de carrière
    const jobOpportunities = new Map();
    allRequiredSkills.forEach(reqSkill => {
      const jobId = reqSkill.job_id;
      if (!jobOpportunities.has(jobId)) {
        jobOpportunities.set(jobId, {
          job_description_id: jobId,
          job_title: reqSkill.job_title,
          department: reqSkill.department,
          required_skills: [],
          total_score: 0,
          max_score: 0
        });
      }
      
      const job = jobOpportunities.get(jobId);
      const currentLevel = employeeSkillsMap.get(reqSkill.skill_id)?.current_level || 0;
      const requiredLevel = reqSkill.required_level || 0;
      
      job.required_skills.push({
        skill_name: reqSkill.skill_name,
        required_level: requiredLevel,
        current_level: currentLevel,
        gap: requiredLevel - currentLevel
      });
      
      job.max_score += requiredLevel;
      job.total_score += Math.min(currentLevel, requiredLevel);
    });

    // Créer les opportunités de carrière
    for (const [jobId, jobData] of jobOpportunities) {
      const compatibilityScore = jobData.max_score > 0 ? (jobData.total_score / jobData.max_score) * 100 : 0;
      
      if (compatibilityScore >= 40) { // Seuil minimum
        const missingSkills = jobData.required_skills.filter(skill => skill.gap > 0);
        
        careerOpportunities.push({
          job_description_id: jobData.job_description_id,
          job_title: jobData.job_title,
          department: jobData.department,
          compatibility_score: Math.round(compatibilityScore),
          missing_skills: missingSkills,
          estimated_timeline: missingSkills.length <= 2 ? '3-6 mois' : missingSkills.length <= 4 ? '6-12 mois' : '12+ mois',
          salary_range: {
            min: Math.round(30000 + (compatibilityScore * 300)),
            max: Math.round(45000 + (compatibilityScore * 500))
          }
        });
      }
    }

    // Trier par score de compatibilité
    careerOpportunities.sort((a, b) => b.compatibility_score - a.compatibility_score);

    const response = {
      employee_id: employeeId,
      employee_name: employee.name,
      current_position: employee.position,
      recommendations: skillRecommendations.slice(0, 10), // Top 10
      career_opportunities: careerOpportunities.slice(0, 5), // Top 5
      overall_development_score: Math.round(
        skillRecommendations.length > 0 ? 
          skillRecommendations.reduce((sum, rec) => sum + rec.priority_score, 0) / skillRecommendations.length : 
          80 // Score par défaut si pas de recommandations
      )
    };

    res.json(response);
  } catch (error) {
    console.error('Error in getEmployeeSkillRecommendations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Prédiction de succès pour une candidature
const predictApplicationSuccess = async (req, res) => {
  try {
    const { employee_id, job_description_id } = req.body;

    // Récupérer l'employé
    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Récupérer la fiche de poste
    const jobDescription = await JobDescription.findByPk(job_description_id);
    if (!jobDescription) {
      return res.status(404).json({ message: 'Fiche de poste non trouvée' });
    }

    // Récupérer les compétences de l'employé
    const employeeSkills = await sequelize.query(`
      SELECT 
        es.skill_id,
        sl.value as skill_level
      FROM "EmployeeSkills" es
      LEFT JOIN "SkillLevels" sl ON es.actual_skill_level_id = sl.id
      WHERE es.employee_id = :employeeId
    `, {
      replacements: { employeeId: employee_id },
      type: sequelize.QueryTypes.SELECT
    });

    // Récupérer les compétences requises pour le poste
    const requiredSkills = await sequelize.query(`
      SELECT 
        jrs.skill_id,
        s.name as skill_name,
        sl.value as required_level
      FROM "JobRequiredSkills" jrs
      INNER JOIN "Skills" s ON jrs.skill_id = s.id
      LEFT JOIN "SkillLevels" sl ON jrs.required_skill_level_id = sl.id
      WHERE jrs.job_description_id = :jobId
    `, {
      replacements: { jobId: job_description_id },
      type: sequelize.QueryTypes.SELECT
    });

    // Calculer le score de matching
    const employeeSkillsMap = new Map();
    employeeSkills.forEach(empSkill => {
      employeeSkillsMap.set(empSkill.skill_id, empSkill.skill_level || 0);
    });

    let totalScore = 0;
    let maxScore = 0;
    const keyFactors = [];

    if (requiredSkills.length > 0) {
      requiredSkills.forEach(reqSkill => {
        const requiredLevel = reqSkill.required_level || 0;
        const currentLevel = employeeSkillsMap.get(reqSkill.skill_id) || 0;
        
        maxScore += requiredLevel;
        const skillScore = Math.min(currentLevel, requiredLevel);
        totalScore += skillScore;
        
        const impact = requiredLevel > 0 ? ((skillScore / requiredLevel) - 0.5) * 100 : 0;
        keyFactors.push({
          factor_name: reqSkill.skill_name || 'Compétence inconnue',
          impact_score: Math.round(impact),
          description: `Niveau actuel: ${currentLevel}, Requis: ${requiredLevel}`,
          weight: 0.8 // Poids des compétences
        });
      });
    }

    // Facteurs additionnels
    const hireDate = new Date(employee.hire_date);
    const experienceYears = new Date().getFullYear() - hireDate.getFullYear();
    const experienceFactor = Math.min(100, experienceYears * 10);
    
    keyFactors.push({
      factor_name: 'Expérience',
      impact_score: experienceFactor - 50,
      description: `${experienceYears} années d'expérience`,
      weight: 0.2
    });

    // Calcul de la probabilité de succès
    const skillsScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 50;
    const finalScore = (skillsScore * 0.8) + (experienceFactor * 0.2);
    const successProbability = Math.min(95, Math.max(5, finalScore));

    // Niveau de confiance
    let confidenceLevel = 'medium';
    if (successProbability >= 80) confidenceLevel = 'high';
    else if (successProbability <= 40) confidenceLevel = 'low';

    // Recommandations
    const recommendations = [];
    if (successProbability < 70) {
      recommendations.push('Développer les compétences manquantes avant de postuler');
    }
    if (successProbability >= 70 && successProbability < 85) {
      recommendations.push('Bon candidat, préparer les entretiens sur les points forts');
    }
    if (successProbability >= 85) {
      recommendations.push('Candidat idéal, postuler immédiatement');
    }

    const prediction = {
      employee_id,
      job_description_id,
      success_probability: Math.round(successProbability),
      confidence_level: confidenceLevel,
      key_factors: keyFactors,
      recommendations,
      estimated_interview_score: Math.round(successProbability * 0.9)
    };

    res.json(prediction);
  } catch (error) {
    console.error('Error in predictApplicationSuccess:', error);
    res.status(500).json({ error: error.message });
  }
};

// Prédictions en lot
const predictMultipleApplications = async (req, res) => {
  try {
    const { predictions } = req.body;
    
    if (!Array.isArray(predictions)) {
      return res.status(400).json({ message: 'Format de données invalide' });
    }

    const results = [];
    
    for (const pred of predictions) {
      try {
        // Simuler l'appel à predictApplicationSuccess pour chaque prédiction
        const mockReq = { body: pred };
        const mockRes = {
          json: (data) => data,
          status: (code) => ({ json: (data) => ({ error: data, status: code }) })
        };
        
        // Calcul simplifié pour les prédictions en lot
        const employee = await Employee.findByPk(pred.employee_id);
        if (!employee) continue;

        const hireDate = new Date(employee.hire_date);
        const experienceYears = new Date().getFullYear() - hireDate.getFullYear();
        const baseScore = 50 + (experienceYears * 5) + Math.random() * 30;
        const successProbability = Math.min(95, Math.max(5, baseScore));

        let confidenceLevel = 'medium';
        if (successProbability >= 80) confidenceLevel = 'high';
        else if (successProbability <= 40) confidenceLevel = 'low';

        results.push({
          employee_id: pred.employee_id,
          job_description_id: pred.job_description_id,
          success_probability: Math.round(successProbability),
          confidence_level: confidenceLevel,
          key_factors: [
            {
              factor_name: 'Expérience',
              impact_score: experienceYears * 10 - 50,
              description: `${experienceYears} années d'expérience`,
              weight: 0.6
            },
            {
              factor_name: 'Compatibilité générale',
              impact_score: Math.round(Math.random() * 40 - 20),
              description: 'Basé sur le profil général',
              weight: 0.4
            }
          ],
          recommendations: successProbability >= 70 ? 
            ['Candidat recommandé pour ce poste'] : 
            ['Développer les compétences avant de postuler'],
          estimated_interview_score: Math.round(successProbability * 0.9)
        });
      } catch (error) {
        console.error('Error processing prediction:', error);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error in predictMultipleApplications:', error);
    res.status(500).json({ error: error.message });
  }
};

// Statistiques par département
const getDepartmentStatistics = async (req, res) => {
  try {
    // Statistiques basées sur les employés par département
    const departmentsRaw = await sequelize.query(`
      SELECT 
        department,
        COUNT(id) as employee_count
      FROM "Employees"
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY COUNT(id) DESC
    `, { type: sequelize.QueryTypes.SELECT });

    const departmentStats = departmentsRaw.map(dept => {
      const employeeCount = parseInt(dept.employee_count);
      return {
        department: dept.department,
        total_applications: employeeCount * (8 + Math.floor(Math.random() * 12)), // Simulation basée sur le nombre d'employés
        successful_applications: employeeCount * (5 + Math.floor(Math.random() * 8)),
        success_rate: Math.round((65 + Math.random() * 25) * 10) / 10,
        average_time_to_hire: Math.round((12 + Math.random() * 18) * 10) / 10,
        employee_count: employeeCount,
        top_skills_requested: []
      };
    });

    res.json(departmentStats);
  } catch (error) {
    console.error('Error in getDepartmentStatistics:', error);
    res.status(500).json({ error: error.message });
  }
};

// Statistiques par type de contrat
const getContractTypeStatistics = async (req, res) => {
  try {
    // Données simulées (à adapter selon votre modèle de données)
    const contractStats = [
      {
        contract_type: 'CDI',
        total_applications: 200,
        successful_applications: 140,
        success_rate: 70.0,
        average_salary_min: 35000,
        average_salary_max: 55000,
        most_requested_skills: ['JavaScript', 'Communication', 'Gestion de projet']
      },
      {
        contract_type: 'CDD',
        total_applications: 100,
        successful_applications: 65,
        success_rate: 65.0,
        average_salary_min: 30000,
        average_salary_max: 45000,
        most_requested_skills: ['Python', 'Adaptabilité', 'Travail en équipe']
      },
      {
        contract_type: 'Stage',
        total_applications: 80,
        successful_applications: 60,
        success_rate: 75.0,
        average_salary_min: 600,
        average_salary_max: 1200,
        most_requested_skills: ['Formation', 'Motivation', 'Apprentissage']
      },
      {
        contract_type: 'Freelance',
        total_applications: 70,
        successful_applications: 45,
        success_rate: 64.3,
        average_salary_min: 400,
        average_salary_max: 800,
        most_requested_skills: ['Expertise technique', 'Autonomie', 'Gestion du temps']
      }
    ];

    res.json(contractStats);
  } catch (error) {
    console.error('Error in getContractTypeStatistics:', error);
    res.status(500).json({ error: error.message });
  }
};

// Analyse de la demande de compétences - requête SQL optimisée
const getSkillsDemandAnalysis = async (req, res) => {
  try {
    // Requête SQL directe pour éviter les problèmes de GROUP BY
    const skillsDemandRaw = await sequelize.query(`
      SELECT 
        s.id as skill_id,
        s.name as skill_name,
        COUNT(jrs.skill_id) as demand_count
      FROM "Skills" s
      INNER JOIN "JobRequiredSkills" jrs ON s.id = jrs.skill_id
      GROUP BY s.id, s.name
      ORDER BY COUNT(jrs.skill_id) DESC
      LIMIT 20
    `, { type: sequelize.QueryTypes.SELECT });

    const skillsAnalysis = skillsDemandRaw.map(skill => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      demand_count: parseInt(skill.demand_count),
      success_rate_with_skill: 70 + Math.random() * 25, // Simulé
      average_level_required: 2.5 + Math.random() * 2 // Simulé
    }));

    res.json(skillsAnalysis);
  } catch (error) {
    console.error('Error in getSkillsDemandAnalysis:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAnalyticsOverview,
  getEmployeeSkillRecommendations,
  predictApplicationSuccess,
  predictMultipleApplications,
  getDepartmentStatistics,
  getContractTypeStatistics,
  getSkillsDemandAnalysis
};