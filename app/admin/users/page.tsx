"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import {
  accessStatus,
  organizationRoles,
  roleLabel,
  type ManagedOrganizationUser,
  type OrganizationRole,
} from "@/lib/admin/userManagement";

const blankInvite = { email: "", role: "representative" as OrganizationRole, teamIds: [] as string[], representativeId: "" };

export default function UsersPage() {
  const { session, membership, user } = useAuth();
  const config = useSupabaseConfig();
  const [users, setUsers] = useState<ManagedOrganizationUser[]>([]);
  const [invite, setInvite] = useState(blankInvite);
  const [editing, setEditing] = useState<ManagedOrganizationUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(async (method: "GET" | "POST" | "PATCH", body?: unknown) => {
    if (!session?.access_token) throw new Error("Your session is not ready.");
    const response = await fetch("/api/admin/users", {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "User management request failed.");
    return payload;
  }, [session?.access_token]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const payload = await request("GET");
      setUsers(payload.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { refresh(); }, [refresh]);

  const counts = useMemo(() => ({
    active: users.filter((item) => accessStatus(item) === "active").length,
    invited: users.filter((item) => accessStatus(item) === "invited").length,
    inactive: users.filter((item) => !item.isActive).length,
    admins: users.filter((item) => item.isActive && ["organization_owner", "organization_admin"].includes(item.role)).length,
  }), [users]);

  function toggleInviteTeam(teamId: string) {
    setInvite((current) => ({ ...current, teamIds: current.teamIds.includes(teamId) ? current.teamIds.filter((id) => id !== teamId) : [...current.teamIds, teamId] }));
  }

  function toggleEditTeam(teamId: string) {
    setEditing((current) => current ? ({ ...current, teamIds: current.teamIds.includes(teamId) ? current.teamIds.filter((id) => id !== teamId) : [...current.teamIds, teamId] }) : current);
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setMessage("");
      const payload = await request("POST", invite);
      setMessage(payload.invited ? `Invitation sent to ${invite.email}.` : `${invite.email} already had an account; organization access was added.`);
      setInvite(blankInvite);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation failed.");
    } finally { setSaving(false); }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    try {
      setSaving(true); setError(""); setMessage("");
      await request("PATCH", {
        userId: editing.userId,
        role: editing.role,
        isActive: editing.isActive,
        teamIds: editing.teamIds,
        representativeId: editing.representativeId ?? "",
      });
      setMessage(`Access updated for ${editing.email}.`);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally { setSaving(false); }
  }

  const canAssignOwner = membership?.role === "organization_owner";

  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Administration · Access Control</div><h1>Users & Invitations</h1><p className="muted">Invite organization users, assign roles and teams, link representative logins, and suspend access without deleting operational history.</p></div><button className="button secondary" onClick={refresh}>Refresh</button></div>
    <AdminNav />

    <div className="grid user-access-metrics">
      <div className="card"><div className="eyebrow">Active users</div><div className="metric">{counts.active}</div></div>
      <div className="card"><div className="eyebrow">Pending invite</div><div className="metric">{counts.invited}</div></div>
      <div className="card"><div className="eyebrow">Admins / owners</div><div className="metric">{counts.admins}</div></div>
      <div className="card"><div className="eyebrow">Inactive access</div><div className="metric">{counts.inactive}</div></div>
    </div>

    {error && <div className="error-banner"><strong>User management error</strong><span>{error}</span></div>}
    {message && <div className="form-message">{message}</div>}

    <div className="admin-split user-admin-split">
      <form className="card admin-form single" onSubmit={submitInvite}>
        <div><div className="eyebrow">Invite User</div><h2>Add organization access</h2><p className="muted small">New accounts receive a Supabase invitation email. Existing accounts are added directly to this organization.</p></div>
        <label>Email<input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="name@company.com" /></label>
        <label>Organization role<select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as OrganizationRole })}>{organizationRoles.filter((role) => canAssignOwner || role !== "organization_owner").map((role) => <option value={role} key={role}>{roleLabel(role)}</option>)}</select></label>
        <fieldset><legend>Team access</legend><div className="checkbox-list">{config.teams.map((team) => <label className="check-row" key={team.id}><input type="checkbox" checked={invite.teamIds.includes(team.id)} onChange={() => toggleInviteTeam(team.id)} /><span>{team.name}</span></label>)}</div></fieldset>
        <label>Representative login link<select value={invite.representativeId} onChange={(e) => setInvite({ ...invite, representativeId: e.target.value })}><option value="">Not linked to a representative</option>{config.reps.filter((rep) => rep.status === "active").map((rep) => <option key={rep.id} value={rep.id}>{rep.name} · {rep.email || "No email"}</option>)}</select></label>
        <button className="button" disabled={saving}>{saving ? "Sending…" : "Invite User"}</button>
        <div className="security-note"><strong>Security:</strong> the Supabase service-role key is used only by the server API route. It is never exposed to the browser.</div>
      </form>

      <section className="card table-card user-access-table">
        <div className="section-heading compact"><div><div className="eyebrow">Organization Members</div><h2>{users.length} account{users.length === 1 ? "" : "s"}</h2></div></div>
        {loading ? <div className="empty-state">Loading organization users…</div> : <table><thead><tr><th>User</th><th>Role</th><th>Teams</th><th>Status</th><th>Last sign in</th><th /></tr></thead><tbody>{users.map((item) => {
          const status = accessStatus(item);
          return <tr key={item.membershipId}><td><strong>{item.email}</strong>{item.representativeName && <small className="table-subline">Rep: {item.representativeName}</small>}{item.userId === user?.id && <small className="table-subline">Current account</small>}</td><td>{roleLabel(item.role)}</td><td>{item.teamIds.map((id) => config.teams.find((team) => team.id === id)?.name).filter(Boolean).join(", ") || "All-org only"}</td><td><span className={`access-status ${status}`}>{status === "invited" ? "Invited" : status === "active" ? "Active" : "Inactive"}</span></td><td>{item.lastSignInAt ? new Date(item.lastSignInAt).toLocaleString() : "Never"}</td><td><button onClick={() => setEditing({ ...item, teamIds: [...item.teamIds] })}>Manage</button></td></tr>;
        })}</tbody></table>}
      </section>
    </div>

    {editing && <div className="modal-backdrop" onMouseDown={() => setEditing(null)}><form className="card user-access-modal" onSubmit={saveEdit} onMouseDown={(e) => e.stopPropagation()}>
      <div className="section-heading compact"><div><div className="eyebrow">Manage Access</div><h2>{editing.email}</h2></div><button type="button" className="text-button" onClick={() => setEditing(null)}>Close</button></div>
      <label>Organization role<select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as OrganizationRole })}>{organizationRoles.filter((role) => canAssignOwner || role !== "organization_owner").map((role) => <option value={role} key={role}>{roleLabel(role)}</option>)}</select></label>
      <label>Status<select value={editing.isActive ? "active" : "inactive"} onChange={(e) => setEditing({ ...editing, isActive: e.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive / suspended</option></select></label>
      <fieldset><legend>Team access</legend><div className="checkbox-list">{config.teams.map((team) => <label className="check-row" key={team.id}><input type="checkbox" checked={editing.teamIds.includes(team.id)} onChange={() => toggleEditTeam(team.id)} /><span>{team.name}</span></label>)}</div></fieldset>
      <label>Representative login link<select value={editing.representativeId ?? ""} onChange={(e) => setEditing({ ...editing, representativeId: e.target.value || undefined })}><option value="">Not linked</option>{config.reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
      <div className="security-note">Deactivating membership blocks organization access but preserves the user, historical orders, interactions, and audit references.</div>
      <div className="form-actions"><button className="button" disabled={saving}>{saving ? "Saving…" : "Save Access"}</button><button type="button" className="button secondary" onClick={() => setEditing(null)}>Cancel</button></div>
    </form></div>}
  </AppShell>;
}
