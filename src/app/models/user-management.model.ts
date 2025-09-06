export interface UserManagement {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  last_login_ip?: string;
  login_attempts: number;
  locked_until?: string;
  roles: UserRole[];
  createdSkills?: any[];
  createdJobDescriptions?: any[];
  createdEmployees?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  UserRole?: {
    assigned_at: string;
  };
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  users?: UserManagement[];
  userCount?: number;
}

export interface CreateUserRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleIds?: number[];
}

export interface UpdateUserRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
}

export interface AssignRoleRequest {
  userId: number;
  roleId: number;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLE_ASSIGN' | 'ROLE_REMOVE' | 'ACTIVATE' | 'DEACTIVATE';
  table_name: string;
  record_id?: number;
  old_values?: any;
  new_values?: any;
  modified_by: number;
  modifier?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  ip_address?: string;
  user_agent?: string;
  createdAt: string;
}

export interface UsersResponse {
  users: UserManagement[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RolesResponse {
  roles: Role[];
}

export interface AuditResponse {
  auditLogs: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}