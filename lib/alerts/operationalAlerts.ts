import { createClient } from "@/lib/supabase/browser";
import type {
  DemoAppointment,
  DemoLifecycleException,
  DemoLocation,
  DemoOrder,
  DemoRep,
  DemoTerritory,
} from "@/lib/types/platform";
import type { LivePresenceRow } from "@/lib/presence/livePresence";

export type AlertSeverity = "critical" | "high" | "medium" | "info";
export type AlertCategory =
  | "lifecycle"
  | "order_review"
  | "appointment"
  | "rep_activity"
  | "territory_workload";

export type OperationalAlert = {
  key: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  detail: string;
  href: string;
  createdAt?: string;
  entityLabel?: string;
};

export type AlertAcknowledgement = {
  alert_key: string;
  state: "acknowledged" | "dismissed";
  acknowledged_at: string;
};

function dateOnly(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function severityRank(value: AlertSeverity) {
  return value === "critical" ? 0 : value === "high" ? 1 : value === "medium" ? 2 : 3;
}

export function buildOperationalAlerts(input: {
  locations: DemoLocation[];
  territories: DemoTerritory[];
  reps: DemoRep[];
  orders: DemoOrder[];
  appointments: DemoAppointment[];
  lifecycleExceptions: DemoLifecycleException[];
  presence: LivePresenceRow[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const today = dateOnly(now);
  const alerts: OperationalAlert[] = [];

  for (const item of input.lifecycleExceptions.filter((row) => row.status === "open")) {
    alerts.push({
      key: `lifecycle:${item.id}`,
      category: "lifecycle",
      severity: item.exceptionType === "sync_error" || item.exceptionType === "invalid_transition" ? "critical" : "high",
      title: "Lifecycle exception needs attention",
      detail: item.message,
      href: "/lifecycle",
      createdAt: item.createdAt,
      entityLabel: item.exceptionType.replaceAll("_", " "),
    });
  }

  for (const order of input.orders.filter((row) => row.reviewStatus === "needs_attention" && row.orderStatus !== "cancelled")) {
    alerts.push({
      key: `order-review:${order.id}`,
      category: "order_review",
      severity: "high",
      title: "Order needs review",
      detail: `${order.customerName || "Customer"} · ${order.productNameSnapshot || "Submitted order"}`,
      href: "/sales",
      createdAt: order.updatedAt || order.createdAt,
      entityLabel: order.id,
    });
  }

  for (const appointment of input.appointments) {
    if (appointment.status === "no_show") {
      alerts.push({
        key: `appointment-no-show:${appointment.id}`,
        category: "appointment",
        severity: "high",
        title: "Install marked no-show",
        detail: `${appointment.customerName || "Customer"} · ${appointment.date} · ${appointment.time}`,
        href: "/scheduling",
        createdAt: appointment.updatedAt,
        entityLabel: appointment.customerName || appointment.id,
      });
      continue;
    }

    if (
      appointment.date < today &&
      !["completed", "cancelled", "no_show"].includes(appointment.status)
    ) {
      alerts.push({
        key: `appointment-overdue:${appointment.id}:${appointment.date}`,
        category: "appointment",
        severity: "critical",
        title: "Past-due install appointment",
        detail: `${appointment.customerName || "Customer"} was scheduled for ${appointment.date} at ${appointment.time}.`,
        href: "/scheduling",
        createdAt: appointment.updatedAt,
        entityLabel: appointment.customerName || appointment.id,
      });
    }
  }

  const presenceByRep = new Map(
    input.presence
      .filter((row) => row.representative_id)
      .map((row) => [row.representative_id as string, row])
  );
  const thirtyMinutes = 30 * 60 * 1000;

  for (const rep of input.reps.filter((row) => row.status === "active" && row.territoryIds.length > 0)) {
    const presence = presenceByRep.get(rep.id);
    if (!presence) {
      alerts.push({
        key: `rep-no-presence:${rep.id}:${today}`,
        category: "rep_activity",
        severity: "info",
        title: "Rep has no live activity today",
        detail: `${rep.name} is active and assigned to a territory, but has no presence record yet.`,
        href: "/dispatch",
        entityLabel: rep.name,
      });
      continue;
    }

    const age = now.getTime() - Date.parse(presence.last_seen_at);
    if (Number.isFinite(age) && age > thirtyMinutes) {
      const minutes = Math.max(31, Math.round(age / 60000));
      alerts.push({
        key: `rep-stale:${rep.id}:${today}`,
        category: "rep_activity",
        severity: "medium",
        title: "Rep activity is stale",
        detail: `${rep.name} was last seen about ${minutes} minutes ago.`,
        href: "/dispatch",
        createdAt: presence.last_seen_at,
        entityLabel: rep.name,
      });
    }
  }

  const prospectsByTerritory = new Map<string, { total: number; unassigned: number }>();
  for (const location of input.locations) {
    if ((location.serviceStatus ?? "prospect") !== "prospect" || !location.territoryId) continue;
    const current = prospectsByTerritory.get(location.territoryId) ?? { total: 0, unassigned: 0 };
    current.total += 1;
    if (!location.assignedRepId) current.unassigned += 1;
    prospectsByTerritory.set(location.territoryId, current);
  }

  for (const territory of input.territories.filter((row) => row.status === "active")) {
    const counts = prospectsByTerritory.get(territory.id);
    if (!counts || counts.unassigned === 0) continue;

    const ratio = counts.total ? counts.unassigned / counts.total : 0;
    if (counts.unassigned < 50 && ratio < 0.25) continue;

    alerts.push({
      key: `territory-unassigned:${territory.id}:${counts.unassigned}`,
      category: "territory_workload",
      severity: counts.unassigned >= 250 || ratio >= 0.75 ? "high" : "medium",
      title: "Territory has unassigned prospects",
      detail: `${territory.name}: ${counts.unassigned.toLocaleString()} of ${counts.total.toLocaleString()} prospects are unassigned.`,
      href: `/territories/${territory.id}`,
      entityLabel: territory.name,
    });
  }

  return alerts.sort((a, b) => {
    const severity = severityRank(a.severity) - severityRank(b.severity);
    if (severity !== 0) return severity;
    return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
  });
}

export async function fetchLivePresence(organizationId: string) {
  const { data, error } = await createClient()
    .from("live_presence")
    .select("*")
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  return (data ?? []) as LivePresenceRow[];
}

export async function fetchAlertAcknowledgements(organizationId: string) {
  const { data, error } = await createClient()
    .from("operational_alert_acknowledgements")
    .select("alert_key,state,acknowledged_at")
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  return (data ?? []) as AlertAcknowledgement[];
}

export async function setAlertAcknowledgement(input: {
  organizationId: string;
  userId: string;
  alertKey: string;
  state: "acknowledged" | "dismissed";
}) {
  const { error } = await createClient()
    .from("operational_alert_acknowledgements")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        alert_key: input.alertKey,
        state: input.state,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id,alert_key" }
    );

  if (error) throw new Error(error.message);
}

export async function clearAlertAcknowledgement(organizationId: string, alertKey: string) {
  const { error } = await createClient()
    .from("operational_alert_acknowledgements")
    .delete()
    .eq("organization_id", organizationId)
    .eq("alert_key", alertKey);

  if (error) throw new Error(error.message);
}
