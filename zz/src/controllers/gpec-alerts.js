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

// === DASHBOARD GPEC ===
const getGPECDashboard = async (req, res) => {
  try {
    // Simuler des données de dashboard GPEC
    const dashboard = {
      overview: {
        total_alerts: 12,
        critical_alerts: 3,
        resolved_this_month: 8,
        average_resolution_time: 3.5
      },
      alerts_by_category: {
        skills: 5,
        retention: 3,
        performance: 2,
        compliance: 1,
        strategic: 1
      },
      alerts_by_severity: {
        critical: 3,
        high: 4,
        medium: 3,
        low: 2
      },
      trending_risks: [
        {
          type: 'critical_skills_shortage',
          trend: 'increasing',
          change_percentage: 25,
          affected_count: 3,
          description: 'Augmentation des pénuries de compétences techniques'
        },
        {
          type: 'departure_risk',
          trend: 'stable',
          change_percentage: 5,
          affected_count: 2,
          description: 'Risques de départ sous contrôle'
        }
      ],
      upcoming_deadlines: [
        {
          alert_id: 'GPEC-001',
          title: 'Recrutement IA urgent',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          days_remaining: 7,
          priority: 'urgent',
          assigned_to: 'Équipe RH'
        },
        {
          alert_id: 'GPEC-002',
          title: 'Formation cybersécurité',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          days_remaining: 14,
          priority: 'high',
          assigned_to: 'Formation'
        }
      ],
      success_stories: [
        {
          title: 'Formation DevOps réussie',
          description: 'Formation de 8 développeurs en DevOps, réduction du time-to-market de 30%',
          metrics_improved: ['Déploiements', 'Qualité', 'Vélocité'],
          time_to_resolution: 45,
          cost_saved: 25000,
          date_resolved: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Rétention talent clé',
          description: 'Négociation réussie avec Marie Martin, évitant une perte d\'expertise critique',
          metrics_improved: ['Rétention', 'Continuité projets'],
          time_to_resolution: 12,
          cost_saved: 45000,
          date_resolved: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
        }
      ]
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error in getGPECDashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

// === GESTION DES ALERTES ===
const getAllAlerts = async (req, res) => {
  try {
    const { severity, category, status, search } = req.query;
    
    // Simuler des alertes GPEC
    let alerts = [
      {
        id: 'GPEC-001',
        type: 'critical_skills_shortage',
        severity: 'critical',
        title: 'Pénurie critique: Intelligence Artificielle',
        description: 'Nous avons besoin de 5 experts IA mais nous n\'en avons que 2. Gap de 60%.',
        impact: '60% des besoins non couverts, retard sur 3 projets stratégiques',
        recommendations: [
          'Lancer un recrutement urgent d\'experts IA',
          'Former 3 développeurs seniors en machine learning',
          'Externaliser temporairement le développement de modèles',
          'Revoir la priorisation des projets IA'
        ],
        affectedEntities: [
          { type: 'skill', id: 1, name: 'Intelligence Artificielle', impact_level: 85 },
          { type: 'department', id: 1, name: 'R&D', impact_level: 70 }
        ],
        metrics: {
          current_value: 2,
          threshold_value: 5,
          target_value: 5,
          trend: 'decreasing',
          confidence_level: 85,
          time_to_critical: 30
        },
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'skills',
        priority: 'urgent',
        tags: ['ia', 'machine-learning', 'recrutement', 'formation']
      },
      {
        id: 'GPEC-002',
        type: 'departure_risk',
        severity: 'high',
        title: 'Risque de départ: Marie Martin',
        description: 'Marie Martin (Lead Developer) a 80% de risque de partir dans les 6 prochains mois selon notre analyse prédictive.',
        impact: 'Perte d\'expertise technique critique, retard sur 2 projets majeurs',
        recommendations: [
          'Organiser un entretien de rétention immédiat',
          'Proposer une révision salariale de 15-20%',
          'Élaborer un plan de carrière personnalisé',
          'Améliorer l\'équilibre vie pro/perso',
          'Identifier et former un successeur'
        ],
        affectedEntities: [
          { type: 'employee', id: 2, name: 'Marie Martin', impact_level: 80 }
        ],
        metrics: {
          current_value: 80,
          threshold_value: 70,
          trend: 'increasing',
          confidence_level: 75,
          time_to_critical: 180
        },
        status: 'active',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'retention',
        priority: 'high',
        tags: ['rétention', 'lead-developer', 'expertise-critique']
      },
      {
        id: 'GPEC-003',
        type: 'department_gap',
        severity: 'high',
        title: 'Gap départemental: IT',
        description: 'Le département IT a 45% de compétences manquantes en technologies cloud (AWS, Azure, Kubernetes).',
        impact: 'Retard sur la transformation digitale, dépendance externe coûteuse',
        recommendations: [
          'Lancer un programme de formation cloud intensif',
          'Recruter 2 experts cloud senior',
          'Établir un partenariat avec AWS/Azure pour la formation',
          'Certifier 5 développeurs en architecture cloud',
          'Créer un centre d\'excellence cloud interne'
        ],
        affectedEntities: [
          { type: 'department', id: 1, name: 'IT', impact_level: 75 },
          { type: 'skill', id: 15, name: 'AWS', impact_level: 60 },
          { type: 'skill', id: 16, name: 'Kubernetes', impact_level: 70 }
        ],
        metrics: {
          current_value: 45,
          threshold_value: 40,
          target_value: 20,
          trend: 'increasing',
          confidence_level: 90,
          time_to_critical: 90
        },
        status: 'acknowledged',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'skills',
        priority: 'high',
        tags: ['cloud', 'aws', 'azure', 'kubernetes', 'formation']
      },
      {
        id: 'GPEC-004',
        type: 'training_needed',
        severity: 'medium',
        title: 'Formation urgente: Cybersécurité',
        description: '12 employés ont besoin d\'une formation urgente en cybersécurité suite aux nouvelles réglementations RGPD.',
        impact: 'Risque de non-conformité, amendes potentielles, vulnérabilités sécuritaires',
        recommendations: [
          'Organiser une session de formation RGPD obligatoire',
          'Mettre en place des certifications en cybersécurité',
          'Auditer les procédures de sécurité actuelles',
          'Créer un guide de bonnes pratiques',
          'Nommer des référents sécurité par département'
        ],
        affectedEntities: [
          { type: 'skill', id: 20, name: 'Cybersécurité', impact_level: 65 }
        ],
        metrics: {
          current_value: 12,
          threshold_value: 10,
          target_value: 0,
          trend: 'stable',
          confidence_level: 95,
          time_to_critical: 60
        },
        status: 'in_progress',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'compliance',
        priority: 'medium',
        tags: ['cybersécurité', 'rgpd', 'formation', 'conformité']
      },
      {
        id: 'GPEC-005',
        type: 'succession_planning',
        severity: 'medium',
        title: 'Planification succession: Directeur IT',
        description: 'Le Directeur IT partira à la retraite dans 18 mois. Aucun successeur identifié.',
        impact: 'Risque de discontinuité managériale, perte de vision stratégique',
        recommendations: [
          'Identifier 2-3 candidats internes potentiels',
          'Mettre en place un programme de mentoring',
          'Organiser des formations en leadership',
          'Planifier une transition progressive',
          'Documenter les processus et décisions clés'
        ],
        affectedEntities: [
          { type: 'employee', id: 5, name: 'Jean Directeur', impact_level: 90 },
          { type: 'department', id: 1, name: 'IT', impact_level: 80 }
        ],
        metrics: {
          current_value: 0,
          threshold_value: 1,
          target_value: 2,
          trend: 'stable',
          confidence_level: 100,
          time_to_critical: 540
        },
        status: 'active',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(),
        category: 'strategic',
        priority: 'medium',
        tags: ['succession', 'leadership', 'retraite', 'transition']
      }
    ];

    // Appliquer les filtres
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    if (category) {
      alerts = alerts.filter(alert => alert.category === category);
    }
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      alerts = alerts.filter(alert => 
        alert.title.toLowerCase().includes(searchLower) ||
        alert.description.toLowerCase().includes(searchLower) ||
        alert.tags.some(tag => tag.includes(searchLower))
      );
    }

    res.json(alerts);
  } catch (error) {
    console.error('Error in getAllAlerts:', error);
    res.status(500).json({ error: error.message });
  }
};

// === PLANS D'ACTION ===
const getActionPlans = async (req, res) => {
  try {
    console.log('📋 Getting GPEC action plans...');
    console.log('👤 Request user:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
    const { alert_id, status } = req.query;
    
    // Utiliser les données réelles des employés et compétences pour générer des plans d'action
    const employees = await Employee.findAll({
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          { model: Skill, as: 'Skill' },
          { model: SkillLevel, as: 'SkillLevel' }
        ]
      }]
    });

    const jobDescriptions = await JobDescription.findAll({
      include: [{
        model: JobRequiredSkill,
        as: 'requiredSkills',
        include: [
          { model: Skill },
          { model: SkillLevel }
        ]
      }]
    });

    // Analyser les gaps réels pour créer des plans d'action pertinents
    let actionPlans = [];
    
    // Plan basé sur l'analyse des compétences manquantes
    const skillGaps = await analyzeRealSkillGaps(employees, jobDescriptions);
    if (skillGaps.length > 0) {
      actionPlans.push({
        id: 'AP-001',
        alert_id: 'GPEC-001',
        title: `Plan de formation: ${skillGaps[0].skill_name}`,
        description: `Formation de ${skillGaps[0].affected_employees} employés en ${skillGaps[0].skill_name}`,
        status: 'in_progress',
        priority: skillGaps[0].gap_percentage > 60 ? 'urgent' : 'high',
        assigned_to: 'Équipe Formation',
        due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        progress: 25,
        actions: [
          {
            id: 'A-001',
            title: 'Évaluation des besoins',
            status: 'completed',
            due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          },
          {
            id: 'A-002',
            title: 'Sélection organisme formation',
            status: 'in_progress',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        ],
        budget_estimate: skillGaps[0].affected_employees * 1200,
        success_metrics: [
          {
            name: 'Employés formés',
            target_value: skillGaps[0].affected_employees,
            current_value: Math.floor(skillGaps[0].affected_employees * 0.3),
            unit: 'personnes'
          }
        ],
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updated_at: new Date()
      });
    }

    // Plan basé sur les employés avec peu de compétences
    const employeesNeedingDevelopment = employees.filter(emp => 
      (emp.EmployeeSkills?.length || 0) < 3
    );

    if (employeesNeedingDevelopment.length > 0) {
      actionPlans.push({
        id: 'AP-002',
        alert_id: 'GPEC-002',
        title: 'Développement compétences employés',
        description: `${employeesNeedingDevelopment.length} employés ont besoin de développer leurs compétences`,
        status: 'approved',
        priority: 'medium',
        assigned_to: 'RH + Managers',
        due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        progress: 15,
        actions: [
          {
            id: 'A-003',
            title: 'Entretiens individuels',
            status: 'in_progress',
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        ],
        budget_estimate: employeesNeedingDevelopment.length * 800,
        success_metrics: [
          {
            name: 'Plans individuels créés',
            target_value: employeesNeedingDevelopment.length,
            current_value: Math.floor(employeesNeedingDevelopment.length * 0.2),
            unit: 'plans'
          }
        ],
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date()
      });
    }

    // Plan basé sur les départements
    const departmentAnalysis = await analyzeDepartmentGaps(employees);
    if (departmentAnalysis.length > 0) {
      const topDept = departmentAnalysis[0];
      actionPlans.push({
        id: 'AP-001',
        alert_id: 'GPEC-003',
        title: `Renforcement département ${topDept.department}`,
        description: `Plan de renforcement pour le département ${topDept.department} (${topDept.employee_count} employés)`,
        status: 'draft',
        priority: 'medium',
        assigned_to: `Manager ${topDept.department}`,
        due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        progress: 5,
        actions: [
          {
            id: 'A-004',
            title: 'Audit compétences département',
            status: 'pending',
            due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
          }
        ],
        budget_estimate: topDept.employee_count * 500,
        success_metrics: [
          {
            name: 'Compétences évaluées',
            target_value: topDept.employee_count,
            current_value: 0,
            unit: 'évaluations'
          }
        ],
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updated_at: new Date()
      });
    }

    // Appliquer les filtres
    if (alert_id) {
      actionPlans = actionPlans.filter(plan => plan.alert_id === alert_id);
    }
    
    if (status) {
      actionPlans = actionPlans.filter(plan => plan.status === status);
    }

    console.log('✅ Action plans found:', actionPlans.length);
    res.json(actionPlans);
  } catch (error) {
    console.error('❌ Error getting action plans:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fonctions utilitaires pour analyser les données réelles
async function analyzeRealSkillGaps(employees, jobDescriptions) {
  const skillDemand = new Map();
  const skillSupply = new Map();

  // Analyser la demande (compétences requises)
  jobDescriptions.forEach(job => {
    job.requiredSkills?.forEach(reqSkill => {
      const skillName = reqSkill.Skill?.name;
      if (skillName) {
        skillDemand.set(skillName, (skillDemand.get(skillName) || 0) + 1);
      }
    });
  });

  // Analyser l'offre (compétences des employés)
  employees.forEach(emp => {
    emp.EmployeeSkills?.forEach(empSkill => {
      const skillName = empSkill.Skill?.name;
      if (skillName) {
        skillSupply.set(skillName, (skillSupply.get(skillName) || 0) + 1);
      }
    });
  });

  // Calculer les gaps
  const gaps = [];
  skillDemand.forEach((demand, skillName) => {
    const supply = skillSupply.get(skillName) || 0;
    const gapPercentage = supply > 0 ? Math.max(0, ((demand - supply) / demand) * 100) : 100;
    
    if (gapPercentage > 20) {
      gaps.push({
        skill_name: skillName,
        required_demand: demand,
        current_supply: supply,
        gap_percentage: Math.round(gapPercentage),
        affected_employees: Math.max(1, demand - supply)
      });
    }
  });

  return gaps.sort((a, b) => b.gap_percentage - a.gap_percentage);
}

async function analyzeDepartmentGaps(employees) {
  const departmentStats = new Map();
  
  employees.forEach(emp => {
    const dept = emp.department || 'Non spécifié';
    if (!departmentStats.has(dept)) {
      departmentStats.set(dept, {
        department: dept,
        employee_count: 0,
        total_skills: 0
      });
    }
    
    const stats = departmentStats.get(dept);
    stats.employee_count++;
    stats.total_skills += emp.EmployeeSkills?.length || 0;
  });

  return Array.from(departmentStats.values())
    .map(dept => ({
      ...dept,
      avg_skills_per_employee: dept.employee_count > 0 ? dept.total_skills / dept.employee_count : 0
    }))
    .sort((a, b) => b.employee_count - a.employee_count);
}

const createActionPlan = async (req, res) => {
  try {
    console.log('📝 Creating action plan:', req.body);
    
    const {
      alert_id,
      title,
      description,
      priority = 'medium',
      assigned_to,
      due_date,
      actions = [],
      budget_estimate = 0
    } = req.body;

    if (!alert_id || !title || !description) {
      return res.status(400).json({
        error: 'Champs requis manquants',
        required: ['alert_id', 'title', 'description']
      });
    }

    const newActionPlan = {
      id: `AP-${Date.now()}`,
      alert_id,
      title,
      description,
      status: 'draft',
      priority,
      assigned_to,
      due_date: due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      progress: 0,
      actions,
      budget_estimate,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('✅ Action plan created:', newActionPlan.id);
    res.status(201).json({
      message: 'Plan d\'action créé avec succès',
      actionPlan: newActionPlan
    });

  } catch (error) {
    console.error('❌ Error creating action plan:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateActionPlan = async (req, res) => {
  try {
    console.log('📝 Updating action plan:', req.params.id, req.body);
    
    const updatedPlan = {
      id: req.params.id,
      ...req.body,
      updated_at: new Date()
    };

    console.log('✅ Action plan updated');
    res.json({
      message: 'Plan d\'action mis à jour avec succès',
      actionPlan: updatedPlan
    });

  } catch (error) {
    console.error('❌ Error updating action plan:', error);
    res.status(500).json({ error: error.message });
  }
};

// === ANALYSES PRÉDICTIVES ===
const analyzeDepartureRisks = async (req, res) => {
  try {
    // Récupérer les employés avec leurs données
    const employees = await Employee.findAll({
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          { model: Skill, as: 'Skill' },
          { model: SkillLevel, as: 'SkillLevel' }
        ]
      }]
    });

    // Simuler l'analyse prédictive des risques de départ
    const departureRisks = employees.map(employee => {
      const tenure = calculateTenure(employee.hire_date);
      const skillsCount = employee.EmployeeSkills?.length || 0;
      
      // Algorithme simplifié de calcul du risque
      let riskScore = 0;
      
      // Facteurs de risque
      const riskFactors = [];
      
      // Ancienneté (courbe en U)
      if (tenure < 1) {
        riskScore += 30; // Nouveaux employés
        riskFactors.push({
          factor: 'Ancienneté faible',
          weight: 30,
          description: 'Moins d\'un an d\'ancienneté',
          current_value: tenure,
          threshold_value: 1
        });
      } else if (tenure > 5) {
        riskScore += 20; // Employés expérimentés cherchant de nouveaux défis
        riskFactors.push({
          factor: 'Ancienneté élevée',
          weight: 20,
          description: 'Plus de 5 ans, recherche de nouveaux défis',
          current_value: tenure,
          threshold_value: 5
        });
      }

      // Compétences rares (plus de valeur sur le marché)
      if (skillsCount > 8) {
        riskScore += 25;
        riskFactors.push({
          factor: 'Profil très qualifié',
          weight: 25,
          description: 'Nombreuses compétences, forte demande marché',
          current_value: skillsCount,
          threshold_value: 8
        });
      }

      // Poste clé
      if (employee.position.toLowerCase().includes('lead') || 
          employee.position.toLowerCase().includes('senior') ||
          employee.position.toLowerCase().includes('manager')) {
        riskScore += 15;
        riskFactors.push({
          factor: 'Poste à responsabilités',
          weight: 15,
          description: 'Position de leadership, opportunités externes',
          current_value: 1,
          threshold_value: 0
        });
      }

      // Ajouter de la variabilité
      riskScore += Math.random() * 20;
      riskScore = Math.min(95, Math.max(5, riskScore));

      // Calculer la date de départ prédite
      const daysToLeave = Math.floor((100 - riskScore) * 3); // Plus le risque est élevé, plus c'est proche
      const predictedDate = new Date(Date.now() + daysToLeave * 24 * 60 * 60 * 1000);

      return {
        employee_id: employee.id,
        employee_name: employee.name,
        department: employee.department || 'Non spécifié',
        position: employee.position,
        risk_score: Math.round(riskScore),
        risk_factors: riskFactors,
        predicted_departure_date: predictedDate,
        confidence_level: Math.floor(60 + Math.random() * 30), // 60-90%
        mitigation_strategies: generateMitigationStrategies(riskScore, employee.position)
      };
    }).filter(risk => risk.risk_score > 50) // Seulement les risques significatifs
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 10); // Top 10

    res.json(departureRisks);
  } catch (error) {
    console.error('Error in analyzeDepartureRisks:', error);
    res.status(500).json({ error: error.message });
  }
};

const analyzeSkillGaps = async (req, res) => {
  try {
    // Analyser les gaps de compétences
    const skillGapsData = await sequelize.query(`
      SELECT 
        s.id as skill_id,
        s.name as skill_name,
        st.type_name as skill_type,
        COUNT(DISTINCT jrs.job_description_id) as required_demand,
        COUNT(DISTINCT es.employee_id) as current_supply,
        AVG(sl_req.value) as avg_required_level,
        AVG(sl_emp.value) as avg_current_level
      FROM "Skills" s
      LEFT JOIN "SkillTypes" st ON s.skill_type_id = st.id
      LEFT JOIN "JobRequiredSkills" jrs ON s.id = jrs.skill_id
      LEFT JOIN "SkillLevels" sl_req ON jrs.required_skill_level_id = sl_req.id
      LEFT JOIN "EmployeeSkills" es ON s.id = es.skill_id
      LEFT JOIN "SkillLevels" sl_emp ON es.actual_skill_level_id = sl_emp.id
      GROUP BY s.id, s.name, st.type_name
      HAVING COUNT(DISTINCT jrs.job_description_id) > 0
      ORDER BY COUNT(DISTINCT jrs.job_description_id) DESC
    `, { type: sequelize.QueryTypes.SELECT });

    const skillGaps = skillGapsData.map(skill => {
      const demand = parseInt(skill.required_demand);
      const supply = parseInt(skill.current_supply || 0);
      const gapPercentage = supply > 0 ? Math.max(0, ((demand - supply) / demand) * 100) : 100;
      
      return {
        skill_id: skill.skill_id,
        skill_name: skill.skill_name,
        skill_type: skill.skill_type,
        current_supply: supply,
        required_demand: demand,
        gap_percentage: Math.round(gapPercentage),
        criticality_score: calculateCriticalityScore(demand, supply, skill.avg_required_level),
        affected_positions: generateAffectedPositions(skill.skill_name),
        training_options: generateTrainingOptions(skill.skill_name),
        recruitment_timeline: calculateRecruitmentTimeline(skill.skill_name, gapPercentage)
      };
    }).filter(gap => gap.gap_percentage > 20) // Seulement les gaps significatifs
      .sort((a, b) => b.criticality_score - a.criticality_score);

    res.json(skillGaps);
  } catch (error) {
    console.error('Error in analyzeSkillGaps:', error);
    res.status(500).json({ error: error.message });
  }
};

const predictTrainingNeeds = async (req, res) => {
  try {
    const { department_id } = req.query;
    
    // Analyser les besoins de formation
    let whereCondition = {};
    if (department_id) {
      whereCondition.department = department_id;
    }

    const employees = await Employee.findAll({
      where: whereCondition,
      include: [{
        model: EmployeeSkill,
        as: 'EmployeeSkills',
        include: [
          { model: Skill, as: 'Skill' },
          { model: SkillLevel, as: 'SkillLevel' }
        ]
      }]
    });

    const trainingNeeds = [];
    
    // Analyser les compétences obsolètes ou insuffisantes
    const skillsAnalysis = new Map();
    
    employees.forEach(employee => {
      employee.EmployeeSkills?.forEach(empSkill => {
        const skillName = empSkill.Skill?.name;
        const currentLevel = empSkill.SkillLevel?.value || 0;
        const lastEvaluated = empSkill.last_evaluated_date;
        
        if (!skillsAnalysis.has(skillName)) {
          skillsAnalysis.set(skillName, {
            employees: [],
            avgLevel: 0,
            needsUpdate: false
          });
        }
        
        const skillData = skillsAnalysis.get(skillName);
        skillData.employees.push({
          id: employee.id,
          name: employee.name,
          currentLevel,
          lastEvaluated
        });
        
        // Vérifier si la compétence nécessite une mise à jour
        if (!lastEvaluated || isOlderThan(lastEvaluated, 12)) { // 12 mois
          skillData.needsUpdate = true;
        }
      });
    });

    // Générer les recommandations de formation
    skillsAnalysis.forEach((data, skillName) => {
      if (data.needsUpdate || data.employees.length > 5) {
        trainingNeeds.push({
          skill_name: skillName,
          affected_employees: data.employees.length,
          urgency_level: data.needsUpdate ? 'high' : 'medium',
          training_type: getTrainingType(skillName),
          estimated_duration: getEstimatedDuration(skillName),
          estimated_cost: getEstimatedCost(skillName, data.employees.length),
          recommended_provider: getRecommendedProvider(skillName)
        });
      }
    });

    res.json(trainingNeeds.sort((a, b) => b.affected_employees - a.affected_employees));
  } catch (error) {
    console.error('Error in predictTrainingNeeds:', error);
    res.status(500).json({ error: error.message });
  }
};

// === ACTIONS SUR LES ALERTES ===
const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { comment, acknowledged_by } = req.body;
    
    // Simuler la mise à jour de l'alerte
    const updatedAlert = {
      id: alertId,
      status: 'acknowledged',
      acknowledged_at: new Date(),
      acknowledged_by,
      comment,
      updatedAt: new Date()
    };

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error in acknowledgeAlert:', error);
    res.status(500).json({ error: error.message });
  }
};

const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution, actions_taken, resolved_by } = req.body;
    
    const updatedAlert = {
      id: alertId,
      status: 'resolved',
      resolution,
      actions_taken,
      resolved_at: new Date(),
      resolved_by,
      updatedAt: new Date()
    };

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error in resolveAlert:', error);
    res.status(500).json({ error: error.message });
  }
};

const dismissAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason, dismissed_by } = req.body;
    
    const updatedAlert = {
      id: alertId,
      status: 'dismissed',
      dismissal_reason: reason,
      dismissed_at: new Date(),
      dismissed_by,
      updatedAt: new Date()
    };

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error in dismissAlert:', error);
    res.status(500).json({ error: error.message });
  }
};

// === ANALYSE AUTOMATIQUE ===
const runAutomaticAnalysis = async (req, res) => {
  try {
    console.log('🔍 Démarrage de l\'analyse GPEC automatique...');
    
    // Simuler une analyse complète
    const analysisResults = {
      timestamp: new Date(),
      triggered_by: req.body.triggered_by,
      analysis_duration: '45 secondes',
      alerts_generated: 3,
      alerts_updated: 2,
      risks_identified: 5,
      recommendations_created: 12,
      summary: {
        critical_findings: [
          'Pénurie critique détectée en compétences IA',
          'Risque de départ élevé pour 2 employés clés',
          'Gap de 45% en compétences cloud dans le département IT'
        ],
        immediate_actions: [
          'Lancer recrutement urgent expert IA',
          'Organiser entretiens de rétention',
          'Planifier formation cloud intensive'
        ],
        strategic_recommendations: [
          'Développer un programme de rétention des talents',
          'Créer un centre d\'excellence technologique',
          'Mettre en place une veille compétences'
        ]
      }
    };

    // Simuler un délai d'analyse
    setTimeout(() => {
      res.json({
        success: true,
        message: 'Analyse GPEC terminée avec succès',
        results: analysisResults
      });
    }, 2000);

  } catch (error) {
    console.error('Error in runAutomaticAnalysis:', error);
    res.status(500).json({ error: error.message });
  }
};

// === CONFIGURATION ===
const getConfiguration = async (req, res) => {
  try {
    const config = {
      thresholds: {
        skills: {
          critical_shortage_ratio: 0.3,
          obsolescence_months: 24,
          demand_supply_ratio: 3.0
        },
        retention: {
          departure_risk_threshold: 0.7,
          tenure_risk_months: 6,
          performance_decline_threshold: 0.2
        },
        departments: {
          skill_gap_threshold: 0.4,
          understaffing_ratio: 0.8,
          training_backlog_threshold: 10
        }
      },
      alert_frequency: {
        critical: 1, // minutes
        high: 5,
        medium: 30,
        low: 60
      },
      notification_settings: {
        email_enabled: true,
        sms_enabled: false,
        in_app_enabled: true,
        recipients_by_severity: {
          critical: [1, 2], // user_ids
          high: [1, 2, 3],
          medium: [1, 2, 3, 4],
          low: [1, 2, 3, 4, 5]
        }
      },
      auto_actions: {
        enabled: true,
        actions: [
          {
            trigger_condition: 'critical_skills_shortage',
            action_type: 'create_recruitment_request',
            parameters: { urgency: 'high' },
            enabled: true
          },
          {
            trigger_condition: 'departure_risk > 80',
            action_type: 'notify_manager',
            parameters: { escalate_after_hours: 24 },
            enabled: true
          }
        ]
      }
    };

    res.json(config);
  } catch (error) {
    console.error('Error in getConfiguration:', error);
    res.status(500).json({ error: error.message });
  }
};

// === RAPPORTS ===
const generateGPECReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    // Simuler la génération d'un rapport PDF
    const reportData = {
      period: { start_date, end_date },
      summary: {
        total_alerts_generated: 25,
        alerts_resolved: 18,
        average_resolution_time: 3.2,
        cost_savings_estimated: 125000,
        risks_prevented: 8
      },
      detailed_analysis: {
        by_category: [
          {
            category: 'skills',
            total_alerts: 12,
            resolution_rate: 75,
            average_severity: 2.8,
            top_issues: ['Pénurie IA', 'Gap Cloud', 'Obsolescence Java'],
            improvement_suggestions: ['Programme formation continue', 'Veille technologique']
          }
        ]
      }
    };

    // En production, générer un vrai PDF
    const pdfBuffer = Buffer.from(`Rapport GPEC - ${start_date} à ${end_date}\n\nRapport généré automatiquement.`);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-gpec-${new Date().toISOString().split('T')[0]}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in generateGPECReport:', error);
    res.status(500).json({ error: error.message });
  }
};

// === FONCTIONS UTILITAIRES ===
function calculateTenure(hireDate) {
  const now = new Date();
  const hire = new Date(hireDate);
  return (now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25); // années
}

function isOlderThan(date, months) {
  const now = new Date();
  const checkDate = new Date(date);
  const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return checkDate < monthsAgo;
}

function generateMitigationStrategies(riskScore, position) {
  const strategies = [];
  
  if (riskScore > 80) {
    strategies.push('Entretien de rétention immédiat avec la direction');
    strategies.push('Révision salariale exceptionnelle');
    strategies.push('Proposition de promotion ou évolution de poste');
  }
  
  if (riskScore > 60) {
    strategies.push('Plan de développement personnel');
    strategies.push('Formation aux nouvelles technologies');
    strategies.push('Amélioration de l\'équilibre vie pro/perso');
  }
  
  if (position.toLowerCase().includes('lead') || position.toLowerCase().includes('senior')) {
    strategies.push('Responsabilités managériales supplémentaires');
    strategies.push('Participation aux décisions stratégiques');
    strategies.push('Programme de mentoring');
  }
  
  strategies.push('Feedback régulier et reconnaissance');
  strategies.push('Opportunités de formation externe');
  
  return strategies;
}

function calculateCriticalityScore(demand, supply, avgRequiredLevel) {
  const demandScore = Math.min(demand * 10, 40);
  const scarcityScore = supply > 0 ? Math.min((demand / supply) * 20, 40) : 40;
  const levelScore = (avgRequiredLevel || 0) * 4;
  return Math.min(100, demandScore + scarcityScore + levelScore);
}

function generateAffectedPositions(skillName) {
  const positionMap = {
    'JavaScript': ['Développeur Frontend', 'Développeur Full Stack'],
    'Python': ['Data Scientist', 'Développeur Backend', 'DevOps'],
    'AWS': ['Architecte Cloud', 'DevOps Engineer', 'Administrateur Système'],
    'React': ['Développeur Frontend', 'Développeur Full Stack'],
    'Leadership': ['Manager', 'Chef de Projet', 'Directeur']
  };
  
  return positionMap[skillName] || ['Postes techniques'];
}

function generateTrainingOptions(skillName) {
  return [
    {
      type: 'external',
      name: `Formation ${skillName} - Niveau Avancé`,
      duration: 40,
      cost: 2500,
      effectiveness_score: 85,
      provider: 'Centre de Formation Professionnel'
    },
    {
      type: 'certification',
      name: `Certification ${skillName}`,
      duration: 80,
      cost: 1500,
      effectiveness_score: 90,
      provider: 'Organisme Certificateur'
    },
    {
      type: 'internal',
      name: `Mentoring ${skillName}`,
      duration: 60,
      cost: 500,
      effectiveness_score: 70,
      provider: 'Expert interne'
    }
  ];
}

function calculateRecruitmentTimeline(skillName, gapPercentage) {
  const baseTimeline = 60; // 60 jours de base
  const urgencyMultiplier = gapPercentage > 60 ? 0.5 : gapPercentage > 40 ? 0.7 : 1;
  const skillComplexity = getSkillComplexity(skillName);
  
  return Math.round(baseTimeline * urgencyMultiplier * skillComplexity);
}

function getSkillComplexity(skillName) {
  const complexSkills = ['Intelligence Artificielle', 'Machine Learning', 'Blockchain', 'Quantum Computing'];
  const moderateSkills = ['AWS', 'Kubernetes', 'React', 'Angular'];
  
  if (complexSkills.some(skill => skillName.includes(skill))) return 1.5;
  if (moderateSkills.some(skill => skillName.includes(skill))) return 1.2;
  return 1.0;
}

function getTrainingType(skillName) {
  const technicalSkills = ['JavaScript', 'Python', 'AWS', 'React'];
  const softSkills = ['Leadership', 'Communication', 'Management'];
  
  if (technicalSkills.some(skill => skillName.includes(skill))) return 'technique';
  if (softSkills.some(skill => skillName.includes(skill))) return 'comportementale';
  return 'mixte';
}

function getEstimatedDuration(skillName) {
  const durationMap = {
    'Cybersécurité': 24,
    'Intelligence Artificielle': 40,
    'AWS': 32,
    'Leadership': 16
  };
  return durationMap[skillName] || 20;
}

function getEstimatedCost(skillName, employeeCount) {
  const costPerEmployee = {
    'Cybersécurité': 800,
    'Intelligence Artificielle': 1500,
    'AWS': 1200,
    'Leadership': 600
  };
  const unitCost = costPerEmployee[skillName] || 800;
  return unitCost * employeeCount;
}

function getRecommendedProvider(skillName) {
  const providers = {
    'Cybersécurité': 'ANSSI Formation',
    'Intelligence Artificielle': 'École IA',
    'AWS': 'AWS Training',
    'Leadership': 'Institut Management'
  };
  return providers[skillName] || 'Organisme spécialisé';
}

module.exports = {
  getGPECDashboard,
  getAllAlerts,
  getActionPlans,
  createActionPlan,
  updateActionPlan,
  analyzeDepartureRisks,
  analyzeSkillGaps,
  predictTrainingNeeds,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  runAutomaticAnalysis,
  getConfiguration,
  generateGPECReport
};