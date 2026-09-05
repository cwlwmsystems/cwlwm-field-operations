"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import { useSupabaseFinance } from "@/lib/finance/SupabaseFinanceProvider";

const adminRoles = new Set(["organization_owner", "organization_admin", "operations_manager"]);

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusClass(value: string) {
  const normalized = value.toLowerCase();
  if (["installed", "activated", "approved", "completed", "exported"].includes(normalized)) return "success";
  if (["needs_attention", "exception", "cancelled", "void", "no_show"].includes(normalized)) return "warning";
  return "neutral";
}

export default function Dashboard() {
  const { membership, organization } = useAuth();
  const config = useSupabaseConfig();
  const sales = useSupabaseSales();
  const sched = useSupabaseScheduling();
  const life = useSupabaseLifecycle();
  const fin = useSupabaseFinance();

  const today = new Date().toISOString().slice(0, 10);
  const appointmentsToday = sched.appointments.filter((item) => item.date === today && !["cancelled", "completed"].includes(item.status));
  const activeReps = config.reps.filter((rep) => rep.status === "active").length;
  const activeTerritories = config.territories.filter((territory) => territory.status === "active").length;
  const installed = sales.orders.filter((order) => life.getCurrentStage(order.id)?.category === "installed").length;
  const activated = sales.orders.filter((order) => life.getCurrentStage(order.id)?.category === "activated").length;
  const needsReview = sales.orders.filter((order) => order.reviewStatus === "needs_attention").length;
  const openExceptions = life.exceptions.filter((item) => item.status === "open").length;
  const pendingInvoices = fin.eligibleOrderIds.length;
  const overdueAppointments = sched.appointments.filter((item) => item.date < today && !["completed", "cancelled", "no_show"].includes(item.status)).length;
  const noShows = sched.appointments.filter((item) => item.status === "no_show").length;
  const operationalAlertCount = needsReview + openExceptions + overdueAppointments + noShows;
  const role = membership?.role ?? "viewer";
  const canOperate = ["organization_owner", "organization_admin", "operations_manager", "team_manager", "representative"].includes(role);
  const canAdmin = adminRoles.has(role);

  const recentOrders = [...sales.orders]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);

  const upcomingAppointments = [...sched.appointments]
    .filter((item) => item.date >= today && !["cancelled", "completed"].includes(item.status))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 5);

  const topTerritories = [...config.territories]
    .sort((a, b) => b.locations - a.locations)
    .slice(0, 5);

  return (
    <AppShell>
      <section className="command-hero">
        <div>
          <div className="eyebrow">Command Center</div>
          <h1>{organization?.name ?? config.organization?.name ?? "Field Operations"}</h1>
          <p>One view of field activity, sales movement, appointments, lifecycle exceptions, and revenue readiness.</p>
        </div>
        <div className="hero-actions">
          {canOperate && <Link className="button" href="/field">Open field workspace</Link>}
          <Link className="button secondary" href="/reports">View reports</Link>
        </div>
      </section>

      <section className="command-metrics" aria-label="Operational metrics">
        <Link href="/locations" className="command-metric-card">
          <span className="command-metric-label">Locations</span>
          <strong>{config.locations.length}</strong>
          <small>Across {activeTerritories} active territories</small>
        </Link>
        <Link href="/representatives" className="command-metric-card">
          <span className="command-metric-label">Active reps</span>
          <strong>{activeReps}</strong>
          <small>{config.teams.filter((team) => team.status === "active").length} active teams</small>
        </Link>
        <Link href="/sales" className="command-metric-card">
          <span className="command-metric-label">Orders</span>
          <strong>{sales.orders.length}</strong>
          <small>{needsReview} need review</small>
        </Link>
        <Link href="/scheduling" className="command-metric-card">
          <span className="command-metric-label">Today’s appointments</span>
          <strong>{appointmentsToday.length}</strong>
          <small>{upcomingAppointments.length} upcoming in queue</small>
        </Link>
        {canAdmin && <Link href="/alerts" className="command-metric-card alert-dashboard-card">
          <span className="command-metric-label">Operational alerts</span>
          <strong>{operationalAlertCount}</strong>
          <small>{openExceptions} lifecycle · {needsReview} order review</small>
        </Link>}
        <Link href="/lifecycle" className="command-metric-card">
          <span className="command-metric-label">Installed / activated</span>
          <strong>{installed + activated}</strong>
          <small>{openExceptions} open exceptions</small>
        </Link>
        <Link href="/finance" className="command-metric-card accent-card">
          <span className="command-metric-label">Ready to invoice</span>
          <strong>{pendingInvoices}</strong>
          <small>{fin.batches.length} invoice batches</small>
        </Link>
      </section>

      <div className="command-grid command-grid-primary">
        <section className="card command-panel">
          <div className="command-panel-header">
            <div>
              <div className="eyebrow">Today</div>
              <h2>Operations queue</h2>
            </div>
            <Link className="text-link" href="/scheduling">Open scheduling</Link>
          </div>

          <div className="ops-queue">
            <div className="queue-stat"><span>Appointments today</span><strong>{appointmentsToday.length}</strong></div>
            <div className="queue-stat"><span>Orders needing review</span><strong>{needsReview}</strong></div>
            <div className="queue-stat"><span>Lifecycle exceptions</span><strong>{openExceptions}</strong></div>
            <div className="queue-stat"><span>Ready to invoice</span><strong>{pendingInvoices}</strong></div>
          </div>

          <div className="command-divider" />

          <div className="quick-action-grid">
            {canOperate && <Link href="/field" className="quick-action"><strong>Work the field</strong><span>Open today’s prioritized field workspace</span></Link>}
            {canOperate && <Link href="/sales" className="quick-action"><strong>Capture a sale</strong><span>Start or resume the sales workflow</span></Link>}
            {canOperate && <Link href="/scheduling" className="quick-action"><strong>Manage appointments</strong><span>Review capacity and upcoming visits</span></Link>}
            {canAdmin && <Link href="/admin" className="quick-action"><strong>Configure operations</strong><span>Markets, teams, lifecycle, finance</span></Link>}
          </div>
        </section>

        <section className="card command-panel">
          <div className="command-panel-header">
            <div>
              <div className="eyebrow">Coverage</div>
              <h2>Territory footprint</h2>
            </div>
            <Link className="text-link" href="/territories">All territories</Link>
          </div>

          {topTerritories.length === 0 ? (
            <div className="empty-state">No territories configured yet.</div>
          ) : (
            <div className="territory-pulse-list">
              {topTerritories.map((territory) => {
                const max = Math.max(1, ...topTerritories.map((item) => item.locations));
                const width = Math.max(8, Math.round((territory.locations / max) * 100));
                return (
                  <Link key={territory.id} href={`/territories/${territory.id}`} className="territory-pulse-row">
                    <div><strong>{territory.name}</strong><span>{territory.market || "Unassigned market"}</span></div>
                    <div className="territory-pulse-value"><span>{territory.locations}</span><div className="mini-track"><div style={{ width: `${width}%` }} /></div></div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="command-grid command-grid-secondary">
        <section className="card command-panel table-panel">
          <div className="command-panel-header">
            <div>
              <div className="eyebrow">Revenue activity</div>
              <h2>Recent orders</h2>
            </div>
            <Link className="text-link" href="/sales">Open sales</Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="empty-state">No orders yet.</div>
          ) : (
            <div className="activity-list">
              {recentOrders.map((order) => {
                const stage = life.getCurrentStage(order.id);
                return (
                  <Link className="activity-row" href={`/sales/orders/${order.id}`} key={order.id}>
                    <div className="activity-main"><strong>{order.customerName || "Unnamed customer"}</strong><span>{order.productNameSnapshot || "Order"} · {formatDate(order.createdAt)}</span></div>
                    <span className={`badge ${statusClass(stage?.category ?? order.reviewStatus)}`}>{stage?.name ?? order.reviewStatus.replaceAll("_", " ")}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="card command-panel table-panel">
          <div className="command-panel-header">
            <div>
              <div className="eyebrow">Field schedule</div>
              <h2>Upcoming appointments</h2>
            </div>
            <Link className="text-link" href="/scheduling">Full schedule</Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="empty-state">No upcoming appointments.</div>
          ) : (
            <div className="activity-list">
              {upcomingAppointments.map((appointment) => {
                const location = config.locations.find((item) => item.id === appointment.locationId);
                return (
                  <Link className="activity-row" href="/scheduling" key={appointment.id}>
                    <div className="activity-main"><strong>{appointment.customerName || location?.address || "Appointment"}</strong><span>{formatDate(appointment.date)} · {appointment.time} · {location?.city || "Field visit"}</span></div>
                    <span className={`badge ${statusClass(appointment.status)}`}>{appointment.status.replaceAll("_", " ")}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
