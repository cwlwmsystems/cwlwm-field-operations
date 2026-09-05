export const organizationRoles = [
  "organization_owner",
  "organization_admin",
  "operations_manager",
  "team_manager",
  "representative",
  "analyst",
  "viewer",
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const ownerRoles: OrganizationRole[] = ["organization_owner"];
export const organizationAdminRoles: OrganizationRole[] = ["organization_owner", "organization_admin"];
export const operationsAdminRoles: OrganizationRole[] = [
  "organization_owner",
  "organization_admin",
  "operations_manager",
];
export const managerRoles: OrganizationRole[] = [
  "organization_owner",
  "organization_admin",
  "operations_manager",
  "team_manager",
];
export const fieldRoles: OrganizationRole[] = [
  "organization_owner",
  "organization_admin",
  "operations_manager",
  "team_manager",
  "representative",
];
export const reportingRoles: OrganizationRole[] = [
  "organization_owner",
  "organization_admin",
  "operations_manager",
  "team_manager",
  "analyst",
  "viewer",
];

export type PermissionKey =
  | "dashboard.view"
  | "dispatch.view"
  | "alerts.view"
  | "field.view"
  | "locations.manage"
  | "territories.manage"
  | "representatives.manage"
  | "sales.manage"
  | "scheduling.manage"
  | "lifecycle.view"
  | "finance.view"
  | "reports.view"
  | "configuration.manage"
  | "organization.manage"
  | "users.manage"
  | "security.view";

const permissions: Record<OrganizationRole, Set<PermissionKey>> = {
  organization_owner: new Set([
    "dashboard.view",
    "dispatch.view",
    "alerts.view",
    "field.view",
    "locations.manage",
    "territories.manage",
    "representatives.manage",
    "sales.manage",
    "scheduling.manage",
    "lifecycle.view",
    "finance.view",
    "reports.view",
    "configuration.manage",
    "organization.manage",
    "users.manage",
    "security.view",
  ]),
  organization_admin: new Set([
    "dashboard.view",
    "dispatch.view",
    "alerts.view",
    "field.view",
    "locations.manage",
    "territories.manage",
    "representatives.manage",
    "sales.manage",
    "scheduling.manage",
    "lifecycle.view",
    "finance.view",
    "reports.view",
    "configuration.manage",
    "organization.manage",
    "users.manage",
    "security.view",
  ]),
  operations_manager: new Set([
    "dashboard.view",
    "dispatch.view",
    "alerts.view",
    "field.view",
    "locations.manage",
    "territories.manage",
    "representatives.manage",
    "sales.manage",
    "scheduling.manage",
    "lifecycle.view",
    "finance.view",
    "reports.view",
    "configuration.manage",
    "security.view",
  ]),
  team_manager: new Set([
    "dashboard.view",
    "dispatch.view",
    "alerts.view",
    "field.view",
    "locations.manage",
    "territories.manage",
    "representatives.manage",
    "sales.manage",
    "scheduling.manage",
    "lifecycle.view",
    "reports.view",
  ]),
  representative: new Set([
    "dashboard.view",
    "field.view",
  ]),
  analyst: new Set([
    "dashboard.view",
    "lifecycle.view",
    "finance.view",
    "reports.view",
  ]),
  viewer: new Set([
    "dashboard.view",
    "lifecycle.view",
    "finance.view",
    "reports.view",
  ]),
};

export function isOrganizationRole(value?: string | null): value is OrganizationRole {
  return Boolean(value && (organizationRoles as readonly string[]).includes(value));
}

export function hasPermission(role: string | null | undefined, permission: PermissionKey) {
  if (!isOrganizationRole(role)) return false;
  return permissions[role].has(permission);
}

type RouteRule = {
  prefix: string;
  permission?: PermissionKey;
  roles?: OrganizationRole[];
};

const routeRules: RouteRule[] = [
  { prefix: "/admin/users", permission: "users.manage" },
  { prefix: "/admin/security", permission: "security.view" },
  { prefix: "/organizations", permission: "organization.manage" },
  { prefix: "/admin", permission: "configuration.manage" },
  { prefix: "/teams", permission: "configuration.manage" },
  { prefix: "/markets", permission: "configuration.manage" },

  { prefix: "/dispatch", permission: "dispatch.view" },
  { prefix: "/alerts", permission: "alerts.view" },
  { prefix: "/field", permission: "field.view" },
  { prefix: "/locations", permission: "locations.manage" },
  { prefix: "/territories", permission: "territories.manage" },
  { prefix: "/representatives", permission: "representatives.manage" },

  { prefix: "/sales", permission: "sales.manage" },
  { prefix: "/scheduling", permission: "scheduling.manage" },
  { prefix: "/lifecycle", permission: "lifecycle.view" },
  { prefix: "/finance", permission: "finance.view" },
  { prefix: "/reports", permission: "reports.view" },
  { prefix: "/dashboard", permission: "dashboard.view" },

  { prefix: "/connection", roles: [...organizationRoles] },
];

export function accessRuleForPath(pathname: string) {
  return routeRules
    .filter((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0] ?? null;
}

export function canAccessPath(role: string | null | undefined, pathname: string) {
  const rule = accessRuleForPath(pathname);
  if (!rule) return true;
  if (rule.permission) return hasPermission(role, rule.permission);
  if (rule.roles) return isOrganizationRole(role) && rule.roles.includes(role);
  return true;
}

export function roleLabel(role?: string | null) {
  if (!role) return "Member";
  return role.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export const roleDescriptions: Record<OrganizationRole, string> = {
  organization_owner: "Full tenant control, including organization settings, users, security, operations, finance, and configuration.",
  organization_admin: "Full administrative and operational control except owner-only protections.",
  operations_manager: "Runs operations, configuration, finance, sales, scheduling, territories, and reporting without organization/user administration.",
  team_manager: "Runs field teams, territories, sales, scheduling, dispatch, alerts, lifecycle, and reporting. No finance or tenant configuration.",
  representative: "Field-workspace access for assigned territory work and customer interactions.",
  analyst: "Read-oriented access to reporting, lifecycle, finance, and the command center.",
  viewer: "Read-oriented visibility into approved dashboards, reporting, lifecycle, and finance.",
};

export const permissionMatrix: Array<{
  label: string;
  permission: PermissionKey;
}> = [
  { label: "Command Center", permission: "dashboard.view" },
  { label: "Dispatch", permission: "dispatch.view" },
  { label: "Alerts", permission: "alerts.view" },
  { label: "Field Workspace", permission: "field.view" },
  { label: "Locations", permission: "locations.manage" },
  { label: "Territories", permission: "territories.manage" },
  { label: "Representatives", permission: "representatives.manage" },
  { label: "Sales", permission: "sales.manage" },
  { label: "Scheduling", permission: "scheduling.manage" },
  { label: "Lifecycle", permission: "lifecycle.view" },
  { label: "Finance", permission: "finance.view" },
  { label: "Reports", permission: "reports.view" },
  { label: "Configuration", permission: "configuration.manage" },
  { label: "Organization", permission: "organization.manage" },
  { label: "Users & Access", permission: "users.manage" },
  { label: "Security & Audit", permission: "security.view" },
];
