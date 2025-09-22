const axios = require('axios');

class RecommendationService {
  constructor() {
    // Utiliser l'URL depuis les variables d'environnement
    this.apiUrl = process.env.ML_API_URL || 'http://localhost:8001';
    this.timeout = 30000; // 30 secondes timeout
    
    // Configuration axios avec retry
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Intercepteur pour les erreurs avec retry
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.error(`❌ Cannot connect to ML API at ${this.apiUrl}`);
          throw new Error(`Service de recommandation indisponible. Vérifiez que l'API ML est démarrée sur ${this.apiUrl}`);
        }
        throw error;
      }
    );
  }

  /**
   * Vérifier la santé de l'API de recommandation
   */
  async checkHealth() {
    try {
      console.log(`🏥 Checking ML API health at ${this.apiUrl}/health`);
      const response = await this.client.get('/health');
      
      return {
        status: 'healthy',
        api_url: this.apiUrl,
        response_time: response.headers['x-response-time'] || 'N/A',
        models: response.data.models || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ ML API health check failed:', error.message);
      return {
        status: 'unhealthy',
        api_url: this.apiUrl,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtenir des recommandations de formation pour un employé
   */
  async getTrainingRecommendations(employee, targetJob, options = {}) {
    try {
      console.log(`🎓 Getting training recommendations for employee ${employee.id} -> job ${targetJob.id}`);
      
      const requestData = {
        employee: this.convertEmployeeFormat(employee),
        target_job: this.convertJobFormat(targetJob),
        max_recommendations: options.maxRecommendations || 5,
        priority_threshold: options.priorityThreshold || 0.6
      };

      console.log('📤 Sending request to ML API:', JSON.stringify(requestData, null, 2));
      
      const response = await this.client.post('/api/v1/recommendations/training', requestData);
      
      console.log(`✅ Training recommendations received: ${response.data.length} recommendations`);
      return {
        employee: {
          id: employee.id,
          name: employee.name,
          position: employee.position
        },
        target_job: {
          id: targetJob.id,
          title: targetJob.emploi || targetJob.title,
          department: targetJob.filiere_activite || targetJob.department
        },
        recommendations: response.data,
        total: response.data.length
      };
      
    } catch (error) {
      console.error('❌ Error getting training recommendations:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Erreur lors de la génération des recommandations de formation: ${error.message}`);
    }
  }

  /**
   * Obtenir des recommandations de poste pour un employé
   */
  async getJobRecommendations(employee, availableJobs, options = {}) {
    try {
      console.log(`💼 Getting job recommendations for employee ${employee.id}`);
      
      const requestData = {
        employee: this.convertEmployeeFormat(employee),
        available_jobs: availableJobs.map(job => this.convertJobFormat(job)),
        max_recommendations: options.maxRecommendations || 10,
        min_compatibility_score: options.minCompatibilityScore || 0.5
      };

      console.log('📤 Sending request to ML API for job recommendations');
      
      const response = await this.client.post('/api/v1/recommendations/jobs', requestData);
      
      console.log(`✅ Job recommendations received: ${response.data.length} recommendations`);
      return {
        employee: {
          id: employee.id,
          name: employee.name,
          position: employee.position
        },
        recommendations: response.data,
        total: response.data.length
      };
      
    } catch (error) {
      console.error('❌ Error getting job recommendations:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Erreur lors de la génération des recommandations de poste: ${error.message}`);
    }
  }

  /**
   * Convertir un employé du format Node.js vers le format API ML
   */
  convertEmployeeFormat(employee) {
    const skills = employee.skills || employee.EmployeeSkills || [];
    
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department || '',
      hire_date: employee.hire_date,
      email: employee.email,
      phone: employee.phone || '',
      location: employee.location || '',
      skills: skills.map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || '',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type || '',
        current_level: skill.SkillLevel?.value || skill.current_level || 1,
        level_name: skill.SkillLevel?.level_name || skill.level_name || '',
        acquired_date: skill.acquired_date,
        certification: skill.certification,
        last_evaluated_date: skill.last_evaluated_date,
        years_experience: skill.years_experience || 0
      }))
    };
  }

  /**
   * Convertir un poste du format Node.js vers le format API ML
   */
  convertJobFormat(job) {
    const requiredSkills = job.requiredSkills || job.required_skills || [];
    
    return {
      id: job.id,
      title: job.emploi || job.title,
      department: job.filiere_activite || job.department,
      family: job.famille,
      experience_level: job.niveau_exp,
      required_skills: requiredSkills.map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || '',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type || '',
        required_level: skill.SkillLevel?.value || skill.required_level || 3,
        level_name: skill.SkillLevel?.level_name || skill.level_name || '',
        is_mandatory: skill.is_mandatory !== false,
        weight: skill.weight || 1.0
      }))
    };
  }

  /**
   * Valider les données avant envoi à l'API ML
   */
  async validateData(data) {
    try {
      const response = await this.client.post('/api/v1/data/validate', data);
      return response.data;
    } catch (error) {
      console.error('❌ Error validating data:', error.message);
      throw new Error(`Erreur lors de la validation des données: ${error.message}`);
    }
  }

  /**
   * Obtenir le statut des modèles ML
   */
  async getModelStatus() {
    try {
      const response = await this.client.get('/api/v1/models/status');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting model status:', error.message);
      throw new Error(`Erreur lors de la récupération du statut des modèles: ${error.message}`);
    }
  }

  /**
   * Réentraîner les modèles ML
   */
  async retrainModels() {
    try {
      console.log('🔄 Requesting model retraining...');
      const response = await this.client.post('/api/v1/models/retrain');
      console.log('✅ Model retraining completed');
      return response.data;
    } catch (error) {
      console.error('❌ Error retraining models:', error.message);
      throw new Error(`Erreur lors du réentraînement des modèles: ${error.message}`);
    }
  }
}

module.exports = new RecommendationService();