export type RoleName = "viewer" | "analyst" | "admin";

export type Permission = 
  | "view_records"
  | "create_records"
  | "update_own_records"
  | "update_any_records"
  | "delete_records"
  | "view_analytics"
  | "export_records"
  | "manage_users"
  | "view_audit_logs"
  | "manage_roles";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT";

export interface JwtUser {
  id: string;
  email: string;
  role: RoleName;
  status: "active" | "inactive";
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changes_summary?: string;
  ip_address?: string;
  user_agent?: string;
  status: "success" | "failure";
  error_message?: string;
  timestamp: string;
}

export interface FinancialRecord {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: string;
  type: "income" | "expense";
  category: string;
  date: string;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
