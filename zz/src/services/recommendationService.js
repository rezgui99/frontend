const axios = require('axios');

class RecommendationService {
  constructor() {
    this.apiUrl = process.env.RECOMMENDATION_API_URL || 'http://localhost:8001/api/v1';
  }

  /**
   * Obtenir des recommandations de formation pour un employé
   */
  async getTrainingRecommendations(employee, targetJob, options = {}) {
    try {
      const response = await axios.post(`${this.apiUrl}/recommendations/training`, {
        employee: this.convertEmployeeFormat(employee),
        target_job: this.convertJobFormat(targetJob),
        max_recommendations: options.maxRecommendations || 5,
        priority_threshold: options.priorityThreshold || 0.6
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting training recommendations:', error);
      throw error;
    }
  }

  /**
   * Obtenir des recommandations de poste pour un employé
   */
  async getJobRecommendations(employee, availableJobs, options = {}) {
    try {
      const response = await axios.post(`${this.apiUrl}/recommendations/jobs`, {
        employee: this.convertEmployeeFormat(employee),
        available_jobs: availableJobs.map(job => this.convertJobFormat(job)),
        max_recommendations: options.maxRecommendations || 10,
        min_compatibility_score: options.minCompatibilityScore || 0.5
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting job recommendations:', error);
      throw error;
    }
  }

  /**
   * Convertir les données employé du format Sequelize vers le format Python
   */
  convertEmployeeFormat(employee) {
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department,
      hire_date: employee.hire_date,
      email: employee.email,
      phone: employee.phone,
      location: employee.location,
      skills: (employee.skills || employee.EmployeeSkills || []).map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name,
        skill_type: skill.Skill?.type?.type_name || skill.skill_type,
        current_level: skill.SkillLevel?.value || skill.current_level || 1,
        level_name: skill.SkillLevel?.level_name || skill.level_name,
        acquired_date: skill.acquired_date,
        certification: skill.certification
      }))
    };
  }

  /**
   * Convertir les données de poste du format Sequelize vers le format Python
   */
  convertJobFormat(job) {
    return {
      id: job.id,
      title: job.emploi || job.title,
      department: job.filiere_activite || job.department,
      family: job.famille,
      experience_level: job.niveau_exp,
      required_skills: (job.requiredSkills || job.required_skills || []).map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name,
        skill_type: skill.Skill?.type?.type_name || skill.skill_type,
        required_level: skill.SkillLevel?.value || skill.required_level || 3,
        level_name: skill.SkillLevel?.level_name || skill.level_name,
        is_mandatory: skill.is_mandatory !== false,
        weight: skill.weight || 1.0
      }))
    };
  }
}

module.exports = new RecommendationService();