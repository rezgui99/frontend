import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmployeeSkill } from '../models/employee-skill.model'; // tu peux créer un modèle séparé ou utiliser l'interface
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeSkillService {
  private apiUrl = `${environment.backendUrl}/employeeskills`; // adapter selon ton backend

  constructor(private http: HttpClient) { }

  // Récupérer toutes les compétences
  getAll(): Observable<EmployeeSkill[]> {
    return this.http.get<EmployeeSkill[]>(this.apiUrl);
  }

  // Ajouter une compétence
  create(skillData: EmployeeSkill): Observable<EmployeeSkill> {
    return this.http.post<EmployeeSkill>(this.apiUrl, skillData);
  }

  // Mettre à jour une compétence
  update(employee_id: number, skill_id: number, skillData: EmployeeSkill): Observable<EmployeeSkill> {
    return this.http.put<EmployeeSkill>(`${this.apiUrl}/${employee_id}/${skill_id}`, skillData);
  }

  // Supprimer une compétence
  delete(employee_id: number, skill_id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${employee_id}/${skill_id}`);
  }

  // Récupérer une compétence par employee et skill
  getById(employee_id: number, skill_id: number): Observable<EmployeeSkill> {
    return this.http.get<EmployeeSkill>(`${this.apiUrl}/${employee_id}/${skill_id}`);
  }
}
export type { EmployeeSkill };

