import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserManagementService } from '../../../services/user-management.service';
import { AuthService } from '../../../services/auth.service';
import { UserManagement, Role, CreateUserRequest, UpdateUserRequest } from '../../../models/user-management.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: UserManagement[] = [];
  roles: Role[] = [];
  
  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalUsers: number = 0;
  pageSize: number = 10;
  
  // Filtres
  searchQuery: string = '';
  selectedRole: string = '';
  selectedStatus: string = '';
  
  // Formulaires
  userForm: FormGroup;
  passwordResetForm: FormGroup;
  
  // États
  loading: boolean = false;
  showCreateForm: boolean = false;
  editingUser: UserManagement | null = null;
  showPasswordResetModal: boolean = false;
  resettingPasswordUser: UserManagement | null = null;
  showRoleModal: boolean = false;
  managingRolesUser: UserManagement | null = null;
  
  // Messages
  errorMessage: string | null = null;
  successMessage: string | null = null;
Math: any;

  constructor(
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.userForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      roleIds: [[]]
    });

    this.passwordResetForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = null;
    
    const isActive = this.selectedStatus === 'active' ? true : 
                    this.selectedStatus === 'inactive' ? false : undefined;

    this.userManagementService.getUsers(
      this.currentPage, 
      this.pageSize, 
      this.searchQuery || undefined, 
      this.selectedRole || undefined, 
      isActive
    ).subscribe({
      next: (response) => {
        this.users = response.users;
        this.totalUsers = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.errorMessage = 'Erreur lors du chargement des utilisateurs';
        this.loading = false;
      }
    });
  }

  loadRoles(): void {
    this.userManagementService.getRoles().subscribe({
      next: (response) => {
        this.roles = response.roles;
      },
      error: (err) => {
        console.error('Error loading roles:', err);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  // Gestion des utilisateurs
  showCreateUserForm(): void {
    this.showCreateForm = true;
    this.editingUser = null;
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.clearMessages();
  }

  editUser(user: UserManagement): void {
    this.editingUser = user;
    this.showCreateForm = true;
    this.userForm.patchValue({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleIds: user.roles.map(role => role.id)
    });
    // Retirer la validation obligatoire du mot de passe pour la modification
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.clearMessages();
  }

  onUserSubmit(): void {
    if (this.userForm.valid) {
      const formData = this.userForm.value;
      
      if (this.editingUser) {
        // Mise à jour
        const updateData: UpdateUserRequest = {
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        };
        
        if (formData.password) {
          updateData.password = formData.password;
        }

        this.userManagementService.updateUser(this.editingUser.id, updateData).subscribe({
          next: (response) => {
            this.successMessage = response.message;
            this.loadUsers();
            this.cancelUserForm();
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour';
          }
        });
      } else {
        // Création
        const createData: CreateUserRequest = {
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          roleIds: formData.roleIds
        };

        this.userManagementService.createUser(createData).subscribe({
          next: (response) => {
            this.successMessage = response.message;
            this.loadUsers();
            this.cancelUserForm();
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Erreur lors de la création';
          }
        });
      }
    }
  }

  cancelUserForm(): void {
    this.showCreateForm = false;
    this.editingUser = null;
    this.userForm.reset();
    this.clearMessages();
  }

  deleteUser(user: UserManagement, permanent: boolean = false): void {
    const action = permanent ? 'supprimer définitivement' : 'désactiver';
    const confirmMessage = `Êtes-vous sûr de vouloir ${action} l'utilisateur "${user.username}" ?`;
    
    if (window.confirm(confirmMessage)) {
      this.userManagementService.deleteUser(user.id, !permanent).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || `Erreur lors de la ${action}`;
        }
      });
    }
  }

  toggleUserStatus(user: UserManagement): void {
    const action = user.isActive ? 'désactiver' : 'activer';
    
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} l'utilisateur "${user.username}" ?`)) {
      this.userManagementService.toggleUserStatus(user.id).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || `Erreur lors de l'${action}`;
        }
      });
    }
  }

  // Gestion des rôles
  showRoleManagement(user: UserManagement): void {
    this.managingRolesUser = user;
    this.showRoleModal = true;
    this.clearMessages();
  }

  assignRole(roleId: number): void {
    if (!this.managingRolesUser) return;

    this.userManagementService.assignRole({
      userId: this.managingRolesUser.id,
      roleId: roleId
    }).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadUsers();
        this.closeRoleModal();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'attribution du rôle';
      }
    });
  }

  removeRole(roleId: number): void {
    if (!this.managingRolesUser) return;

    const role = this.roles.find(r => r.id === roleId);
    if (window.confirm(`Retirer le rôle "${role?.name}" de ${this.managingRolesUser.username} ?`)) {
      this.userManagementService.removeRole({
        userId: this.managingRolesUser.id,
        roleId: roleId
      }).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          this.loadUsers();
          this.closeRoleModal();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors du retrait du rôle';
        }
      });
    }
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.managingRolesUser = null;
  }

  // Réinitialisation de mot de passe
  showPasswordReset(user: UserManagement): void {
    this.resettingPasswordUser = user;
    this.showPasswordResetModal = true;
    this.passwordResetForm.reset();
    this.clearMessages();
  }

  onPasswordResetSubmit(): void {
    if (this.passwordResetForm.valid && this.resettingPasswordUser) {
      const newPassword = this.passwordResetForm.value.newPassword;
      
      this.userManagementService.adminResetPassword(this.resettingPasswordUser.id, newPassword).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          this.closePasswordResetModal();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la réinitialisation';
        }
      });
    }
  }

  closePasswordResetModal(): void {
    this.showPasswordResetModal = false;
    this.resettingPasswordUser = null;
    this.passwordResetForm.reset();
  }

  // Utilitaires
  getUserRoleNames(user: UserManagement): string {
    return user.roles.map(role => role.name).join(', ') || 'Aucun rôle';
  }

  hasRole(user: UserManagement, roleName: string): boolean {
    return user.roles.some(role => role.name === roleName);
  }

  getAvailableRoles(user: UserManagement): Role[] {
    const userRoleIds = user.roles.map(role => role.id);
    return this.roles.filter(role => !userRoleIds.includes(role.id) && role.is_active);
  }

  onRoleCheckboxChange(event: any, roleId: number): void {
    const roleIds = this.userForm.get('roleIds')?.value || [];
    
    if (event.target.checked) {
      if (!roleIds.includes(roleId)) {
        roleIds.push(roleId);
      }
    } else {
      const index = roleIds.indexOf(roleId);
      if (index > -1) {
        roleIds.splice(index, 1);
      }
    }
    
    this.userForm.patchValue({ roleIds });
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  // Vérification des permissions
  get canManageUsers(): boolean {
    return this.authService.isAdmin;
  }

  get currentUserId(): number | null {
    return this.authService.currentUser?.id || null;
  }
  getEndIndex(): number {
  return Math.min(this.currentPage * this.pageSize, this.totalUsers);
}
}