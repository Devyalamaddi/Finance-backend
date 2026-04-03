import {
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionDescription,
} from "../src/services/permissions";
import { Permission } from "../src/types";

describe("Permissions service", () => {
  describe("getPermissionsForRole", () => {
    it("returns viewer permissions", () => {
      const perms = getPermissionsForRole("viewer");
      expect(perms).toContain("view_records");
      expect(perms).toContain("view_analytics");
      expect(perms).not.toContain("create_records");
    });

    it("returns analyst permissions", () => {
      const perms = getPermissionsForRole("analyst");
      expect(perms).toContain("view_records");
      expect(perms).toContain("create_records");
      expect(perms).toContain("update_own_records");
      expect(perms).toContain("view_analytics");
      expect(perms).toContain("export_records");
      expect(perms).not.toContain("manage_users");
    });

    it("returns admin permissions (all)", () => {
      const perms = getPermissionsForRole("admin");
      expect(perms).toContain("view_records");
      expect(perms).toContain("create_records");
      expect(perms).toContain("update_any_records");
      expect(perms).toContain("delete_records");
      expect(perms).toContain("manage_users");
      expect(perms).toContain("view_audit_logs");
    });
  });

  describe("hasPermission", () => {
    it("viewer cannot create records", () => {
      expect(hasPermission("viewer", "create_records")).toBe(false);
    });

    it("analyst can create records", () => {
      expect(hasPermission("analyst", "create_records")).toBe(true);
    });

    it("analyst cannot view audit logs", () => {
      expect(hasPermission("analyst", "view_audit_logs")).toBe(false);
    });

    it("admin has all permissions", () => {
      const allPermissions: Permission[] = [
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
      ];

      allPermissions.forEach((perm) => {
        expect(hasPermission("admin", perm)).toBe(true);
      });
    });
  });

  describe("hasAnyPermission", () => {
    it("viewer has any single permission from allowed set", () => {
      expect(hasAnyPermission("viewer", ["create_records", "view_records"])).toBe(true);
    });

    it("viewer lacks all permissions in set", () => {
      expect(hasAnyPermission("viewer", ["create_records", "delete_records"])).toBe(false);
    });

    it("analyst has at least one permission", () => {
      expect(hasAnyPermission("analyst", ["manage_users", "create_records"])).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("analyst lacks update_any_records permission", () => {
      expect(hasAllPermissions("analyst", ["create_records", "update_any_records"])).toBe(false);
    });

    it("analyst has both create and update_own", () => {
      expect(hasAllPermissions("analyst", ["create_records", "update_own_records"])).toBe(true);
    });

    it("admin has all permissions", () => {
      expect(
        hasAllPermissions("admin", [
          "create_records",
          "update_any_records",
          "manage_users",
          "view_audit_logs",
        ])
      ).toBe(true);
    });
  });

  describe("getPermissionDescription", () => {
    it("returns description for view_records", () => {
      const desc = getPermissionDescription("view_records");
      expect(desc).toBe("View financial records");
    });

    it("returns description for manage_users", () => {
      const desc = getPermissionDescription("manage_users");
      expect(desc).toBe("Create and manage users");
    });

    it("returns description for all permissions", () => {
      const permissions: Permission[] = [
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
      ];

      permissions.forEach((perm) => {
        const desc = getPermissionDescription(perm);
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(0);
      });
    });
  });
});
