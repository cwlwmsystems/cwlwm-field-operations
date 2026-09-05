"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAuth } from "@/lib/auth/AuthProvider";

type AuditRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
};

type MemberRow = {
  userId: string;
  email: string;
  role: string;
  isActive: boolean;
  lastSignInAt: string | null;
};

type Summary = {
  activeUsers: number;
  inactiveUsers: number;
  owners: number;
  admins: number;
  recentRoleChanges: number;
  recentPasswordChanges: number;
  recentDeactivations: number;
};

export default function SecurityAdminPage() {
  const { membership } = useAuth();
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    activeUsers: 0,
    inactiveUsers: 0,
    owners: 0,
    admins: 0,
    recentRoleChanges: 0,
    recentPasswordChanges: 0,
    recentDeactivations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [days, setDays] = useState("30");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ days });
      const res = await fetch(`/api/admin/security?${params.toString()}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Unable to load security data.");

      setAudit(payload.audit ?? []);
      setMembers(payload.members ?? []);
      setSummary(payload.summary ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load security data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (membership) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.organizationId, days]);

  const actions = useMemo(
    () => Array.from(new Set(audit.map((row) => row.action))).sort(),
    [audit]
  );

  const filteredAudit = useMemo(() => {
    if (actionFilter === "all") return audit;
    return audit.filter((row) => row.action === actionFilter);
  }, [audit, actionFilter]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Administration · Security</div>
          <h1>Security & Audit Center</h1>
          <p className="muted">
            Review account access, role changes, password administration, deactivations, and organization audit history.
          </p>
        </div>
        <div className="row-actions">
          <select value={days} onChange={(event) => setDays(event.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="button secondary" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <AdminNav />

      {error && <div className="form-message error">{error}</div>}

      <section className="grid security-summary-grid">
        <article className="card metric-card">
          <div className="metric-label">Active users</div>
          <div className="metric-value">{summary.activeUsers}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Inactive users</div>
          <div className="metric-value">{summary.inactiveUsers}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Owners</div>
          <div className="metric-value">{summary.owners}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Admins</div>
          <div className="metric-value">{summary.admins}</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Role changes</div>
          <div className="metric-value">{summary.recentRoleChanges}</div>
          <div className="metric-sub">Selected period</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Password changes</div>
          <div className="metric-value">{summary.recentPasswordChanges}</div>
          <div className="metric-sub">Selected period</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Deactivations</div>
          <div className="metric-value">{summary.recentDeactivations}</div>
          <div className="metric-sub">Selected period</div>
        </article>
      </section>

      <section className="card security-account-card">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Account posture</div>
            <h2>Organization users</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last sign in</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId}>
                  <td>{member.email}</td>
                  <td>{member.role.replaceAll("_", " ")}</td>
                  <td>
                    <span className={`status-pill ${member.isActive ? "success" : "muted"}`}>
                      {member.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleString() : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card security-audit-card">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Audit history</div>
            <h2>Recent security and access events</h2>
          </div>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="all">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudit.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">No matching audit events.</td>
                </tr>
              )}
              {filteredAudit.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td><code>{row.action}</code></td>
                  <td>{row.entity_type ?? "—"}{row.entity_id ? ` · ${row.entity_id}` : ""}</td>
                  <td>{row.actor_user_id ?? "System"}</td>
                  <td>
                    <details>
                      <summary>View</summary>
                      <pre className="audit-json">{JSON.stringify(row.metadata ?? {}, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
