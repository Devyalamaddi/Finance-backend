import { JwtUser } from "../types";

export function addRecordScopeForNonAdmin(where: string[], values: unknown[], user: JwtUser): void {
  if (user.role !== "admin") {
    values.push(user.id);
    where.push(`user_id = $${values.length}`);
  }
}

export function addRecordOwnershipScope(where: string[], values: unknown[], user: JwtUser): void {
  values.push(user.id);
  where.push(`user_id = $${values.length}`);
}
