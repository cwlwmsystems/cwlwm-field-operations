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

export type ManagedOrganizationUser = {
  membershipId: string;
  userId: string;
  email: string;
  role: OrganizationRole;
  isActive: boolean;
  createdAt: string;
  confirmedAt?: string;
  lastSignInAt?: string;
  teamIds: string[];
  representativeId?: string;
  representativeName?: string;
};

export function roleLabel(role: string) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

export function accessStatus(user: Pick<ManagedOrganizationUser, "isActive" | "confirmedAt">) {
  if (!user.isActive) return "inactive" as const;
  if (!user.confirmedAt) return "invited" as const;
  return "active" as const;
}
