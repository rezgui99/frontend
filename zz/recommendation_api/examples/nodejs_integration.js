/**
 * Exemple d'intégration de l'API de recommandation avec Node.js
 * 
 * Ce fichier montre comment intégrer l'API de recommandation ML
 * dans votre backend Node.js existant.
 */

const axios = require('axios');

class SmartHireRecommendationClient {
  constructor(apiUrl = 'http://localhost:8001') {
    this.apiUrl = apiUrl;
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Vérifier l'état de santé de l'API
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error.message);
      throw new Error('Recommendation API is not available');
    }
  }

  /**
   * Obtenir des recommandations de formation pour un employé
   */
  async getTrainingRecommendations(employee, targetJob, options = {}) {
    try {
      const requestData = {
        employee: this.convertEmployeeToMLFormat(employee),
        target_job: this.convertJobToMLFormat(targetJob),
        max_recommendations: options.maxRecommendations || 5,
        priority_threshold: options.priorityThreshold || 0.6
      };

      console.log('🎓 Requesting training recommendations for:', employee.name);
      console.log('🎯 Target job:', targetJob.emploi || targetJob.title);

      const response = await this.client.post('/api/v1/recommendations/training', requestData);
      
      console.log(`✅ Received ${response.data.length} training recommendations`);
      return response.data;

    } catch (error) {
      console.error('Error getting training recommendations:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtenir des recommandations de poste pour un employé
   */
  async getJobRecommendations(employee, availableJobs, options = {}) {
    try {
      const requestData = {
        employee: this.convertEmployeeToMLFormat(employee),
        available_jobs: availableJobs.map(job => this.convertJobToMLFormat(job)),
        max_recommendations: options.maxRecommendations || 10,
        min_compatibility_score: options.minCompatibilityScore || 0.5
      };

      console.log('💼 Requesting job recommendations for:', employee.name);
      console.log('📋 Available jobs:', availableJobs.length);

      const response = await this.client.post('/api/v1/recommendations/jobs', requestData);
      
      console.log(`✅ Received ${response.data.length} job recommendations`);
      return response.data;

    } catch (error) {
      console.error('Error getting job recommendations:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Convertir un employé du format Sequelize vers le format ML
   */
  convertEmployeeToMLFormat(employee) {
    // Gérer les différentes structures de données possibles
    const skills = employee.skills || employee.EmployeeSkills || [];
    
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department,
      hire_date: employee.hire_date,
      email: employee.email,
      phone: employee.phone,
      location: employee.location,
      years_total_experience: this.calculateExperienceYears(employee.hire_date),
      skills: skills.map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || 'Unknown',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type || 'Unknown',
        current_level: skill.SkillLevel?.value || skill.current_level || 1,
        level_name: skill.SkillLevel?.level_name || skill.level_name || 'Unknown',
        acquired_date: skill.acquired_date,
        certification: skill.certification,
        last_evaluated_date: skill.last_evaluated_date,
        years_experience: this.calculateSkillExperience(skill.acquired_date)
      }))
    };
  }

  /**
   * Convertir un poste du format Sequelize vers le format ML
   */
  convertJobToMLFormat(job) {
    // Gérer les différentes structures de données possibles
    const requiredSkills = job.requiredSkills || job.required_skills || [];
    
    return {
      id: job.id,
      title: job.emploi || job.title,
      department: job.filiere_activite || job.department,
      family: job.famille,
      experience_level: job.niveau_exp || job.experience_level,
      required_skills: requiredSkills.map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || 'Unknown',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type || 'Unknown',
        required_level: skill.SkillLevel?.value || skill.required_level || 3,
        level_name: skill.SkillLevel?.level_name || skill.level_name || 'Unknown',
        is_mandatory: skill.is_mandatory !== false,
        weight: skill.weight || 1.0
      }))
    };
  }

  /**
   * Calculer l'expérience en années depuis la date d'embauche
   */
  calculateExperienceYears(hireDate) {
    if (!hireDate) return 0;
    
    const hire = new Date(hireDate);
    const now = new Date();
    const diffTime = Math.abs(now - hire);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    
    return diffYears;
  }

  /**
   * Calculer l'expérience pour une compétence spécifique
   */
  calculateSkillExperience(acquiredDate) {
    if (!acquiredDate) return 0;
    
    const acquired = new Date(acquiredDate);
    const now = new Date();
    const diffTime = Math.abs(now - acquired);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    
    return diffYears;
  }

  /**
   * Valider les données avant envoi
   */
  async validateData(data) {
    try {
      const response = await this.client.post('/api/v1/data/validate', data);
      return response.data;
    } catch (error) {
      console.error('Data validation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Réentraîner les modèles
   */
  async retrainModels() {
    try {
      console.log('🔄 Requesting model retraining...');
      const response = await this.client.post('/api/v1/models/retrain');
      console.log('✅ Model retraining completed');
      return response.data;
    } catch (error) {
      console.error('Model retraining failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Exemple d'utilisation dans un contrôleur Express
class EmployeeRecommendationController {
  constructor() {
    this.recommendationClient = new SmartHireRecommendationClient();
  }

  /**
   * Endpoint pour obtenir des recommandations de formation
   */
  async getTrainingRecommendations(req, res) {
    try {
      const { employeeId, targetJobId } = req.params;
      
      // Récupérer l'employé depuis la base de données
      const employee = await db.Employee.findByPk(employeeId, {
        include: [{
          model: db.EmployeeSkill,
          as: 'EmployeeSkills',
          include: [
            { model: db.Skill, as: 'Skill', include: [{ model: db.SkillType, as: 'type' }] },
            { model: db.SkillLevel, as: 'SkillLevel' }
          ]
        }]
      });

      if (!employee) {
        return res.status(404).json({ error: 'Employé non trouvé' });
      }

      // Récupérer le poste cible
      const targetJob = await db.JobDescription.findByPk(targetJobId, {
        include: [{
          model: db.JobRequiredSkill,
          as: 'requiredSkills',
          include: [
            { model: db.Skill, include: [{ model: db.SkillType, as: 'type' }] },
            { model: db.SkillLevel }
          ]
        }]
      });

      if (!targetJob) {
        return res.status(404).json({ error: 'Poste cible non trouvé' });
      }

      // Obtenir les recommandations
      const recommendations = await this.recommendationClient.getTrainingRecommendations(
        employee, 
        targetJob,
        {
          maxRecommendations: parseInt(req.query.limit) || 5,
          priorityThreshold: parseFloat(req.query.threshold) || 0.6
        }
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
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in getTrainingRecommendations:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la génération des recommandations de formation',
        details: error.message 
      });
    }
  }

  /**
   * Endpoint pour obtenir des recommandations de poste
   */
  async getJobRecommendations(req, res) {
    try {
      const { employeeId } = req.params;
      const { department, minScore } = req.query;
      
      // Récupérer l'employé
      const employee = await db.Employee.findByPk(employeeId, {
        include: [{
          model: db.EmployeeSkill,
          as: 'EmployeeSkills',
          include: [
            { model: db.Skill, as: 'Skill', include: [{ model: db.SkillType, as: 'type' }] },
            { model: db.SkillLevel, as: 'SkillLevel' }
          ]
        }]
      });

      if (!employee) {
        return res.status(404).json({ error: 'Employé non trouvé' });
      }

      // Récupérer les postes disponibles
      const whereConditions = {};
      if (department) {
        whereConditions.filiere_activite = department;
      }

      const availableJobs = await db.JobDescription.findAll({
        where: whereConditions,
        include: [{
          model: db.JobRequiredSkill,
          as: 'requiredSkills',
          include: [
            { model: db.Skill, include: [{ model: db.SkillType, as: 'type' }] },
            { model: db.SkillLevel }
          ]
        }]
      });

      // Obtenir les recommandations
      const recommendations = await this.recommendationClient.getJobRecommendations(
        employee,
        availableJobs,
        {
          maxRecommendations: parseInt(req.query.limit) || 10,
          minCompatibilityScore: parseFloat(minScore) || 0.5
        }
      );

      res.json({
        employee: {
          id: employee.id,
          name: employee.name,
          position: employee.position
        },
        available_jobs_count: availableJobs.length,
        recommendations,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in getJobRecommendations:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la génération des recommandations de poste',
        details: error.message 
      });
    }
  }
}

// Export pour utilisation dans les routes
module.exports = {
  SmartHireRecommendationClient,
  EmployeeRecommendationController
};

// Exemple d'utilisation directe
async function example() {
  const client = new SmartHireRecommendationClient();
  
  // Vérifier la santé de l'API
  const health = await client.checkHealth();
  console.log('API Health:', health);
  
  // Exemple d'employé (format de votre base de données)
  const employee = {
    id: 1,
    name: "Jean Dupont",
    position: "Développeur Junior",
    department: "Développement",
    hire_date: "2022-01-15T00:00:00Z",
    email: "jean.dupont@example.com",
    EmployeeSkills: [
      {
        skill_id: 1,
        Skill: { name: "JavaScript", type: { type_name: "Technique" } },
        SkillLevel: { value: 2, level_name: "Junior" },
        acquired_date: "2022-02-01T00:00:00Z",
        certification: null
      }
    ]
  };

  // Exemple de poste cible
  const targetJob = {
    id: 5,
    emploi: "Développeur Senior",
    filiere_activite: "Développement",
    niveau_exp: "Senior",
    requiredSkills: [
      {
        skill_id: 1,
        Skill: { name: "JavaScript", type: { type_name: "Technique" } },
        SkillLevel: { value: 4, level_name: "Avancé" }
      }
    ]
  };

  try {
    // Obtenir des recommandations de formation
    const trainingRecs = await client.getTrainingRecommendations(employee, targetJob);
    console.log('Training Recommendations:', trainingRecs);

    // Obtenir des recommandations de poste
    const jobRecs = await client.getJobRecommendations(employee, [targetJob]);
    console.log('Job Recommendations:', jobRecs);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Décommenter pour tester
// example();