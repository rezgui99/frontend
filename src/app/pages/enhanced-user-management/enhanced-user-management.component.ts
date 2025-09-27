import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserManagementService } from '../../services/user-management.service';
import { AuthService } from '../../services/auth.service';
import { UserManagement, Role, CreateUserRequest, UpdateUserRequest } from '../../models/user-management.model';
import { TooltipDirective } from '../../components/tooltip/tooltip.directive';

@Component({
  selector: 'app-enhanced-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TooltipDirective],
  templateUrl: './enhanced-user-management.component.html',
  styleUrls: ['./enhanced-user-management.component.css']
})
export class EnhancedUserManagementComponent implements OnInit {
  users: UserManagement[] = [];
  roles: Role[] = [];
  
  // Pagination et filtres
  currentPage: number = 1;
  totalPages: number = 1;
  totalUsers: number = 0;
  pageSize: number = 10;
  searchQuery: string = '';
  selectedRole: string = '';
  selectedStatus: string = '';
  
  // Formulaires
  userForm: FormGroup;
  bulkActionForm: FormGroup;
  
  // États
  loading: boolean = false;
  showCreateForm: boolean = false;
  showBulkActions: boolean = false;
  editingUser: UserManagement | null = null;
  selectedUsers: Set<number> = new Set();
  
  // Modals pour les actions individuelles
  showPasswordResetModal: boolean = false;
  showRoleManagementModal: boolean = false;
  resettingPasswordUser: UserManagement | null = null;
  managingRolesUser: UserManagement | null = null;
  passwordResetForm: FormGroup;
  
  // Messages et notifications
  errorMessage: string | null = null;
  successMessage: string | null = null;
  notifications: Array<{id: number, type: 'success' | 'error' | 'info', message: string}> = [];

  // Statistiques
  userStats = {
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    hrs: 0,
    recentLogins: 0
  };
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
      roleIds: [[]],
      sendWelcomeEmail: [true]
    });

    this.bulkActionForm = this.formBuilder.group({
      action: ['', Validators.required],
      roleId: [''],
      reason: ['']
    });

    this.passwordResetForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.calculateUserStats();
  }

  // Gestion des notifications
  addNotification(type: 'success' | 'error' | 'info', message: string): void {
    const id = Date.now();
    this.notifications.push({ id, type, message });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(id);
    }, 5000);
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  // Statistiques utilisateurs
  calculateUserStats(): void {
    this.userStats = {
      total: this.users.length,
      active: this.users.filter(u => u.isActive).length,
      inactive: this.users.filter(u => !u.isActive).length,
      admins: this.users.filter(u => u.roles.some(r => r.name === 'admin')).length,
      hrs: this.users.filter(u => u.roles.some(r => r.name === 'hr')).length,
      recentLogins: this.users.filter(u => {
        if (!u.lastLogin) return false;
        const lastLogin = new Date(u.lastLogin);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return lastLogin > weekAgo;
      }).length
    };
  }

  // Sélection multiple
  toggleUserSelection(userId: number): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  selectAllUsers(): void {
    if (this.selectedUsers.size === this.users.length) {
      this.selectedUsers.clear();
    } else {
      this.users.forEach(user => this.selectedUsers.add(user.id));
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsers.has(userId);
  }

  get allUsersSelected(): boolean {
    return this.users.length > 0 && this.selectedUsers.size === this.users.length;
  }

  get someUsersSelected(): boolean {
    return this.selectedUsers.size > 0 && this.selectedUsers.size < this.users.length;
  }

  // Actions en lot
  performBulkAction(): void {
    if (this.bulkActionForm.valid && this.selectedUsers.size > 0) {
      const action = this.bulkActionForm.get('action')?.value;
      const selectedUserIds = Array.from(this.selectedUsers);
      
      const confirmMessage = `Êtes-vous sûr de vouloir ${action} ${selectedUserIds.length} utilisateur(s) ?`;
      
      if (window.confirm(confirmMessage)) {
        switch (action) {
          case 'activate':
            this.bulkActivateUsers(selectedUserIds);
            break;
          case 'deactivate':
            this.bulkDeactivateUsers(selectedUserIds);
            break;
          case 'assign_role':
            this.bulkAssignRole(selectedUserIds);
            break;
          case 'remove_role':
            this.bulkRemoveRole(selectedUserIds);
            break;
          case 'delete':
            this.bulkDeleteUsers(selectedUserIds);
            break;
        }
      }
    }
  }

  private bulkActivateUsers(userIds: number[]): void {
    const promises = userIds.map(id => 
      this.userManagementService.toggleUserStatus(id).toPromise()
    );

    Promise.all(promises).then(() => {
      this.addNotification('success', `${userIds.length} utilisateur(s) activé(s) avec succès`);
      this.loadUsers();
      this.selectedUsers.clear();
    }).catch(err => {
      this.addNotification('error', 'Erreur lors de l\'activation en lot');
    });
  }

  private bulkDeactivateUsers(userIds: number[]): void {
    const promises = userIds.map(id => 
      this.userManagementService.toggleUserStatus(id).toPromise()
    );

    Promise.all(promises).then(() => {
      this.addNotification('success', `${userIds.length} utilisateur(s) désactivé(s) avec succès`);
      this.loadUsers();
      this.selectedUsers.clear();
    }).catch(err => {
      this.addNotification('error', 'Erreur lors de la désactivation en lot');
    });
  }

  private bulkAssignRole(userIds: number[]): void {
    const roleId = this.bulkActionForm.get('roleId')?.value;
    if (!roleId) {
      this.addNotification('error', 'Veuillez sélectionner un rôle');
      return;
    }

    const promises = userIds.map(userId => 
      this.userManagementService.assignRole({ userId, roleId }).toPromise()
    );

    Promise.all(promises).then(() => {
      this.addNotification('success', `Rôle assigné à ${userIds.length} utilisateur(s)`);
      this.loadUsers();
      this.selectedUsers.clear();
    }).catch(err => {
      this.addNotification('error', 'Erreur lors de l\'assignation de rôle en lot');
    });
  }

  private bulkRemoveRole(userIds: number[]): void {
    const roleId = this.bulkActionForm.get('roleId')?.value;
    if (!roleId) {
      this.addNotification('error', 'Veuillez sélectionner un rôle');
      return;
    }

    const promises = userIds.map(userId => 
      this.userManagementService.removeRole({ userId, roleId }).toPromise()
    );

    Promise.all(promises).then(() => {
      this.addNotification('success', `Rôle retiré de ${userIds.length} utilisateur(s)`);
      this.loadUsers();
      this.selectedUsers.clear();
    }).catch(err => {
      this.addNotification('error', 'Erreur lors du retrait de rôle en lot');
    });
  }

  private bulkDeleteUsers(userIds: number[]): void {
    const promises = userIds.map(id => 
      this.userManagementService.deleteUser(id, true).toPromise()
    );

    Promise.all(promises).then(() => {
      this.addNotification('success', `${userIds.length} utilisateur(s) supprimé(s) avec succès`);
      this.loadUsers();
      this.selectedUsers.clear();
    }).catch(err => {
      this.addNotification('error', 'Erreur lors de la suppression en lot');
    });
  }

  // Export des données
  exportUsers(): void {
    const csvData = this.generateCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCSV(): string {
    const headers = ['ID', 'Username', 'Prénom', 'Nom', 'Email', 'Statut', 'Rôles', 'Dernière connexion'];
    const rows = this.users.map(user => [
      user.id,
      user.username,
      user.firstName,
      user.lastName,
      user.email,
      user.isActive ? 'Actif' : 'Inactif',
      user.roles.map(r => r.name).join('; '),
      user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Jamais'
    ]);

    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  }

  // Méthodes héritées du composant original
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
        this.calculateUserStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.addNotification('error', 'Erreur lors du chargement des utilisateurs');
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
        this.addNotification('error', 'Erreur lors du chargement des rôles');
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

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

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
      roleIds: user.roles.map(role => role.id),
      sendWelcomeEmail: false
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.clearMessages();
  }

  onUserSubmit(): void {
    if (this.userForm.valid) {
      const formData = this.userForm.value;
      
      if (this.editingUser) {
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
            this.addNotification('success', response.message);
            this.loadUsers();
            this.cancelUserForm();
          },
          error: (err) => {
            this.addNotification('error', err.error?.message || 'Erreur lors de la mise à jour');
          }
        });
      } else {
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
            this.addNotification('success', response.message);
            this.loadUsers();
            this.cancelUserForm();
          },
          error: (err) => {
            this.addNotification('error', err.error?.message || 'Erreur lors de la création');
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
          this.addNotification('success', response.message);
          this.loadUsers();
        },
        error: (err) => {
          this.addNotification('error', err.error?.message || `Erreur lors de la ${action}`);
        }
      });
    }
  }

  toggleUserStatus(user: UserManagement): void {
    const action = user.isActive ? 'désactiver' : 'activer';
    
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} l'utilisateur "${user.username}" ?`)) {
      this.userManagementService.toggleUserStatus(user.id).subscribe({
        next: (response) => {
          this.addNotification('success', response.message);
          this.loadUsers();
        },
        error: (err) => {
          this.addNotification('error', err.error?.message || `Erreur lors de l'${action}`);
        }
      });
    }
  }

  // Utilitaires
  getUserRoleNames(user: UserManagement): string {
    return user.roles.map(role => role.name).join(', ') || 'Aucun rôle';
  }

  getRoleBadgeClass(roleName: string): string {
    const classes: { [key: string]: string } = {
      'admin': 'bg-red-100 text-red-800',
      'hr': 'bg-blue-100 text-blue-800'
    };
    return classes[roleName] || 'bg-blue-100 text-blue-800';
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  formatLastLogin(lastLogin: string | undefined): string {
    if (!lastLogin) return 'Jamais';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 168) return `Il y a ${Math.floor(diffInHours / 24)}j`;
    
    return date.toLocaleDateString();
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  get canManageUsers(): boolean {
    return this.authService.hasRole('admin');
  }

  get currentUserId(): number | null {
    return this.authService.currentUser?.id || null;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
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

  // ==================== RÉINITIALISATION MOT DE PASSE ====================

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
          this.addNotification('success', `Mot de passe réinitialisé pour ${this.resettingPasswordUser!.username}`);
          this.closePasswordResetModal();
        },
        error: (err) => {
          this.addNotification('error', err.error?.message || 'Erreur lors de la réinitialisation');
        }
      });
    }
  }

  closePasswordResetModal(): void {
    this.showPasswordResetModal = false;
    this.resettingPasswordUser = null;
    this.passwordResetForm.reset();
  }

  // ==================== GESTION DES RÔLES ====================

  showRoleManagement(user: UserManagement): void {
    this.managingRolesUser = user;
    this.showRoleManagementModal = true;
    this.clearMessages();
  }

  assignRole(roleId: number): void {
    if (!this.managingRolesUser) return;

    const role = this.roles.find(r => r.id === roleId);
    const confirmMessage = `Attribuer le rôle "${role?.name}" à ${this.managingRolesUser.username} ?`;
    
    if (window.confirm(confirmMessage)) {
      this.userManagementService.assignRole({
        userId: this.managingRolesUser.id,
        roleId: roleId
      }).subscribe({
        next: (response) => {
          this.addNotification('success', response.message);
          this.loadUsers();
          // Mettre à jour l'utilisateur dans le modal
          this.managingRolesUser = this.users.find(u => u.id === this.managingRolesUser!.id) || null;
        },
        error: (err) => {
          this.addNotification('error', err.error?.message || 'Erreur lors de l\'attribution du rôle');
        }
      });
    }
  }

  removeRole(roleId: number): void {
    if (!this.managingRolesUser) return;

    const role = this.roles.find(r => r.id === roleId);
    const confirmMessage = `Retirer le rôle "${role?.name}" de ${this.managingRolesUser.username} ?`;
    
    if (window.confirm(confirmMessage)) {
      this.userManagementService.removeRole({
        userId: this.managingRolesUser.id,
        roleId: roleId
      }).subscribe({
        next: (response) => {
          this.addNotification('success', response.message);
          this.loadUsers();
          // Mettre à jour l'utilisateur dans le modal
          this.managingRolesUser = this.users.find(u => u.id === this.managingRolesUser!.id) || null;
        },
        error: (err) => {
          this.addNotification('error', err.error?.message || 'Erreur lors du retrait du rôle');
        }
      });
    }
  }

  closeRoleManagementModal(): void {
    this.showRoleManagementModal = false;
    this.managingRolesUser = null;
  }

  getAvailableRoles(user: UserManagement): Role[] {
    const userRoleIds = user.roles.map(role => role.id);
    return this.roles.filter(role => !userRoleIds.includes(role.id) && role.is_active);
  }

  hasRole(user: UserManagement, roleName: string): boolean {
    return user.roles.some(role => role.name === roleName);
  }
}