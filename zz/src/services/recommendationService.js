// services/recommendationService.js
const axios = require('axios');

/* ---- Utils URL sûres (pas de double /api/v1, pas de //) ---- */
function trimSlashes(s = '') {
  return String(s).replace(/\/+$/, '');
}
function joinUrl(base, path) {
  return `${trimSlashes(base)}/${String(path).replace(/^\/+/, '')}`;
}

/* Normalise la base ML :
   - Si RECOMMENDATION_API_URL contient déjà /api/v1 → on garde tel quel comme base API.
   - Sinon, si RECOMMENDATION_API_BASE est défini (sans /api/v1) → on ajoute /api/v1 à l’appel.
   - Par défaut docker interne : http://recommendation-api:8001  (PAS localhost)
*/
function resolveMlBases() {
  const envUrl = process.env.RECOMMENDATION_API_URL;   // peut contenir /api/v1
  const envBase = process.env.RECOMMENDATION_API_BASE; // devrait être sans /api/v1

  // Défaut : service docker + port interne
  const defaultBase = 'http://recommendation-api:8001';

  if (envUrl) {
    const hasApiV1 = /\/api\/v1\/?$/.test(envUrl);
    // Si déjà /api/v1 → c’est la base API
    if (hasApiV1) {
      return {
        apiBase: trimSlashes(envUrl), // .../api/v1
        rawBase: envUrl.replace(/\/api\/v1\/?$/, ''), // ... (sans /api/v1)
        mode: 'URL_WITH_PREFIX',
      };
    }
    // Sinon envUrl sans /api/v1 : on le traite comme raw base
    return {
      apiBase: joinUrl(envUrl, '/api/v1'),
      rawBase: trimSlashes(envUrl),
      mode: 'URL_RAW_BASE',
    };
  }

  if (envBase) {
    return {
      apiBase: joinUrl(envBase, '/api/v1'),
      rawBase: trimSlashes(envBase),
      mode: 'BASE_RAW',
    };
  }

  // défaut
  return {
    apiBase: joinUrl(defaultBase, '/api/v1'),
    rawBase: defaultBase,
    mode: 'DEFAULT',
  };
}

class RecommendationService {
  constructor() {
    const { apiBase, rawBase, mode } = resolveMlBases();
    this.apiBase = apiBase; // …/api/v1
    this.rawBase = rawBase; // … (sans /api/v1)
    this.mode = mode;

    this.timeout = Number(process.env.ML_API_TIMEOUT_MS) || 30000;

    this.client = axios.create({
      baseURL: this.rawBase, // on posera les chemins entiers avec joinUrl()
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ECONNABORTED'
        ) {
          throw new Error(
            `Service de recommandation indisponible. Vérifiez que l'API ML est démarrée sur ${this.rawBase}`
          );
        }
        throw error;
      }
    );

    console.log(`🔧 ML URL mode=${this.mode}`);
    console.log(`🔧 ML RAW BASE = ${this.rawBase}`);
    console.log(`🔧 ML API BASE = ${this.apiBase}`);
  }

  /* ================= Health ================= */
  async checkHealth() {
    try {
      const url = joinUrl(this.rawBase, '/health');
      console.log(`🏥 Checking ML API health at ${url}`);
      const response = await this.client.get(url);
      return {
        status: 'healthy',
        api_url: this.rawBase,
        response_time: response.headers['x-response-time'] || 'N/A',
        models: response.data.models || {},
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ ML API health check failed:', error.message);
      return {
        status: 'unhealthy',
        api_url: this.rawBase,
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
        max_recommendations: options.maxRecommendations ?? 5,
        priority_threshold: options.priorityThreshold ?? 0.6,
      };

      const url = joinUrl(this.apiBase, '/recommendations/training'); // …/api/v1/recommendations/training
      console.log('📤 [ML]', url);
      const response = await this.client.post(url, requestData);

      const list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.recommendations)
        ? response.data.recommendations
        : [];

      console.log(`✅ Training recommendations received: ${list.length}`);

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
      throw new Error(
        `Erreur lors de la génération des recommandations de formation: ${error.message}`
      );
    }
  }

  /* ============== Job Recos (ML + Fallback local) ============== */
  async getJobRecommendations(employee, availableJobs, options = {}) {
    const maxRecommendations = options.maxRecommendations ?? 10;
    const minCompatibilityScore = options.minCompatibilityScore ?? 0.5;

    // 1) ML
    try {
      console.log(`💼 Getting job recommendations for employee ${employee.id}`);

      const requestData = {
        employee: this.convertEmployeeFormat(employee),
        available_jobs: (availableJobs || []).map((job) => this.convertJobFormat(job)),
        max_recommendations: maxRecommendations,
        min_compatibility_score: minCompatibilityScore,
      };

      const url = joinUrl(this.apiBase, '/recommendations/jobs'); // …/api/v1/recommendations/jobs
      console.log('📤 [ML]', url);
      const response = await this.client.post(url, requestData);

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
      experience_level: job.niveau_exp || job.experience_level || null,
      required_skills: requiredSkills.map((skill) => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || '',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type || '',
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
      const matchingSkillsArr = [];
      const missingSkillsArr = [];
      const exceedingSkillsArr = [];

      req.forEach((rs) => {
        const es = empSkills.find((s) => s.skill_id === rs.skill_id);
        const need = rs.required_level_value || 1;
        if (es) {
          const have = es.level_value || 0;
          const ratio = Math.min(1, need > 0 ? have / need : 1);
          sumRatio += ratio;
          matchCount++;

          if (have >= need) {
            exceedingSkillsArr.push({
              skill_name: rs.skill_name,
              current_level: have,
              required_level: need,
              weight: rs.weight || 1.0,
            });
          } else {
            matchingSkillsArr.push({
              skill_name: rs.skill_name,
              current_level: have,
              required_level: need,
              weight: rs.weight || 1.0,
            });
          }
        } else {
          missingSkillsArr.push({
            skill_name: rs.skill_name,
            current_level: 0,
            required_level: need,
            weight: rs.weight || 1.0,
          });
        }
      });

      const skillMatch = sumRatio / total; // [0..1]
      const compatibility = skillMatch;     // simple, faute d’autres signaux

      const readiness =
        compatibility >= 0.8
          ? 'Prêt'
          : compatibility >= 0.6
          ? 'Formation courte nécessaire'
          : 'Formation moyenne nécessaire';

      return {
        job_id: job.id,
        job_title: job.title,
        department: job.department || null,

        compatibility_score: compatibility,
        skill_match_score: skillMatch,
        experience_match_score: 0.5, // faute de données
        certification_match_score: 0.5,
        confidence_level: 0.4, // algo heuristique

        readiness_level: readiness,
        estimated_transition_time:
          readiness === 'Prêt'
            ? 'Immédiate'
            : readiness === 'Formation courte nécessaire'
            ? '1-3 mois'
            : '3-6 mois',

        // ⚠️ Tableaux pour le front Angular (évite "No skills data → 50%")
        matching_skills: matchingSkillsArr,
        missing_skills: missingSkillsArr,
        exceeding_skills: exceedingSkillsArr,

        recommended_actions:
          compatibility >= 0.8
            ? ['Postuler immédiatement', 'Préparer l’entretien']
            : ['Suivre une courte formation ciblée sur les compétences manquantes'],

        recommendation_reason:
          'Calcul local basé sur la correspondance des compétences (fallback).',
        calculation_method: 'heuristic',
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
      const url = joinUrl(this.apiBase, '/data/validate');
      const response = await this.client.post(url, data);
      return response.data;
    } catch (error) {
      console.error('❌ Error validating data:', error.message);
      throw new Error(`Erreur lors de la validation des données: ${error.message}`);
    }
  }

  async getModelStatus() {
    try {
      const url = joinUrl(this.apiBase, '/models/status');
      const response = await this.client.get(url);
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
      const url = joinUrl(this.apiBase, '/models/retrain');
      console.log('🔄 Requesting model retraining...', url);
      const response = await this.client.post(url);
      console.log('✅ Model retraining completed');
      return response.data;
    } catch (error) {
      console.error('❌ Error retraining models:', error.message);
      throw new Error(`Erreur lors du réentraînement des modèles: ${error.message}`);
    }
  }
}

module.exports = new RecommendationService();
