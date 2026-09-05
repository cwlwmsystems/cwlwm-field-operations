import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("organization_id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No active organization membership." }, { status: 403 });
    }

    if (!["organization_owner", "organization_admin", "operations_manager"].includes(membership.role)) {
      return NextResponse.json({ error: "Security administration access required." }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
      throw new Error("Missing server Supabase configuration.");
    }

    const admin = createAdminClient<any>(url, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const days = Math.max(1, Math.min(365, Number(request.nextUrl.searchParams.get("days") ?? "30")));
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: memberships, error: membershipsError } = await admin
      .from("organization_memberships")
      .select("user_id, role, is_active")
      .eq("organization_id", membership.organization_id);

    if (membershipsError) throw membershipsError;

    const userIds = (memberships ?? []).map((row: any) => row.user_id);
    const members = [];

    for (const row of memberships ?? []) {
      const { data: authData } = await admin.auth.admin.getUserById(row.user_id);
      members.push({
        userId: row.user_id,
        email: authData.user?.email ?? "(no email)",
        role: row.role,
        isActive: row.is_active,
        lastSignInAt: authData.user?.last_sign_in_at ?? null,
      });
    }

    const { data: audit, error: auditError } = await admin
      .from("audit_log")
      .select("id, action, entity_type, entity_id, created_at, actor_user_id, metadata")
      .eq("organization_id", membership.organization_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (auditError) throw auditError;

    const rows = audit ?? [];
    const recentRoleChanges = rows.filter((row: any) =>
      ["membership_role_changed", "user_role_changed", "organization_membership_updated"].includes(row.action)
    ).length;
    const recentPasswordChanges = rows.filter((row: any) =>
      ["password_set_manually", "user_password_updated", "manual_password_reset"].includes(row.action)
    ).length;
    const recentDeactivations = rows.filter((row: any) =>
      ["membership_deactivated", "user_deactivated", "organization_membership_deactivated"].includes(row.action)
    ).length;

    return NextResponse.json({
      members,
      audit: rows,
      summary: {
        activeUsers: (memberships ?? []).filter((row: any) => row.is_active).length,
        inactiveUsers: (memberships ?? []).filter((row: any) => !row.is_active).length,
        owners: (memberships ?? []).filter((row: any) => row.role === "organization_owner" && row.is_active).length,
        admins: (memberships ?? []).filter((row: any) => row.role === "organization_admin" && row.is_active).length,
        recentRoleChanges,
        recentPasswordChanges,
        recentDeactivations,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load security data." },
      { status: 500 }
    );
  }
}
