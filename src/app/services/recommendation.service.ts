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

    return this.http.get<TrainingRecommendationResponse>(
      `${this.apiUrl}/training/${employeeId}/${targetJobId}`,
      { params }
    ).pipe(
      catchError(error => {
        console.error('Error getting training recommendations:', error);
        throw error;
      })
    );
  }

  /**
   * Obtenir des recommandations de postes pour un employé
   */
  getJobRecommendations(
    employeeId: number,
    department?: string,
    limit: number = 10,
    minScore: number = 0.5
  ): Observable<JobRecommendationResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('minScore', minScore.toString());
    
    if (department) {
      params = params.set('department', department);
    }

    return this.http.get<JobRecommendationResponse>(
      `${this.apiUrl}/jobs/${employeeId}`,
      { params }
    ).pipe(
      catchError(error => {
        console.error('Error getting job recommendations:', error);
        throw error;
      })
    );
  }

  /**
   * Vérifier le statut de l'API de recommandation
   */
  checkAPIHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      map(response => ({ status: 'healthy', ...response })),
      catchError(error => {
        console.error('Recommendation API is not available:', error);
        return of({ status: 'unhealthy', error: error.message });
      })
    );
  }

  /**
   * Convertir un employé du format Angular vers le format API
   */
  convertEmployeeToRecommendationFormat(employee: any): EmployeeForRecommendation {
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department || '',
      hire_date: employee.hire_date,
      email: employee.email,
      phone: employee.phone,
      location: employee.location,
      skills: (employee.EmployeeSkills || employee.skills || []).map((skill: any) => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || '',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type,
        current_level: skill.SkillLevel?.value || skill.current_level || 1,
        level_name: skill.SkillLevel?.level_name || skill.level_name,
        acquired_date: skill.acquired_date,
        certification: skill.certification
      }))
    };
  }

  /**
   * Convertir un poste du format Angular vers le format API
   */
  convertJobToRecommendationFormat(job: any): JobForRecommendation {
    return {
      id: job.id,
      title: job.emploi || job.title,
      department: job.filiere_activite || job.department,
      family: job.famille,
      experience_level: job.niveau_exp,
      required_skills: (job.requiredSkills || job.required_skills || []).map((skill: any) => ({
        skill_id: skill.skill_id,
        skill_name: skill.Skill?.name || skill.skill_name || '',
        skill_type: skill.Skill?.type?.type_name || skill.skill_type,
        required_level: skill.SkillLevel?.value || skill.required_level || 3,
        level_name: skill.SkillLevel?.level_name || skill.level_name,
        is_mandatory: skill.is_mandatory !== false,
        weight: skill.weight || 1.0
      }))
    };
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
}