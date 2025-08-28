import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  UserManagement, 
  Role, 
  CreateUserRequest, 
  UpdateUserRequest, 
  AssignRoleRequest,
  UsersResponse,
  RolesResponse,
  AuditResponse
} from '../models/user-management.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = `${environment.backendUrl}/admin`;

  constructor(private http: HttpClient) { }

  // Gestion des utilisateurs
  getUsers(page: number = 1, limit: number = 10, search?: string, role?: string, isActive?: boolean): Observable<UsersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search) params = params.set('search', search);
    if (role) params = params.set('role', role);
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());

    return this.http.get<UsersResponse>(`${this.apiUrl}/users`, { params });
  }

  getUserById(id: number): Observable<{ user: UserManagement }> {
    return this.http.get<{ user: UserManagement }>(`${this.apiUrl}/users/${id}`);
  }

  createUser(userData: CreateUserRequest): Observable<{ message: string; user: UserManagement }> {
    return this.http.post<{ message: string; user: UserManagement }>(`${this.apiUrl}/users`, userData);
  }

  updateUser(id: number, userData: UpdateUserRequest): Observable<{ message: string; user: UserManagement }> {
    return this.http.put<{ message: string; user: UserManagement }>(`${this.apiUrl}/users/${id}`, userData);
  }

  deleteUser(id: number, soft: boolean = true): Observable<{ message: string }> {
    const params = new HttpParams().set('soft', soft.toString());
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${id}`, { params });
  }

  toggleUserStatus(id: number): Observable<{ message: string; user: UserManagement }> {
    return this.http.patch<{ message: string; user: UserManagement }>(`${this.apiUrl}/users/${id}/toggle-status`, {});
  }

  adminResetPassword(id: number, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${id}/reset-password`, { newPassword });
  }

  // Gestion des rôles
  getRoles(): Observable<RolesResponse> {
    return this.http.get<RolesResponse>(`${this.apiUrl}/roles`);
  }

  assignRole(assignData: AssignRoleRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/roles/assign`, assignData);
  }

  removeRole(removeData: AssignRoleRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/roles/remove`, removeData);
  }

  // Audit
  getUserAuditHistory(id: number, page: number = 1, limit: number = 20): Observable<AuditResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<AuditResponse>(`${this.apiUrl}/users/${id}/audit`, { params });
  }
}