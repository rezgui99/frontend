// services/recommendationService.js
const axios = require('axios');

class RecommendationService {
  constructor() {
    this.apiUrl = process.env.ML_API_URL || 'http://localhost:8001';
    this.timeout = 30000; // 30s

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' },
      // IMPORTANT si vous avez un proxy/https auto-signé : adapter ici
      // httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    // Intercepteur: erreurs de connexion → message clair
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ECONNABORTED'
        ) {
          throw new Error(
            `Service de recommandation indisponible. Vérifiez que l'API ML est démarrée sur ${this.apiUrl}`
          );
        }
        // Laisser passer les 4xx/5xx, on les gèrera dans la méthode appelante
        throw error;
      }
    );
  }

  /* ================= Health ================= */

  async checkHealth() {
    try {
      console.log(`🏥 Checking ML API health at ${this.apiUrl}/health`);
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        api_url: this.apiUrl,
        response_time: response.headers['x-response-time'] || 'N/A',
        models: response.data.models || {},
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ ML API health check failed:', error.message);
      return {
        status: 'unhealthy',
        api_url: this.apiUrl,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /* ============== Training Recos (ML only) ============== */

  async getTrainingRecommendations(employee, targetJob, options = {}) {
    try {
      console.log(
        `🎓 Getting training recommendations for employee ${employee.id} -> job ${targetJob.id}`
      );

      const requestData = {
        employee: this.convertEmployeeFormat(employee),
        target_job: this.convertJobFormat(targetJob),
        max_recommendations: options.maxRecommendations || 5,
        priority_threshold: options.priorityThreshold || 0.6,
      };

      console.log('📤 [ML] /api/v1/recommendations/training');
      const response = await this.client.post(
        '/api/v1/recommendations/training',
        requestData
      );

      console.log(
        `✅ Training recommendations received: ${Array.isArray(response.data) ? response.data.length : (response.data?.recommendations?.length || 0)}`
      );

      const list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.recommendations)
        ? response.data.recommendations
        : [];

      return {
        employee: { id: employee.id, name: employee.name, position: employee.position },
        target_job: {
          id: targetJob.id,
          title: targetJob.emploi || targetJob.title,
          department: targetJob.filiere_activite || targetJob.department,
        },
        recommendations: list,
        total: list.length,
        engine: 'ml',
      };
    } catch (error) {
      console.error('❌ Error getting training recommendations:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      // On laisse l’erreur remonter côté contrôleur (pas de fallback prévu ici)
      throw new Error(
        `Erreur lors de la génération des recommandations de formation: ${error.message}`
      );
    }
  }

  /* ============== Job Recos (ML + Fallback local) ============== */

  async getJobRecommendations(employee, availableJobs, options = {}) {
    const maxRecommendations = options.maxRecommendations || 10;
    const minCompatibilityScore = options.minCompatibilityScore ?? 0.5;

    // 1) Essayer l’API ML
    try {
      console.log(`💼 Getting job recommendations for employee ${employee.id}`);

      const requestData = {
        employee: this.convertEmployeeFormat(employee),
        available_jobs: (availableJobs || []).map((job) => this.convertJobFormat(job)),
        max_recommendations: maxRecommendations,
        min_compatibility_score: minCompatibilityScore,
      };

      console.log('📤 [ML] /api/v1/recommendations/jobs');
      const response = await this.client.post(
        '/api/v1/recommendations/jobs',
        requestData
      );

      const list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.recommendations)
        ? response.data.recommendations
        : [];

      console.log(`✅ Job recommendations received (ML): ${list.length}`);
      return {
        employee: { id: employee.id, name: employee.name, position: employee.position },
        recommendations: list,
        total: list.length,
        generatedAt: new Date().toISOString(),
        engine: 'ml',
      };
    } catch (error) {
      // 2) Fallback local si ML KO / 4xx / 5xx / timeout
      const reason = error?.response
        ? `ML API ${error.response.status}`
        : error?.message || 'Unknown';
      console.warn(`⚠️ ML API indisponible (${reason}), fallback local utilisé`);

      const recs = this.localJobFallback(
        this.convertEmployeeFormat(employee),
        (availableJobs || []).map((job) => this.convertJobFormat(job)),
        { maxRecommendations, minCompatibilityScore }
      );

      console.log(`✅ Job recommendations generated (fallback): ${recs.length}`);
      return {
        employee: { id: employee.id, name: employee.name, position: employee.position },
        recommendations: recs,
        total: recs.length,
        generatedAt: new Date().toISOString(),
        engine: 'fallback',
      };
    }
  }

  /* ============== Converters (Sequelize → plat) ============== */

  convertEmployeeFormat(employee) {
    const skills = employee.skills || employee.EmployeeSkills || [];
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department || '',
      hire_date: employee.hire_date || null,
      email: employee.email || null,
      phone: employee.phone || '',
      location: employee.location || '',
      skills: skills.map((skill) => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || '',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type || '',
        // ⚠️ on normalise un champ unique "level_value"
        level_value:
          skill.SkillLevel?.value ??
          skill.current_level ??
          skill.level_value ??
          0,
        level_name:
          skill.SkillLevel?.level_name ??
          skill.level_name ??
          (skill.current_level ? String(skill.current_level) : 'Aucun'),
        acquired_date: skill.acquired_date || null,
        certification: !!skill.certification,
        last_evaluated_date: skill.last_evaluated_date || null,
        years_experience: skill.years_experience || 0,
      })),
    };
  }

  convertJobFormat(job) {
    const requiredSkills = job.requiredSkills || job.required_skills || [];
    return {
      id: job.id,
      title: job.emploi || job.title,
      department: job.filiere_activite || job.department || null,
      family: job.famille || null,
      experience_level: job.niveau_exp || null,
      required_skills: requiredSkills.map((skill) => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || '',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type || '',
        // ⚠️ on normalise un champ unique "required_level_value"
        required_level_value:
          skill.SkillLevel?.value ??
          skill.required_level ??
          skill.required_level_value ??
          1,
        required_level_name:
          skill.SkillLevel?.level_name ??
          skill.level_name ??
          (skill.required_level ? String(skill.required_level) : 'Autonome'),
        is_mandatory: skill.is_mandatory !== false,
        weight: skill.weight || 1.0,
      })),
    };
  }

  /* ============== Fallback local (heuristique simple) ============== */

  localJobFallback(plainEmployee, plainJobs, { maxRecommendations, minCompatibilityScore }) {
    const empSkills = plainEmployee.skills || [];

    const scored = (plainJobs || []).map((job) => {
      const req = job.required_skills || [];
      const total = req.length || 1;

      let matchCount = 0;
      let sumRatio = 0;

      req.forEach((rs) => {
        const es = empSkills.find((s) => s.skill_id === rs.skill_id);
        if (es) {
          matchCount++;
          const need = rs.required_level_value || 1;
          const have = es.level_value || 0;
          const ratio = Math.min(1, need > 0 ? have / need : 1);
          sumRatio += ratio;
        }
      });

      const skillMatch = sumRatio / total; // [0..1]
      const compatibility = skillMatch;

      const readiness =
        compatibility >= 0.8
          ? 'Prêt'
          : compatibility >= 0.6
          ? 'Formation courte nécessaire'
          : 'Formation moyenne nécessaire';

      return {
        job_title: job.title,
        department: job.department || null,

        compatibility_score: compatibility,
        skill_match_score: skillMatch,
        experience_match_score: 0.5, // faute de données
        confidence_level: 0.35, // algo heuristique

        readiness_level: readiness,
        estimated_transition_time:
          readiness === 'Prêt'
            ? 'Immédiate'
            : readiness === 'Formation courte nécessaire'
            ? '1-3 mois'
            : '3-6 mois',

        // Pour ton template (compteurs)
        matching_skills: matchCount,
        missing_skills: (req.length || 0) - matchCount,
        exceeding_skills: [],

        recommendation_reason:
          'Calcul local basé sur la correspondance des compétences (fallback).',
        recommended_actions:
          compatibility >= 0.8
            ? []
            : ['Suivre une courte formation ciblée sur les compétences manquantes'],
      };
    });

    return scored
      .filter((r) => r.compatibility_score >= minCompatibilityScore)
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, maxRecommendations);
  }

  /* ============== Data Validation / Models ================= */

  async validateData(data) {
    try {
      const response = await this.client.post('/api/v1/data/validate', data);
      return response.data;
    } catch (error) {
      console.error('❌ Error validating data:', error.message);
      throw new Error(`Erreur lors de la validation des données: ${error.message}`);
    }
  }

  async getModelStatus() {
    try {
      const response = await this.client.get('/api/v1/models/status');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting model status:', error.message);
      throw new Error(
        `Erreur lors de la récupération du statut des modèles: ${error.message}`
      );
    }
  }

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
