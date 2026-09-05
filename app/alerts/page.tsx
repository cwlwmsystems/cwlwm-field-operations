"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import {
  buildOperationalAlerts,
  clearAlertAcknowledgement,
  fetchAlertAcknowledgements,
  fetchLivePresence,
  setAlertAcknowledgement,
  type AlertAcknowledgement,
  type AlertCategory,
  type AlertSeverity,
  type OperationalAlert,
} from "@/lib/alerts/operationalAlerts";
import type { LivePresenceRow } from "@/lib/presence/livePresence";

const categoryLabels: Record<AlertCategory, string> = {
  lifecycle: "Lifecycle",
  order_review: "Order review",
  appointment: "Appointments",
  rep_activity: "Rep activity",
  territory_workload: "Territory workload",
};

const severityLabels: Record<AlertSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  info: "Info",
};

function formatWhen(value?: string) {
  if (!value) return "Current";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AlertsPage() {
  const { organization, user } = useAuth();
  const config = useSupabaseConfig();
  const sales = useSupabaseSales();
  const scheduling = useSupabaseScheduling();
  const lifecycle = useSupabaseLifecycle();

  const [presence, setPresence] = useState<LivePresenceRow[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<AlertAcknowledgement[]>([]);
  const [severityFilter, setSeverityFilter] = useState<"all" | AlertSeverity>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | AlertCategory>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [message, setMessage] = useState("");

  const refreshSupplemental = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const [presenceRows, ackRows] = await Promise.all([
        fetchLivePresence(organization.id),
        fetchAlertAcknowledgements(organization.id),
      ]);
      setPresence(presenceRows);
      setAcknowledgements(ackRows);
      setLastRefresh(new Date());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refresh alerts.");
    }
  }, [organization?.id]);

  useEffect(() => {
    refreshSupplemental();
  }, [refreshSupplemental]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      refreshSupplemental();
      config.refresh();
      sales.refresh();
      scheduling.refresh();
      lifecycle.refresh();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, config.refresh, lifecycle.refresh, refreshSupplemental, sales.refresh, scheduling.refresh]);

  const allAlerts = useMemo(
    () =>
      buildOperationalAlerts({
        locations: config.locations,
        territories: config.territories,
        reps: config.reps,
        orders: sales.orders,
        appointments: scheduling.appointments,
        lifecycleExceptions: lifecycle.exceptions,
        presence,
      }),
    [
      config.locations,
      config.reps,
      config.territories,
      lifecycle.exceptions,
      presence,
      sales.orders,
      scheduling.appointments,
    ]
  );

  const ackMap = useMemo(
    () => new Map(acknowledgements.map((row) => [row.alert_key, row])),
    [acknowledgements]
  );

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((alert) => {
      const acknowledged = ackMap.has(alert.key);
      if (!showAcknowledged && acknowledged) return false;
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && alert.category !== categoryFilter) return false;
      return true;
    });
  }, [ackMap, allAlerts, categoryFilter, severityFilter, showAcknowledged]);

  const counts = useMemo(
    () => ({
      critical: allAlerts.filter((a) => a.severity === "critical" && !ackMap.has(a.key)).length,
      high: allAlerts.filter((a) => a.severity === "high" && !ackMap.has(a.key)).length,
      medium: allAlerts.filter((a) => a.severity === "medium" && !ackMap.has(a.key)).length,
      info: allAlerts.filter((a) => a.severity === "info" && !ackMap.has(a.key)).length,
      acknowledged: allAlerts.filter((a) => ackMap.has(a.key)).length,
    }),
    [ackMap, allAlerts]
  );

  async function acknowledge(alert: OperationalAlert, state: "acknowledged" | "dismissed") {
    if (!organization?.id || !user?.id) return;
    try {
      await setAlertAcknowledgement({
        organizationId: organization.id,
        userId: user.id,
        alertKey: alert.key,
        state,
      });
      await refreshSupplemental();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update alert.");
    }
  }

  async function restore(alert: OperationalAlert) {
    if (!organization?.id) return;
    try {
      await clearAlertAcknowledgement(organization.id, alert.key);
      await refreshSupplemental();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to restore alert.");
    }
  }

  return (
    <AppShell>
      <section className="command-hero alert-hero">
        <div>
          <div className="eyebrow">Operational Alerts</div>
          <h1>Attention queue</h1>
          <p>
            One place for exceptions, overdue installs, orders needing review,
            stale rep activity, and territory workload issues.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="button secondary"
            onClick={() => {
              refreshSupplemental();
              config.refresh();
              sales.refresh();
              scheduling.refresh();
              lifecycle.refresh();
            }}
          >
            Refresh
          </button>
          <button
            className={`button secondary ${autoRefresh ? "active-toggle" : ""}`}
            onClick={() => setAutoRefresh((value) => !value)}
          >
            {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
          </button>
        </div>
      </section>

      <section className="command-metrics alert-metrics">
        <button className="command-metric-card alert-count critical" onClick={() => setSeverityFilter("critical")}>
          <span className="command-metric-label">Critical</span>
          <strong>{counts.critical}</strong>
          <small>Past-due / blocking issues</small>
        </button>
        <button className="command-metric-card alert-count high" onClick={() => setSeverityFilter("high")}>
          <span className="command-metric-label">High</span>
          <strong>{counts.high}</strong>
          <small>Needs manager attention</small>
        </button>
        <button className="command-metric-card alert-count medium" onClick={() => setSeverityFilter("medium")}>
          <span className="command-metric-label">Medium</span>
          <strong>{counts.medium}</strong>
          <small>Workload / stale activity</small>
        </button>
        <button className="command-metric-card alert-count info" onClick={() => setSeverityFilter("info")}>
          <span className="command-metric-label">Info</span>
          <strong>{counts.info}</strong>
          <small>Awareness items</small>
        </button>
        <button className="command-metric-card alert-count acknowledged" onClick={() => setShowAcknowledged(true)}>
          <span className="command-metric-label">Acknowledged</span>
          <strong>{counts.acknowledged}</strong>
          <small>Hidden from active queue</small>
        </button>
      </section>

      <section className="card alert-filter-card">
        <div className="alert-filter-row">
          <label>
            Severity
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as "all" | AlertSeverity)}>
              <option value="all">All severities</option>
              {Object.entries(severityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | AlertCategory)}>
              <option value="all">All categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="checkbox-filter">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(event) => setShowAcknowledged(event.target.checked)}
            />
            Show acknowledged
          </label>

          <button
            className="text-button"
            onClick={() => {
              setSeverityFilter("all");
              setCategoryFilter("all");
              setShowAcknowledged(false);
            }}
          >
            Clear filters
          </button>
        </div>
        <small className="alert-refresh-note">
          {lastRefresh ? `Last refreshed ${lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading alerts…"}
        </small>
      </section>

      {message && <div className="form-message">{message}</div>}

      <section className="alert-list">
        {filteredAlerts.map((alert) => {
          const acknowledgement = ackMap.get(alert.key);
          return (
            <article key={alert.key} className={`card operational-alert severity-${alert.severity} ${acknowledgement ? "is-acknowledged" : ""}`}>
              <div className="alert-severity-rail" />
              <div className="operational-alert-body">
                <div className="operational-alert-topline">
                  <span className={`alert-severity-pill ${alert.severity}`}>{severityLabels[alert.severity]}</span>
                  <span className="alert-category-pill">{categoryLabels[alert.category]}</span>
                  {alert.entityLabel && <span className="alert-entity-label">{alert.entityLabel}</span>}
                  <span className="alert-time">{formatWhen(alert.createdAt)}</span>
                </div>
                <h2>{alert.title}</h2>
                <p>{alert.detail}</p>
                {acknowledgement && (
                  <small className="acknowledged-note">
                    {acknowledgement.state === "dismissed" ? "Dismissed" : "Acknowledged"} · {formatWhen(acknowledgement.acknowledged_at)}
                  </small>
                )}
              </div>
              <div className="operational-alert-actions">
                <Link className="button secondary" href={alert.href}>Open</Link>
                {!acknowledgement ? (
                  <>
                    <button className="button secondary" onClick={() => acknowledge(alert, "acknowledged")}>Acknowledge</button>
                    <button className="text-button" onClick={() => acknowledge(alert, "dismissed")}>Dismiss</button>
                  </>
                ) : (
                  <button className="text-button" onClick={() => restore(alert)}>Restore</button>
                )}
              </div>
            </article>
          );
        })}

        {!filteredAlerts.length && (
          <section className="card alert-empty-state">
            <div className="eyebrow">Queue Clear</div>
            <h2>No alerts match this view</h2>
            <p>There are no active operational issues matching the selected filters.</p>
          </section>
        )}
      </section>
    </AppShell>
  );
}
