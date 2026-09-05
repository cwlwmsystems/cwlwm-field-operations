import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { organizationRoles, type OrganizationRole } from "@/lib/admin/userManagement";

export const runtime = "nodejs";

const adminRoles = new Set(["organization_owner", "organization_admin"]);

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error("User management requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and server-only SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url, anon, service };
}

async function context(request: NextRequest) {
  const { url, anon, service } = env();
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Missing authenticated session.");

  const verifier = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await verifier.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Session verification failed.");

  const admin = createClient<any>(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .select("id,organization_id,role,is_active")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership || !adminRoles.has(membership.role)) {
    throw new Error("Organization owner or administrator access is required.");
  }

  return { admin, actor: authData.user, membership };
}

function jsonError(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status });
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
    if (valid.size !== unique.length) throw new Error("One or more selected teams are invalid for this organization.");

    const { error: insertError } = await admin.from("team_memberships").insert(
      unique.map((teamId) => ({ organization_id: organizationId, team_id: teamId, user_id: userId, team_role: "member" }))
    );
    if (insertError) throw insertError;
  }
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
  if (error || !rep) throw new Error("Selected representative was not found.");
  if (rep.user_id && rep.user_id !== userId) throw new Error("That representative is already linked to another login.");
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
  if (error || !target) throw new Error("Membership not found.");

  if (target.role === "organization_owner" && target.is_active && (nextRole !== "organization_owner" || !nextActive)) {
    const { count, error: countError } = await admin
      .from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "organization_owner")
      .eq("is_active", true);
    if (countError) throw countError;
    if ((count ?? 0) <= 1) throw new Error("The last active organization owner cannot be deactivated or demoted.");
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
    return jsonError(error, 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor, membership } = await context(request);
    const body = await request.json();
    const action = String(body.action ?? "invite");

    if (action === "create_manual") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const role = String(body.role ?? "viewer");
      const teamIds = Array.isArray(body.teamIds) ? body.teamIds.map(String) : [];
      const representativeId = body.representativeId ? String(body.representativeId) : null;

      if (!email) throw new Error("Email is required.");
      if (password.length < 10) throw new Error("Temporary password must be at least 10 characters.");

      const allowedRoles = new Set([
        "organization_owner",
        "organization_admin",
        "operations_manager",
        "team_manager",
        "representative",
        "analyst",
        "viewer",
      ]);
      if (!allowedRoles.has(role)) throw new Error("Invalid organization role.");

      if (role === "organization_owner" && membership.role !== "organization_owner") {
        throw new Error("Only an organization owner can create another owner.");
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
        await syncRepresentative(admin, organizationId, userId, representativeId);
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

      if (!userId) throw new Error("User id is required.");
      if (password.length < 10) throw new Error("Password must be at least 10 characters.");

      const organizationId = membership.organization_id;
      const { data: targetMembership, error: membershipError } = await admin
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError || !targetMembership) {
        throw new Error("That user is not a member of this organization.");
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
      if (!userId) throw new Error("User id is required.");

      const organizationId = membership.organization_id;
      const { data: targetMembership, error: targetMembershipError } = await admin
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (targetMembershipError || !targetMembership) {
        throw new Error("That user is not a member of this organization.");
      }

      const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
      if (userError || !userData.user?.email) {
        throw new Error("Unable to find an email address for that user.");
      }

      const origin = request.nextUrl.origin;
      const { error: recoveryError } = await admin.auth.resetPasswordForEmail(
        userData.user.email,
        { redirectTo: `${origin}/auth/confirm` }
      );
      if (recoveryError) throw recoveryError;

      return NextResponse.json({ ok: true, setupEmailSent: true, email: userData.user.email });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "viewer") as OrganizationRole;
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds.map(String) : [];
    const representativeId = body.representativeId ? String(body.representativeId) : null;

    if (!email || !email.includes("@")) throw new Error("A valid email address is required.");
    if (!organizationRoles.includes(role)) throw new Error("Invalid organization role.");
    if (role === "organization_owner" && membership.role !== "organization_owner") throw new Error("Only an organization owner can invite another owner.");

    const organizationId = membership.organization_id;
    const authUsers = await listAuthUsers(admin);
    let authUser = authUsers.find((user) => user.email?.toLowerCase() === email);
    let invited = false;

    if (!authUser) {
      const origin = request.nextUrl.origin;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/confirm`,
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
    const body = await request.json();
    const userId = String(body.userId ?? "");
    const role = String(body.role ?? "viewer") as OrganizationRole;
    const isActive = body.isActive !== false;
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds.map(String) : [];
    const representativeId = body.representativeId ? String(body.representativeId) : null;

    if (!userId) throw new Error("User id is required.");
    if (!organizationRoles.includes(role)) throw new Error("Invalid organization role.");

    const organizationId = membership.organization_id;
    const { data: target, error: targetError } = await admin
      .from("organization_memberships")
      .select("role,is_active")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();
    if (targetError || !target) throw new Error("Membership not found.");

    if ((target.role === "organization_owner" || role === "organization_owner") && membership.role !== "organization_owner") {
      throw new Error("Only an organization owner can modify owner access.");
    }
    if (userId === actor.id && !isActive) throw new Error("You cannot deactivate your own membership.");

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
