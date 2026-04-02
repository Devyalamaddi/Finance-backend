export type RoleName = "viewer" | "analyst" | "admin";

export interface JwtUser {
  id: string;
  email: string;
  role: RoleName;
  status: "active" | "inactive";
}
