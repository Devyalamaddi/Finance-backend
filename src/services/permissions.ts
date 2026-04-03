import { RoleName, Permission } from "../types";

const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  viewer: [
    "view_records",
    "view_analytics",
  ],
  analyst: [
    "view_records",
    "create_records",
    "update_own_records",
    "view_analytics",
    "export_records",
  ],
  admin: [
    "view_records",
    "create_records",
    "update_own_records",
    "update_any_records",
    "delete_records",
    "view_analytics",
    "export_records",
    "manage_users",
    "view_audit_logs",
    "manage_roles",
  ],
};

//Get all permissions for a role.
//USP: Permission layer enables fine-grained RBAC.
export function getPermissionsForRole(role: RoleName): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

//Check if a user has a specific permission.
export function hasPermission(role: RoleName, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

//Check if a user has any of the specified permissions.
export function hasAnyPermission(role: RoleName, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.some((perm) => rolePermissions.includes(perm));
}

//Check if a user has all of the specified permissions.
export function hasAllPermissions(role: RoleName, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.every((perm) => rolePermissions.includes(perm));
}

//Get permission description for UI/docs purposes.
export function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<Permission, string> = {
    view_records: "View financial records",
    create_records: "Create new financial records",
    update_own_records: "Update own financial records",
    update_any_records: "Update any financial record",
    delete_records: "Delete financial records (soft delete)",
    view_analytics: "View dashboard analytics and insights",
    export_records: "Export financial records",
    manage_users: "Create and manage users",
    view_audit_logs: "View system audit logs",
    manage_roles: "Manage roles and permissions",
  };
  return descriptions[permission] || permission;
}
