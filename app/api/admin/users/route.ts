import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { organizationRoles, type OrganizationRole } from "@/lib/admin/userManagement";

export const runtime = "nodejs";

const adminRoles = new Set(["organization_owner", "organization_admin"]);

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.APP_URL;
  if (!url || !anon || !service || !appUrl) {
    throw new Error("User management requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, server-only SUPABASE_SERVICE_ROLE_KEY, and APP_URL.");
  }

  const parsedAppUrl = new URL(appUrl);
  if (parsedAppUrl.protocol !== "https:" && parsedAppUrl.protocol !== "http:") {
    throw new Error("APP_URL must use http or https.");
  }

  return { url, anon, service, appUrl: parsedAppUrl.origin };
}

async function context(request: NextRequest) {
  const { url, anon, service } = env();
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new ApiError("Missing authenticated session.", 401);

  const verifier = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await verifier.auth.getUser(token);
  if (authError || !authData.user) throw new ApiError("Session verification failed.", 401);

  const admin = createClient<any>(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .select("id,organization_id,role,is_active")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership || !adminRoles.has(membership.role)) {
    throw new ApiError("Organization owner or administrator access is required.", 403);
  }

  return { admin, actor: authData.user, membership };
}

async function jsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Invalid JSON request body.", 400);
  }
}

function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Admin users API error:", error);
  return NextResponse.json({ error: "User management request failed." }, { status: 500 });
}

async function listAuthUsers(admin: SupabaseClient<any>) {
  const users: User[] = [];
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return users;
}

async function syncTeams(admin: SupabaseClient<any>, organizationId: string, userId: string, teamIds: string[]) {
  const unique = Array.from(new Set(teamIds.filter(Boolean)));
  const { error: deleteError } = await admin
    .from("team_memberships")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (unique.length) {
    const { data: allowedTeams, error: teamError } = await admin
      .from("teams")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", unique);
    if (teamError) throw teamError;
    const valid = new Set(
      ((allowedTeams ?? []) as Array<{ id: string }>).map((row) => row.id)
    );
    if (valid.size !== unique.length) throw new ApiError("One or more selected teams are invalid for this organization.", 400);

    const { error: insertError } = await admin.from("team_memberships").insert(
      unique.map((teamId) => ({ organization_id: organizationId, team_id: teamId, user_id: userId, team_role: "member" }))
    );
    if (insertError) throw insertError;
  }
}

async function ensureRepresentativeAccount(
  admin: SupabaseClient<any>,
  organizationId: string,
  userId: string,
  email: string,
  representativeId?: string | null
) {
  if (representativeId) {
    await syncRepresentative(admin, organizationId, userId, representativeId);
    return representativeId;
  }

  const { data: linked } = await admin
    .from("representatives")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (linked?.id) return linked.id;

  const { data: matching } = await admin
    .from("representatives")
    .select("id,user_id")
    .eq("organization_id", organizationId)
    .ilike("email", email)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (matching?.id) {
    if (matching.user_id && matching.user_id !== userId) {
      throw new ApiError("A representative profile with this email is already linked to another login.", 409);
    }
    const { error } = await admin
      .from("representatives")
      .update({ user_id: userId })
      .eq("id", matching.id);
    if (error) throw error;
    return matching.id;
  }

  const localPart = email.split("@")[0] || "Representative";
  const fullName = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const { data: created, error } = await admin
    .from("representatives")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      full_name: fullName || "Representative",
      email,
      status: "active",
      metadata: { auto_created_from_user_account: true },
    })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("Unable to create representative profile.");
  return created.id;
}

async function syncRepresentative(admin: SupabaseClient<any>, organizationId: string, userId: string, representativeId?: string | null) {
  await admin.from("representatives").update({ user_id: null }).eq("organization_id", organizationId).eq("user_id", userId);
  if (!representativeId) return;
  const { data: rep, error } = await admin
    .from("representatives")
    .select("id,user_id")
    .eq("organization_id", organizationId)
    .eq("id", representativeId)
    .single();
  if (error) throw error;
  if (!rep) throw new ApiError("Selected representative was not found.", 404);
  if (rep.user_id && rep.user_id !== userId) throw new ApiError("That representative is already linked to another login.", 409);
  const { error: updateError } = await admin.from("representatives").update({ user_id: userId }).eq("id", representativeId);
  if (updateError) throw updateError;
}

async function ensureOwnerSafety(admin: SupabaseClient<any>, organizationId: string, targetUserId: string, nextRole: string, nextActive: boolean) {
  const { data: target, error } = await admin
    .from("organization_memberships")
    .select("role,is_active")
    .eq("organization_id", organizationId)
    .eq("user_id", targetUserId)
    .single();
  if (error) throw error;
  if (!target) throw new ApiError("Membership not found.", 404);

  if (target.role === "organization_owner" && target.is_active && (nextRole !== "organization_owner" || !nextActive)) {
    const { count, error: countError } = await admin
      .from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "organization_owner")
      .eq("is_active", true);
    if (countError) throw countError;
    if ((count ?? 0) <= 1) throw new ApiError("The last active organization owner cannot be deactivated or demoted.", 409);
  }
}


async function writeSecurityAudit(
  admin: any,
  organizationId: string,
  actorUserId: string,
  action: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    await admin.from("audit_log").insert({
      organization_id: organizationId,
      actor_user_id: actorUserId,
      action,
      entity_type: "organization_user",
      entity_id: entityId,
      metadata,
    });
  } catch {
    // Security logging should not block the primary admin action.
  }
}

export async function GET(request: NextRequest) {
  try {
    const { admin, membership } = await context(request);
    const organizationId = membership.organization_id;
    const [{ data: memberships, error: membershipError }, { data: teamMemberships, error: teamError }, { data: reps, error: repError }, authUsers] = await Promise.all([
      admin.from("organization_memberships").select("id,user_id,role,is_active,created_at").eq("organization_id", organizationId).order("created_at"),
      admin.from("team_memberships").select("user_id,team_id").eq("organization_id", organizationId),
      admin.from("representatives").select("id,user_id,full_name,email").eq("organization_id", organizationId),
      listAuthUsers(admin),
    ]);
    if (membershipError) throw membershipError;
    if (teamError) throw teamError;
    if (repError) throw repError;

    const authMap = new Map(authUsers.map((user) => [user.id, user]));
    const teamsByUser = new Map<string, string[]>();
    for (const row of teamMemberships ?? []) teamsByUser.set(row.user_id, [...(teamsByUser.get(row.user_id) ?? []), row.team_id]);
    const repByUser = new Map((reps ?? []).filter((rep) => rep.user_id).map((rep) => [rep.user_id as string, rep]));

    const users = (memberships ?? []).map((row) => {
      const auth = authMap.get(row.user_id);
      const rep = repByUser.get(row.user_id);
      return {
        membershipId: row.id,
        userId: row.user_id,
        email: auth?.email ?? rep?.email ?? "Unknown email",
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
        confirmedAt: auth?.confirmed_at ?? undefined,
        lastSignInAt: auth?.last_sign_in_at ?? undefined,
        teamIds: teamsByUser.get(row.user_id) ?? [],
        representativeId: rep?.id ?? undefined,
        representativeName: rep?.full_name ?? undefined,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor, membership } = await context(request);
    const body = await jsonBody(request);
    const action = String(body.action ?? "invite");

    if (action === "create_manual") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const role = String(body.role ?? "viewer");
      const teamIds = Array.isArray(body.teamIds) ? body.teamIds.map(String) : [];
      const representativeId = body.representativeId ? String(body.representativeId) : null;

      if (!email) throw new ApiError("Email is required.", 400);
      if (password.length < 10) throw new ApiError("Temporary password must be at least 10 characters.", 400);

      const allowedRoles = new Set([
        "organization_owner",
        "organization_admin",
        "operations_manager",
        "team_manager",
        "representative",
        "analyst",
        "viewer",
      ]);
      if (!allowedRoles.has(role)) throw new ApiError("Invalid organization role.", 400);

      if (role === "organization_owner" && membership.role !== "organization_owner") {
        throw new ApiError("Only an organization owner can create another owner.", 403);
      }

      const organizationId = membership.organization_id;

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;
      const userId = created.user?.id;
      if (!userId) throw new Error("Supabase did not return a user id.");

      const { error: membershipError } = await admin
        .from("organization_memberships")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role,
          is_active: true,
        });
      if (membershipError) {
        await admin.auth.admin.deleteUser(userId);
        throw membershipError;
      }

      try {
        await syncTeams(admin, organizationId, userId, teamIds);
        if (role === "representative") {
          await ensureRepresentativeAccount(admin, organizationId, userId, email, representativeId);
        } else {
          await syncRepresentative(admin, organizationId, userId, representativeId);
        }
      } catch (syncError) {
        await admin
          .from("organization_memberships")
          .delete()
          .eq("organization_id", organizationId)
          .eq("user_id", userId);
        await admin.auth.admin.deleteUser(userId);
        throw syncError;
      }

      await writeSecurityAudit(
        admin,
        organizationId,
        actor.id,
        "user_created_manually",
        userId,
        { email, role, teamIds, representativeId }
      );

      return NextResponse.json({
        ok: true,
        userId,
        email,
        manualCreated: true,
      });
    }

    if (action === "set_password_manual") {
      const userId = String(body.userId ?? "");
      const password = String(body.password ?? "");

      if (!userId) throw new ApiError("User id is required.", 400);
      if (password.length < 10) throw new ApiError("Password must be at least 10 characters.", 400);

      const organizationId = membership.organization_id;
      const { data: targetMembership, error: membershipError } = await admin
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!targetMembership) {
        throw new ApiError("That user is not a member of this organization.", 404);
      }

      const { error: updatePasswordError } = await admin.auth.admin.updateUserById(userId, {
        password,
      });
      if (updatePasswordError) throw updatePasswordError;

      await writeSecurityAudit(
        admin,
        organizationId,
        actor.id,
        "password_set_manually",
        userId
      );

      return NextResponse.json({ ok: true, passwordUpdated: true });
    }

    if (action === "send_password_setup") {
      const userId = String(body.userId ?? "");
      if (!userId) throw new ApiError("User id is required.", 400);

      const organizationId = membership.organization_id;
      const { data: targetMembership, error: targetMembershipError } = await admin
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (targetMembershipError) throw targetMembershipError;
      if (!targetMembership) {
        throw new ApiError("That user is not a member of this organization.", 404);
      }

      const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
      if (userError) throw userError;
      if (!userData.user?.email) {
        throw new ApiError("Unable to find an email address for that user.", 404);
      }

      const { appUrl } = env();
      const { error: recoveryError } = await admin.auth.resetPasswordForEmail(
        userData.user.email,
        { redirectTo: `${appUrl}/auth/confirm` }
      );
      if (recoveryError) throw recoveryError;

      return NextResponse.json({ ok: true, setupEmailSent: true, email: userData.user.email });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "viewer") as OrganizationRole;
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds.map(String) : [];
    const representativeId = body.representativeId ? String(body.representativeId) : null;

    if (!email || !email.includes("@")) throw new ApiError("A valid email address is required.", 400);
    if (!organizationRoles.includes(role)) throw new ApiError("Invalid organization role.", 400);
    if (role === "organization_owner" && membership.role !== "organization_owner") throw new ApiError("Only an organization owner can invite another owner.", 403);

    const organizationId = membership.organization_id;
    const authUsers = await listAuthUsers(admin);
    let authUser = authUsers.find((user) => user.email?.toLowerCase() === email);
    let invited = false;

    if (!authUser) {
      const { appUrl } = env();
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/confirm`,
        data: { invited_to_organization: organizationId, invited_by: actor.id },
      });
      if (error) throw error;
      authUser = data.user;
      invited = true;
    }

    const { error: membershipError } = await admin.from("organization_memberships").upsert(
      { organization_id: organizationId, user_id: authUser.id, role, is_active: true, updated_at: new Date().toISOString() },
      { onConflict: "organization_id,user_id" }
    );
    if (membershipError) throw membershipError;

    await syncTeams(admin, organizationId, authUser.id, teamIds);
    await syncRepresentative(admin, organizationId, authUser.id, representativeId);

    return NextResponse.json({ ok: true, invited, userId: authUser.id });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { admin, actor, membership } = await context(request);
    const body = await jsonBody(request);
    const userId = String(body.userId ?? "");
    const role = String(body.role ?? "viewer") as OrganizationRole;
    const isActive = body.isActive !== false;
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds.map(String) : [];
    const representativeId = body.representativeId ? String(body.representativeId) : null;

    if (!userId) throw new ApiError("User id is required.", 400);
    if (!organizationRoles.includes(role)) throw new ApiError("Invalid organization role.", 400);

    const organizationId = membership.organization_id;
    const { data: target, error: targetError } = await admin
      .from("organization_memberships")
      .select("role,is_active")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();
    if (targetError) throw targetError;
    if (!target) throw new ApiError("Membership not found.", 404);

    if ((target.role === "organization_owner" || role === "organization_owner") && membership.role !== "organization_owner") {
      throw new ApiError("Only an organization owner can modify owner access.", 403);
    }
    if (userId === actor.id && !isActive) throw new ApiError("You cannot deactivate your own membership.", 409);

    await ensureOwnerSafety(admin, organizationId, userId, role, isActive);

    const { error: updateError } = await admin
      .from("organization_memberships")
      .update({ role, is_active: isActive, updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    if (updateError) throw updateError;

    await syncTeams(admin, organizationId, userId, teamIds);
    await syncRepresentative(admin, organizationId, userId, representativeId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
