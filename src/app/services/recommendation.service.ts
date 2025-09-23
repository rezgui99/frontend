import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  TrainingRecommendation,
  JobRecommendation,
  TrainingRecommendationResponse,
  JobRecommendationResponse,
  EmployeeForRecommendation,
  JobForRecommendation
} from '../models/recommendation.model';
import { Employee } from '../models/employee.model';
import { JobDescription } from '../models/job-description.model';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = `${environment.backendUrl}/recommendations`;

  constructor(private http: HttpClient) {}

  /**
   * Obtenir des recommandations de formation pour un employé
   */
  getTrainingRecommendations(
    employeeId: number,
    targetJobId: number,
    maxRecommendations: number = 5,
    priorityThreshold: number = 0.6
  ): Observable<TrainingRecommendationResponse> {
    const params = new HttpParams()
      .set('maxRecommendations', maxRecommendations.toString())
      .set('priorityThreshold', priorityThreshold.toString());

    const url = `${this.apiUrl}/training/${employeeId}/${targetJobId}`;
    console.log('🎓 Calling training recommendations API:', url, 'with params:', params.toString());

    return this.http.get<TrainingRecommendationResponse>(url, { params }).pipe(
      map(response => {
        console.log('✅ Training recommendations response:', response);
        
        // Vérifier si le backend indique explicitement un fallback
        if (response && (response as any).engine === 'fallback') {
          console.log('🔄 Backend explicitly using fallback engine');
          return this.processTrainingRecommendations(response);
        }
        
        // Appliquer les corrections de cohérence sur les recommandations reçues
        if (response && response.recommendations) {
          response.recommendations = response.recommendations.map(rec => 
            this.validateAndCorrectTrainingRecommendation(rec)
          );
        }
        return response;
      }),
      catchError(error => {
        console.error('❌ Error getting training recommendations:', error);
        console.error('Request URL:', url);
        console.error('Request params:', params.toString());
        // Fallback heuristique en cas d'erreur API ML
        console.log('🔄 Falling back to heuristic recommendations...');
        return this.generateHeuristicTrainingRecommendations(employeeId, targetJobId, maxRecommendations, priorityThreshold);
      })
    );
  }

  /**
   * Obtenir des recommandations de postes pour un employé
   */
  getJobRecommendations(
    employeeId: number,
    department?: string,
    maxRecommendations: number = 10,
    minCompatibilityScore: number = 0.5
  ): Observable<JobRecommendationResponse> {
    let params = new HttpParams()
      .set('maxRecommendations', maxRecommendations.toString())
      .set('minCompatibilityScore', minCompatibilityScore.toString());
    
    if (department) {
      params = params.set('department', department);
    }

    const url = `${this.apiUrl}/employee/${employeeId}/jobs`;
    console.log('💼 Calling job recommendations API:', url, 'with params:', params.toString());

    return this.http.get<JobRecommendationResponse>(url, { params }).pipe(
      map(response => {
        console.log('✅ Job recommendations response:', response);
        
        // Vérifier si le backend indique explicitement un fallback
        if (response && (response as any).engine === 'fallback') {
          console.log('🔄 Backend explicitly using fallback engine');
          return this.processJobRecommendations(response);
        }
        
        // Appliquer les corrections de cohérence sur les recommandations reçues
        if (response && response.recommendations) {
          response.recommendations = response.recommendations.map(rec => 
            this.validateAndCorrectJobRecommendation(rec)
          );
        }
        return response;
      }),
      catchError(error => {
        console.error('❌ Error getting job recommendations:', error);
        console.error('Request URL:', url);
        console.error('Request params:', params.toString());
        // Fallback heuristique en cas d'erreur API ML
        console.log('🔄 Falling back to heuristic job recommendations...');
        return this.generateHeuristicJobRecommendations(employeeId, department, maxRecommendations, minCompatibilityScore);
      })
    );
  }

  /**
   * Vérifier le statut de l'API de recommandation
   */
  checkAPIHealth(): Observable<any> {
    const url = `${this.apiUrl}/health`;
    console.log('🏥 Checking API health:', url);
    
    return this.http.get(url).pipe(
      map(response => {
        console.log('✅ API Health response:', response);
        return { status: 'healthy', ...response };
      }),
      catchError(error => {
        console.error('❌ Recommendation API is not available:', error);
        return of({ status: 'unhealthy', error: error.message });
      })
    );
  }

  /**
   * Traiter les recommandations de formation avec validation robuste
   */
  private processTrainingRecommendations(response: any): TrainingRecommendationResponse {
    if (!response || !response.recommendations) {
      return {
        employee: { id: 0, name: '', position: '' },
        target_job: { id: 0, title: '', department: '' },
        recommendations: [],
        total: 0,
        calculation_method: 'fallback',
        generated_at: new Date().toISOString()
      };
    }

    // Valider et corriger chaque recommandation
    const validatedRecommendations = this.ensureArray(response.recommendations).map(rec => 
      this.validateAndCorrectTrainingRecommendation(rec)
    );

    return {
      ...response,
      recommendations: validatedRecommendations,
      total: validatedRecommendations.length
    };
  }

  /**
   * Traiter les recommandations de poste avec validation robuste
   */
  private processJobRecommendations(response: any): JobRecommendationResponse {
    if (!response || !response.recommendations) {
      return {
        employee: { id: 0, name: '', position: '' },
        recommendations: [],
        total: 0,
        calculation_method: 'fallback',
        generated_at: new Date().toISOString()
      };
    }

    // Valider et corriger chaque recommandation
    const validatedRecommendations = this.ensureArray(response.recommendations).map(rec => 
      this.validateAndCorrectJobRecommendation(rec)
    );

    return {
      ...response,
      recommendations: validatedRecommendations,
      total: validatedRecommendations.length
    };
  }

  /**
   * Valider et corriger une recommandation de formation selon les formules documentées
   */
  private validateAndCorrectTrainingRecommendation(rec: any): any {
    // Recalculer la probabilité hybride ML + heuristique
    const correctedProbability = this.calculateHybridSuccessProbability(rec);
    
    // Recalculer la durée selon l'écart
    const correctedDuration = this.calculateTrainingDuration(rec.gap, rec.skill_type);
    
    // Générer une justification complète
    const detailedJustification = this.generateDetailedTrainingJustification(rec);
    
    return {
      ...rec,
      success_probability: correctedProbability,
      estimated_duration_hours: correctedDuration,
      justification: detailedJustification,
      calculation_method: 'hybrid_ml_heuristic',
      formula_applied: {
        probability: `ML_base(${rec.ml_probability || 0.6}) + heuristic_adjustments`,
        duration: `base_duration(${rec.gap}) + complexity_factor + type_factor`
      }
    };
  }

  /**
   * Valider et corriger une recommandation de poste selon les formules documentées
   */
  private validateAndCorrectJobRecommendation(rec: any): any {
    // Recalculer le score de compatibilité avec pondération documentée
    const correctedCompatibility = this.calculateJobCompatibilityScore(rec);
    
    // Générer une justification détaillée avec décomposition
    const detailedJustification = this.generateDetailedJobJustification(rec, correctedCompatibility);
    
    return {
      ...rec,
      compatibility_score: correctedCompatibility.overall_score,
      skill_match_score: correctedCompatibility.skill_score,
      experience_match_score: correctedCompatibility.experience_score,
      certification_match_score: correctedCompatibility.certification_score,
      recommendation_reason: detailedJustification,
      calculation_method: 'weighted_compatibility',
      formula_applied: {
        overall: `(skills * 0.7) + (experience * 0.2) + (certifications * 0.1)`,
        breakdown: correctedCompatibility.breakdown
      }
    };
  }

  /**
   * Calculer la probabilité de succès hybride (ML + heuristique)
   */
  private calculateHybridSuccessProbability(rec: any): number {
    // Base ML (si disponible) ou heuristique
    const mlBase = rec.ml_probability || this.calculateHeuristicSuccessProbability(rec);
    
    // Ajustements heuristiques selon les règles documentées
    let adjustments = 0;
    
    // Bonus expérience (+10% si > 3 ans)
    if (rec.employee_experience_years > 3) {
      adjustments += 0.1;
    }
    
    // Bonus certifications (+5% par certification)
    if (rec.has_certifications) {
      adjustments += 0.05;
    }
    
    // Malus écart important (-5% par niveau au-delà de 2)
    if (rec.gap > 2) {
      adjustments -= (rec.gap - 2) * 0.05;
    }
    
    // Bonus performance élevée (+10% si > 0.8)
    if (rec.employee_performance_score > 0.8) {
      adjustments += 0.1;
    }
    
    const finalProbability = Math.max(0.1, Math.min(0.95, mlBase + adjustments));
    
    console.log(`🧮 Hybrid probability calculation: ML(${mlBase}) + adjustments(${adjustments}) = ${finalProbability}`);
    return Math.round(finalProbability * 100) / 100;
  }

  /**
   * Calculer la probabilité heuristique de succès
   */
  private calculateHeuristicSuccessProbability(rec: any): number {
    let baseProbability = 0.6;
    
    // Facteur niveau actuel (plus c'est bas, plus c'est facile d'améliorer)
    const level = rec.current_level ?? rec.currentLevel ?? 0;
    const levelFactor = Math.max(0, (5 - level) * 0.05);
    
    // Facteur écart (plus l'écart est grand, plus c'est difficile)
    const gap = rec.gap ?? 0;
    const gapFactor = Math.max(0, gap * 0.1);
    
    // Facteur type de compétence
    const type = rec.skill_type ?? rec.skillType ?? '';
    const typeFactor = this.getSkillTypeSuccessFactor(type);
    
    return Math.max(0.2, Math.min(0.9, baseProbability + levelFactor - gapFactor + typeFactor));
  }

  /**
   * Calculer la durée de formation selon l'écart et le type
   */
  private calculateTrainingDuration(gap: number, skillType: string): number {
    // Durée de base selon l'écart
    const baseDuration = (gap ?? 0) * 20; // 20h par niveau d'écart
    
    // Facteur selon le type de compétence
    const typeFactors: Record<string, number> = {
      'Technique': 1.2,
      'Managériale': 1.0,
      'Communication': 0.8,
      'Analytique': 1.1
    };
    
    const typeFactor = typeFactors[skillType as keyof typeof typeFactors] ?? 1.0;
    
    // Facteur de complexité (plus l'écart est grand, plus c'est complexe)
    const complexityFactor = 1 + (Math.max(1, gap ?? 0) - 1) * 0.1;
    
    const totalDuration = Math.round(baseDuration * typeFactor * complexityFactor);
    
    console.log(`⏱️ Duration calculation: base(${baseDuration}) * type(${typeFactor}) * complexity(${complexityFactor}) = ${totalDuration}h`);
    return Math.max(10, totalDuration);
  }

  /**
   * Calculer le score de compatibilité poste avec pondération documentée (70/20/10)
   */
  private calculateJobCompatibilityScore(rec: any): any {
    // Score compétences (70%) - Validation robuste
    const skillScore = this.calculateSkillMatchScore(rec);
    
    // Score expérience (20%)
    const experienceScore = this.calculateExperienceMatchScore(rec);
    
    // Score certifications (10%)
    const certificationScore = this.calculateCertificationMatchScore(rec);
    
    // Score global selon la pondération documentée FIXE
    const overallScore = (skillScore * 0.7) + (experienceScore * 0.2) + (certificationScore * 0.1);
    
    console.log(`🎯 Compatibility calculation: skills(${skillScore}*0.7) + experience(${experienceScore}*0.2) + certs(${certificationScore}*0.1) = ${overallScore}`);
    
    return {
      overall_score: Math.round(overallScore * 100) / 100,
      skill_score: Math.round(skillScore * 100) / 100,
      experience_score: Math.round(experienceScore * 100) / 100,
      certification_score: Math.round(certificationScore * 100) / 100,
      breakdown: {
        skills_weight: 0.7,
        experience_weight: 0.2,
        certification_weight: 0.1,
        skills_contribution: skillScore * 0.7,
        experience_contribution: experienceScore * 0.2,
        certification_contribution: certificationScore * 0.1
      }
    };
  }

  /**
   * Calculer le score de correspondance des compétences avec validation robuste
   * - Gère alias de clés (snake/camel)
   * - Fallback par "counts" si pas de détails
   * - Fallback final sur rec.skill_score si fourni par l'API
   */
  private calculateSkillMatchScore(rec: any): number {
    // 1) Récupérer différentes variantes de clés
    const matchingSkills = this.toArray(
      this.pickFirst(rec, ['matching_skills', 'matchingSkills', 'matched_skills', 'skills_matched'])
    );
    const missingSkills = this.toArray(
      this.pickFirst(rec, ['missing_skills', 'missingSkills', 'skills_missing'])
    );
    const exceedingSkills = this.toArray(
      this.pickFirst(rec, ['exceeding_skills', 'exceedingSkills', 'overqualified_skills', 'skills_exceeding'])
    );

    let totalSkills = matchingSkills.length + missingSkills.length + exceedingSkills.length;

    // 2) Si aucun détail, tenter un fallback par "counts"
    if (totalSkills === 0) {
      const matchingCount = this.safeGetNumber(
        this.pickFirst(rec, ['matching_skills_count', 'matchingCount', 'skills_matched_count']), 0
      );
      const missingCount = this.safeGetNumber(
        this.pickFirst(rec, ['missing_skills_count', 'missingCount', 'skills_missing_count']), 0
      );
      const exceedingCount = this.safeGetNumber(
        this.pickFirst(rec, ['exceeding_skills_count', 'exceedingCount', 'skills_exceeding_count']), 0
      );

      const totalCount = matchingCount + missingCount + exceedingCount;
      if (totalCount > 0) {
        const score = matchingCount / totalCount; // ratio simple
        console.log(`ℹ️ Skill score via counts: ${matchingCount}/${totalCount} = ${score}`);
        return Math.max(0, Math.min(1, score));
      }

      // 3) Fallback final: score déjà fourni par l'API
      const apiSkillScore = this.safeGetNumber(this.pickFirst(rec, ['skill_score', 'skillsScore']), NaN);
      if (!isNaN(apiSkillScore)) {
        console.log(`ℹ️ Skill score via API field: ${apiSkillScore}`);
        return Math.max(0, Math.min(1, apiSkillScore));
      }

      // 4) Rien du tout: score neutre, pas de warn bruyant
      return 0.5;
    }

    // 5) Calcul pondéré quand on a du détail
    let weightedScore = 0;
    let totalWeight = 0;

    // matching
    matchingSkills.forEach((skill: any) => {
      const weight = this.safeGetNumber(skill?.weight, 1.0);
      const currentLevel = this.safeGetNumber(skill?.current_level ?? skill?.currentLevel, 0);
      const requiredLevel = this.safeGetNumber(skill?.required_level ?? skill?.requiredLevel, 1);
      const levelRatio = requiredLevel > 0 ? Math.min(1, currentLevel / requiredLevel) : 0;
      weightedScore += levelRatio * weight;
      totalWeight += weight;
    });

    // exceeding = bonus plein
    exceedingSkills.forEach((skill: any) => {
      const weight = this.safeGetNumber(skill?.weight, 1.0);
      weightedScore += 1.0 * weight;
      totalWeight += weight;
    });

    // missing = ne contribue qu'au poids
    missingSkills.forEach((skill: any) => {
      const weight = this.safeGetNumber(skill?.weight, 1.0);
      totalWeight += weight;
    });

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;

    console.log(`🎯 Skill match calculation: weighted_score(${weightedScore}) / total_weight(${totalWeight}) = ${finalScore}`);
    return Math.max(0, Math.min(1, finalScore));
  }

  /**
   * Calculer le score de correspondance d'expérience
   */
  private calculateExperienceMatchScore(rec: any): number {
    const employeeYears = this.safeGetNumber(
      rec.employee_experience_years ?? rec.employeeExperienceYears, 2
    );
    const level = rec.experience_level ?? rec.experienceLevel ?? 'Confirmé';
    const requiredYears = this.getRequiredExperienceYears(level);
    
    if (employeeYears >= requiredYears) {
      return 1.0;
    }
    
    return Math.max(0, employeeYears / requiredYears);
  }

  /**
   * Calculer le score de correspondance des certifications
   */
  private calculateCertificationMatchScore(rec: any): number {
    const employeeCertifications = this.safeGetNumber(
      rec.employee_certifications ?? rec.employeeCertifications, 0
    );
    const requiredCertifications = this.safeGetNumber(
      rec.required_certifications ?? rec.requiredCertifications, 0
    );
    
    if (requiredCertifications === 0) return 1.0;
    
    return Math.min(1.0, employeeCertifications / requiredCertifications);
  }

  /**
   * Générer une justification détaillée pour une recommandation de formation
   */
  private generateDetailedTrainingJustification(rec: any): string {
    const currentLevel = rec.current_level ?? rec.currentLevel ?? 0;
    const targetLevel = rec.target_level ?? rec.targetLevel ?? '';
    const gap = rec.gap ?? 0;
    const skillName = rec.skill_name ?? rec.skillName ?? 'Compétence';
    const duration = rec.estimated_duration_hours ?? rec.estimatedDurationHours ?? 0;
    const probability = Math.round((rec.success_probability || 0.6) * 100);
    
    return `Compétence ${skillName}: Niveau actuel ${currentLevel} → Niveau cible ${targetLevel} → Écart de ${gap} niveau(x). ` +
           `Formation ${rec.training_type || 'mixte'} recommandée: ${duration}h, ` +
           `probabilité de succès ${probability}%. ` +
           `Priorité ${rec.priority ?? 'Moyenne'} basée sur l'importance métier et l'impact carrière.`;
  }

  /**
   * Générer une justification détaillée pour une recommandation de poste
   */
  private generateDetailedJobJustification(rec: any, compatibility: any): string {
    const overallScore = Math.round(compatibility.overall_score * 100);
    const skillScore = Math.round(compatibility.skill_score * 100);
    const expScore = Math.round(compatibility.experience_score * 100);
    const certScore = Math.round(compatibility.certification_score * 100);
    
    const matchingCount = this.ensureArray(
      this.pickFirst(rec, ['matching_skills','matchingSkills'])
    ).length;
    const missingCount = this.ensureArray(
      this.pickFirst(rec, ['missing_skills','missingSkills'])
    ).length;
    
    return `Score de compatibilité ${overallScore}% calculé selon la pondération documentée: ` +
           `Compétences ${skillScore}% (poids 70%) + Expérience ${expScore}% (poids 20%) + Certifications ${certScore}% (poids 10%). ` +
           `${matchingCount} compétence(s) correspondante(s), ${missingCount} compétence(s) à développer. ` +
           `Niveau de préparation: ${rec.readiness_level ?? 'À préciser'}. Potentiel de croissance: ${Math.round((rec.growth_potential || 0.7) * 100)}%.`;
  }

  /**
   * Fallback heuristique pour les recommandations de formation
   */
  private generateHeuristicTrainingRecommendations(
    employeeId: number, 
    targetJobId: number, 
    maxRecommendations: number, 
    priorityThreshold: number
  ): Observable<TrainingRecommendationResponse> {
    // Simuler des recommandations heuristiques avec le même format que l'API ML
    const heuristicRecommendations = this.generateHeuristicTrainingData(employeeId, targetJobId);
    
    const response: TrainingRecommendationResponse = {
      employee: { id: employeeId, name: 'Employé', position: 'Poste' },
      target_job: { id: targetJobId, title: 'Poste cible', department: 'Département' },
      recommendations: heuristicRecommendations.slice(0, maxRecommendations),
      total: heuristicRecommendations.length,
      calculation_method: 'heuristic_fallback',
      generated_at: new Date().toISOString()
    };
    
    return of(response);
  }

  /**
   * Fallback heuristique pour les recommandations de poste
   */
  private generateHeuristicJobRecommendations(
    employeeId: number, 
    department?: string, 
    maxRecommendations: number = 10, 
    minCompatibilityScore: number = 0.5
  ): Observable<JobRecommendationResponse> {
    // Simuler des recommandations heuristiques avec le même format que l'API ML
    const heuristicRecommendations = this.generateHeuristicJobData(employeeId, department);
    
    const response: JobRecommendationResponse = {
      employee: { id: employeeId, name: 'Employé', position: 'Poste actuel' },
      recommendations: heuristicRecommendations.slice(0, maxRecommendations),
      total: heuristicRecommendations.length,
      calculation_method: 'heuristic_fallback',
      generated_at: new Date().toISOString()
    };
    
    return of(response);
  }

  /**
   * Générer des données de formation heuristiques
   */
  private generateHeuristicTrainingData(employeeId: number, targetJobId: number): any[] {
    // Compétences types avec écarts simulés
    const skillGaps = [
      { skill_id: 1, skill_name: 'JavaScript', skill_type: 'Technique', current_level: 2, target_level: 4, gap: 2 },
      { skill_id: 2, skill_name: 'Leadership', skill_type: 'Managériale', current_level: 1, target_level: 3, gap: 2 },
      { skill_id: 3, skill_name: 'Communication', skill_type: 'Communication', current_level: 2, target_level: 3, gap: 1 }
    ];
    
    return skillGaps.map(gap => {
      const duration = this.calculateTrainingDuration(gap.gap, gap.skill_type);
      const probability = this.calculateHeuristicSuccessProbability(gap);
      
      return {
        ...gap,
        priority: this.determinePriorityFromScore(gap.gap / 3),
        priority_score: gap.gap / 3,
        training_type: this.selectTrainingType(gap.gap, gap.skill_type),
        estimated_duration_hours: duration,
        difficulty: gap.gap <= 1 ? 'Facile' : gap.gap <= 2 ? 'Moyen' : 'Difficile',
        success_probability: probability,
        justification: this.generateDetailedTrainingJustification(gap),
        expected_benefits: this.getTrainingBenefits(gap.skill_type),
        calculation_method: 'heuristic'
      };
    });
  }

  /**
   * Générer des données de poste heuristiques
   */
  private generateHeuristicJobData(employeeId: number, department?: string): any[] {
    // Postes types avec scores simulés
    const jobMatches = [
      { 
        job_id: 1, 
        job_title: 'Développeur Senior', 
        department: 'Développement',
        matching_skills: [{ skill_name: 'JavaScript', current_level: 3, required_level: 4, weight: 1.0 }],
        missing_skills: [{ skill_name: 'React', current_level: 0, required_level: 3, weight: 1.0 }],
        exceeding_skills: []
      },
      { 
        job_id: 2, 
        job_title: 'Chef de Projet', 
        department: 'Management',
        matching_skills: [{ skill_name: 'Leadership', current_level: 2, required_level: 3, weight: 1.0 }],
        missing_skills: [{ skill_name: 'Gestion Budget', current_level: 0, required_level: 2, weight: 1.0 }],
        exceeding_skills: []
      }
    ];
    
    return jobMatches.map(job => {
      const compatibility = this.calculateJobCompatibilityScore(job);
      
      return {
        ...job,
        compatibility_score: compatibility.overall_score,
        skill_match_score: compatibility.skill_score,
        experience_match_score: compatibility.experience_score,
        certification_match_score: compatibility.certification_score,
        overall_fit_score: compatibility.overall_score,
        readiness_level: compatibility.overall_score >= 0.8 ? 'Prêt' : 
                        compatibility.overall_score >= 0.6 ? 'Formation courte nécessaire' : 
                        'Formation longue nécessaire',
        recommended_actions: this.getJobRecommendedActions(compatibility.overall_score),
        growth_potential: 0.7 + Math.random() * 0.2,
        salary_potential: this.calculateSalaryPotential(job.department),
        recommendation_reason: this.generateDetailedJobJustification(job, compatibility),
        confidence_level: 0.8,
        calculation_method: 'heuristic'
      };
    });
  }

  /**
   * Utilitaires pour la validation robuste des données
   */
  private toArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
        return [];
      } catch {
        return [];
      }
    }
    if (typeof value === 'object') return [value];
    return [];
  }

  private pickFirst<T = any>(obj: any, keys: string[]): T | undefined {
    if (!obj) return undefined as any;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined as any;
  }

  private ensureArray(value: any): any[] {
    return this.toArray(value);
  }

  private safeGetNumber(value: any, defaultValue: number): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  }

  private safeGetString(value: any, defaultValue: string): string {
    if (typeof value === 'string') {
      return value;
    }
    return defaultValue;
  }

  /**
   * Obtenir la couleur de priorité pour l'affichage
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Critique': return 'text-red-600 bg-red-50';
      case 'Élevée': return 'text-orange-600 bg-orange-50';
      case 'Moyenne': return 'text-yellow-600 bg-yellow-50';
      case 'Faible': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  /**
   * Obtenir la couleur de compatibilité
   */
  getCompatibilityColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Utilitaires pour les calculs
   */
  private getSkillTypeSuccessFactor(skillType: string): number {
    const factors: Record<string, number> = {
      'Technique': 0.05,
      'Managériale': -0.05,
      'Communication': 0.1,
      'Analytique': 0.0
    };
    return factors[skillType as keyof typeof factors] ?? 0;
  }

  private selectTrainingType(gap: number, skillType: string): string {
    if (gap === 1) return 'Formation en ligne';
    if (gap === 2) return 'Formation présentielle';
    return 'Certification + Mentorat';
  }

  private determinePriorityFromScore(score: number): string {
    if (score >= 0.8) return 'Critique';
    if (score >= 0.6) return 'Élevée';
    if (score >= 0.4) return 'Moyenne';
    return 'Faible';
  }

  private getTrainingBenefits(skillType: string): string[] {
    const benefits: Record<string, string[]> = {
      'Technique': ['Amélioration de la productivité technique', 'Accès à de nouveaux projets', 'Évolution salariale'],
      'Managériale': ['Leadership renforcé', 'Gestion d\'équipe efficace', 'Opportunités de promotion'],
      'Communication': ['Relations interpersonnelles améliorées', 'Efficacité en réunion', 'Influence accrue'],
      'Analytique': ['Prise de décision data-driven', 'Résolution de problèmes complexes', 'Valeur stratégique']
    };
    return benefits[skillType as keyof typeof benefits] || ['Développement professionnel', 'Amélioration des performances'];
  }

  private getRequiredExperienceYears(level: string): number {
    const requirements: Record<string, number> = {
      'Junior': 1,
      'Confirmé': 3,
      'Senior': 5,
      'Expert': 8
    };
    return requirements[level as keyof typeof requirements] || 2;
  }

  private getJobRecommendedActions(compatibilityScore: number): string[] {
    if (compatibilityScore >= 0.8) {
      return ['Postuler immédiatement', 'Préparer l\'entretien technique', 'Mettre à jour le CV'];
    } else if (compatibilityScore >= 0.6) {
      return ['Suivre 1-2 formations ciblées', 'Acquérir de l\'expérience pratique', 'Postuler dans 3-6 mois'];
    } else {
      return ['Plan de formation complet', 'Acquérir certifications', 'Gain d\'expérience significatif', 'Postuler dans 6-12 mois'];
    }
  }

  private calculateSalaryPotential(department: string): any {
    const ranges: Record<string, {min:number,max:number}> = {
      'Développement': { min: 35000, max: 80000 },
      'Marketing': { min: 30000, max: 70000 },
      'RH': { min: 28000, max: 65000 },
      'Finance': { min: 32000, max: 75000 },
      'Commercial': { min: 25000, max: 90000 }
    };
    
    const range = ranges[department as keyof typeof ranges] || { min: 30000, max: 60000 };
    
    return {
      min: range.min,
      max: range.max,
      median: Math.round((range.min + range.max) / 2)
    };
  }
}
