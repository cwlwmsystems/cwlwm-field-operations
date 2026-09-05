"use client";

import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  hasPermission,
  organizationRoles,
  permissionMatrix,
  roleDescriptions,
  roleLabel,
} from "@/lib/auth/permissions";

export default function AccessMatrixPage() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Administration · Security</div>
          <h1>Role & Permission Matrix</h1>
          <p className="muted">
            Review what each organization role can access. Direct URL access is enforced by the same centralized policy used by navigation.
          </p>
        </div>
      </div>

      <AdminNav />

      <section className="grid role-summary-grid">
        {organizationRoles.map((role) => (
          <article className="card role-summary-card" key={role}>
            <div className="eyebrow">{roleLabel(role)}</div>
            <p>{roleDescriptions[role]}</p>
          </article>
        ))}
      </section>

      <section className="card table-card access-matrix-table">
        <table>
          <thead>
            <tr>
              <th>Capability</th>
              {organizationRoles.map((role) => <th key={role}>{roleLabel(role)}</th>)}
            </tr>
          </thead>
          <tbody>
            {permissionMatrix.map((row) => (
              <tr key={row.permission}>
                <td><strong>{row.label}</strong></td>
                {organizationRoles.map((role) => (
                  <td key={role}>
                    <span className={`permission-dot ${hasPermission(role, row.permission) ? "allowed" : "denied"}`}>
                      {hasPermission(role, row.permission) ? "Allowed" : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card access-security-note">
        <div className="eyebrow">Defense in Depth</div>
        <h2>Navigation hiding is not the security boundary</h2>
        <p>
          Phase 13 also blocks direct navigation to protected application routes. Existing Supabase RLS and role-aware database functions remain the data-layer protection for tenant records and privileged operations.
        </p>
      </section>
    </AppShell>
  );
}
