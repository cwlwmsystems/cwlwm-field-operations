"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { managerRoles } from "@/lib/auth/permissions";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import { createClient } from "@/lib/supabase/browser";
import { DispatchLiveMap, type DispatchRepPoint } from "@/components/field/DispatchLiveMap";
import type { LivePresenceRow } from "@/lib/presence/livePresence";

const managerRoleSet = new Set(managerRoles);

function startOfLocalDay() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function endOfLocalDay() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

function shortTime(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function activityLabel(lastSeen?: string) {
  if (!lastSeen) return { label: "No activity", tone: "quiet" };
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(lastSeen)) / 60000));
  if (minutes <= 30) return { label: "Active now", tone: "active" };
  if (minutes <= 240) return { label: `${minutes}m ago`, tone: "recent" };
  return { label: "Quiet", tone: "quiet" };
}

function presenceActivityLabel(lastSeen?: string) {
  if (!lastSeen) return { label: "Offline", tone: "quiet" };
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(lastSeen)) / 60000));
  if (minutes <= 2) return { label: "Live now", tone: "active" };
  if (minutes <= 10) return { label: `${minutes}m ago`, tone: "recent" };
  return { label: "Offline", tone: "quiet" };
}

function recentActivityForMap(
  interactions: Array<{ id: string; locationId: string; disposition: string; representativeName: string }>,
  locationById: ReadonlyMap<string, { latitude?: number; longitude?: number; address: string }>
) {
  return interactions.slice(0, 40).flatMap((interaction) => {
    const location = locationById.get(interaction.locationId);
    if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return [];
    return [{
      id: interaction.id,
      latitude: location.latitude as number,
      longitude: location.longitude as number,
      label: `${interaction.representativeName || "Representative"} · ${interaction.disposition} · ${location.address}`,
    }];
  });
}

export default function DispatchPage() {
  const { membership, organization } = useAuth();
  const config = useSupabaseConfig();
  const ops = useSupabaseTerritoryOps();
  const sales = useSupabaseSales();
  const scheduling = useSupabaseScheduling();
  const lifecycle = useSupabaseLifecycle();

  const [teamId, setTeamId] = useState("");
  const [marketId, setMarketId] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [repId, setRepId] = useState("");
  const [presenceRows, setPresenceRows] = useState<LivePresenceRow[]>([]);
  const [liveError, setLiveError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const role = membership?.role ?? "viewer";
  const canDispatch = managerRoleSet.has(role as never);
  const dayStart = startOfLocalDay();
  const dayEnd = endOfLocalDay();
  const todayIso = new Date().toISOString().slice(0, 10);

  const loadLivePresence = useCallback(async () => {
    if (!organization?.id || !canDispatch) return;
    const { data, error } = await createClient()
      .from("live_presence")
      .select("organization_id,user_id,representative_id,email,role,page_path,latitude,longitude,accuracy_meters,location_updated_at,last_seen_at")
      .eq("organization_id", organization.id)
      .order("last_seen_at", { ascending: false });

    if (error) {
      setLiveError(error.message);
      return;
    }

    setPresenceRows((data ?? []) as LivePresenceRow[]);
    setLiveError("");
    setLastUpdatedAt(new Date().toISOString());
  }, [canDispatch, organization?.id]);

  const refreshDispatch = useCallback(async () => {
    await Promise.allSettled([
      loadLivePresence(),
      config.refresh(),
      ops.refresh(),
      sales.refresh(),
      scheduling.refresh(),
      lifecycle.refresh(),
    ]);
    setLastUpdatedAt(new Date().toISOString());
  }, [config.refresh, lifecycle.refresh, loadLivePresence, ops.refresh, sales.refresh, scheduling.refresh]);

  useEffect(() => {
    if (!canDispatch || !organization?.id) return;
    loadLivePresence();
  }, [canDispatch, loadLivePresence, organization?.id]);

  useEffect(() => {
    if (!autoRefresh || !canDispatch || !organization?.id) return;
    const timer = window.setInterval(() => { refreshDispatch(); }, 30000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, canDispatch, organization?.id, refreshDispatch]);

  const locationById = useMemo(
    () => new Map(config.locations.map((location) => [location.id, location])),
    [config.locations]
  );

  const territoryById = useMemo(
    () => new Map(config.territories.map((territory) => [territory.id, territory])),
    [config.territories]
  );

  const latestInteractionRecordByRep = useMemo(() => {
    const map = new Map<string, (typeof ops.interactions)[number]>();
    for (const interaction of ops.interactions) {
      if (!interaction.representativeId) continue;
      const current = map.get(interaction.representativeId);
      if (!current || Date.parse(interaction.occurredAt) > Date.parse(current.occurredAt)) {
        map.set(interaction.representativeId, interaction);
      }
    }
    return map;
  }, [ops.interactions]);

  const presenceByRep = useMemo(() => {
    const map = new Map<string, LivePresenceRow>();
    for (const row of presenceRows) {
      if (!row.representative_id || map.has(row.representative_id)) continue;
      map.set(row.representative_id, row);
    }
    return map;
  }, [presenceRows]);

  const todayInteractions = useMemo(
    () => ops.interactions.filter((interaction) => {
      const time = Date.parse(interaction.occurredAt);
      return Number.isFinite(time) && time >= dayStart && time <= dayEnd;
    }),
    [ops.interactions, dayStart, dayEnd]
  );

  const todayOrders = useMemo(
    () => sales.orders.filter((order) => {
      const time = Date.parse(order.createdAt);
      return Number.isFinite(time) && time >= dayStart && time <= dayEnd;
    }),
    [sales.orders, dayStart, dayEnd]
  );

  const currentCustomers = config.locations.filter((location) => location.serviceStatus === "current_customer").length;
  const prospects = config.locations.filter((location) => (location.serviceStatus ?? "prospect") === "prospect").length;
  const doNotKnock = config.locations.filter((location) => location.serviceStatus === "do_not_knock").length;

  const todayAppointments = useMemo(
    () => scheduling.appointments.filter((appointment) => appointment.date === todayIso),
    [scheduling.appointments, todayIso]
  );

  const filteredTerritories = useMemo(() => {
    return config.territories.filter((territory) => {
      if (marketId && territory.marketId !== marketId) return false;
      if (teamId && territory.teamId !== teamId) return false;
      if (territoryId && territory.id !== territoryId) return false;
      return true;
    });
  }, [config.territories, marketId, teamId, territoryId]);

  const filteredTerritoryIds = useMemo(
    () => new Set(filteredTerritories.map((territory) => territory.id)),
    [filteredTerritories]
  );

  const filteredReps = useMemo(() => {
    return config.reps.filter((rep) => {
      if (rep.status !== "active") return false;
      if (teamId && rep.teamId !== teamId) return false;
      if (repId && rep.id !== repId) return false;
      if ((marketId || territoryId) && !rep.territoryIds.some((id) => filteredTerritoryIds.has(id))) return false;
      return true;
    });
  }, [config.reps, teamId, repId, marketId, territoryId, filteredTerritoryIds]);

  const filteredRepIds = useMemo(() => new Set(filteredReps.map((rep) => rep.id)), [filteredReps]);

  const visibleInteractions = todayInteractions.filter((interaction) => {
    const location = locationById.get(interaction.locationId);
    if (!location) return false;
    if (!filteredTerritoryIds.has(location.territoryId)) return false;
    if (repId && interaction.representativeId !== repId) return false;
    if (teamId && location.teamId !== teamId) return false;
    return true;
  });

  const visibleOrders = todayOrders.filter((order) => {
    const location = locationById.get(order.locationId);
    if (!location) return false;
    if (!filteredTerritoryIds.has(location.territoryId)) return false;
    if (repId && order.representativeId !== repId) return false;
    if (teamId && location.teamId !== teamId) return false;
    return true;
  });

  const visibleAppointments = todayAppointments.filter((appointment) => {
    if (!filteredTerritoryIds.has(appointment.territoryId)) return false;
    if (repId && appointment.representativeId !== repId) return false;
    if (teamId && appointment.teamId !== teamId) return false;
    return true;
  });

  const workedLocationIds = new Set(visibleInteractions.map((interaction) => interaction.locationId));
  const salesCount = visibleOrders.length;
  const openAppointments = visibleAppointments.filter((appointment) => !["completed", "cancelled"].includes(appointment.status)).length;
  const completedAppointments = visibleAppointments.filter((appointment) => appointment.status === "completed").length;
  const activeNow = filteredReps.filter((rep) => {
    const presence = presenceByRep.get(rep.id);
    const lastSeen = presence?.last_seen_at ?? latestInteractionRecordByRep.get(rep.id)?.occurredAt;
    return (presence ? presenceActivityLabel(lastSeen) : activityLabel(lastSeen)).tone === "active";
  }).length;
  const openExceptions = lifecycle.exceptions.filter((exception) => exception.status === "open").length;

  const repRows = filteredReps.map((rep) => {
    const presence = presenceByRep.get(rep.id);
    const lastInteraction = latestInteractionRecordByRep.get(rep.id);
    const lastSeen = presence?.last_seen_at ?? lastInteraction?.occurredAt;
    const activity = presence ? presenceActivityLabel(lastSeen) : activityLabel(lastSeen);
    const repInteractions = visibleInteractions.filter((interaction) => interaction.representativeId === rep.id);
    const repSales = visibleOrders.filter((order) => order.representativeId === rep.id);
    const repAppointments = visibleAppointments.filter((appointment) => appointment.representativeId === rep.id);
    const assignedLocations = config.locations.filter((location) => location.assignedRepId === rep.id).length;
    const worked = new Set(repInteractions.map((interaction) => interaction.locationId)).size;

    return {
      rep,
      lastSeen,
      activity,
      interactions: repInteractions.length,
      worked,
      sales: repSales.length,
      appointments: repAppointments.length,
      assignedLocations,
      presence,
      lastInteraction,
    };
  }).sort((a, b) => {
    const rank = { active: 0, recent: 1, quiet: 2 } as const;
    const diff = rank[a.activity.tone as keyof typeof rank] - rank[b.activity.tone as keyof typeof rank];
    if (diff !== 0) return diff;
    return b.sales - a.sales || b.worked - a.worked;
  });

  const territoryRows = filteredTerritories.map((territory) => {
    const territoryLocations = config.locations.filter((location) => location.territoryId === territory.id);
    const territoryLocationIds = new Set(territoryLocations.map((location) => location.id));
    const territoryInteractions = visibleInteractions.filter((interaction) => territoryLocationIds.has(interaction.locationId));
    const territoryOrders = visibleOrders.filter((order) => territoryLocationIds.has(order.locationId));
    const territoryAppointments = visibleAppointments.filter((appointment) => appointment.territoryId === territory.id);
    const territoryReps = filteredReps.filter((rep) => rep.territoryIds.includes(territory.id));
    return {
      territory,
      worked: new Set(territoryInteractions.map((interaction) => interaction.locationId)).size,
      interactions: territoryInteractions.length,
      sales: territoryOrders.length,
      appointments: territoryAppointments.length,
      reps: territoryReps.length,
      totalLocations: territoryLocations.length,
    };
  }).sort((a, b) => b.worked - a.worked || b.sales - a.sales);

  const repMapPoints = useMemo<DispatchRepPoint[]>(() => {
    const points: DispatchRepPoint[] = [];

    for (const row of repRows) {
      const gpsFresh = Boolean(
        row.presence?.latitude != null &&
        row.presence?.longitude != null &&
        row.presence.location_updated_at &&
        Date.now() - Date.parse(row.presence.location_updated_at) <= 15 * 60 * 1000
      );

      if (gpsFresh) {
        points.push({
          id: row.rep.id,
          name: row.rep.name,
          latitude: Number(row.presence!.latitude),
          longitude: Number(row.presence!.longitude),
          activity: row.activity.tone as "active" | "recent" | "quiet",
          detail: `${row.activity.label}${row.presence?.page_path ? ` · ${row.presence.page_path}` : ""}`,
          source: "gps",
        });
        continue;
      }

      const location = row.lastInteraction ? locationById.get(row.lastInteraction.locationId) : undefined;
      if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
        points.push({
          id: row.rep.id,
          name: row.rep.name,
          latitude: location.latitude as number,
          longitude: location.longitude as number,
          activity: row.activity.tone as "active" | "recent" | "quiet",
          detail: `${row.activity.label} · ${location.address}`,
          locationId: location.id,
          source: "field_event",
        });
      }
    }

    return points;
  }, [locationById, repRows]);

  const mapActivityPoints = useMemo(() => {
    return recentActivityForMap(visibleInteractions, locationById);
  }, [locationById, visibleInteractions]);

  const recentActivity = [...visibleInteractions]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 8);

  if (!canDispatch) {
    return (
      <AppShell>
        <section className="card access-panel">
          <div className="eyebrow">Manager & Dispatcher</div>
          <h1>Manager access required</h1>
          <p className="muted">This workspace is available to organization owners, admins, operations managers, and team managers.</p>
          <Link className="button secondary" href="/dashboard">Return to Command Center</Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="dispatch-hero">
        <div>
          <div className="eyebrow">Manager & Dispatcher</div>
          <h1>Run today’s operation</h1>
          <p>See rep activity, territory movement, appointments, sales, and operational exceptions from one live workspace.</p>
        </div>
        <div className="hero-actions dispatch-live-actions">
          <button className={`button secondary ${autoRefresh ? "live-enabled" : ""}`} type="button" onClick={() => setAutoRefresh((value) => !value)}>{autoRefresh ? "● Live refresh" : "Resume live"}</button>
          <button className="button secondary" type="button" onClick={refreshDispatch}>Refresh now</button>
          <Link className="button" href="/field">Open field workspace</Link>
          <Link className="button secondary" href="/reports">View reports</Link>
        </div>
      </section>

      <section className="dispatch-filterbar card" aria-label="Dispatch filters">
        <label>Team
          <select value={teamId} onChange={(event) => { setTeamId(event.target.value); setRepId(""); }}>
            <option value="">All teams</option>
            {config.teams.filter((team) => team.status === "active").map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label>Market
          <select value={marketId} onChange={(event) => { setMarketId(event.target.value); setTerritoryId(""); setRepId(""); }}>
            <option value="">All markets</option>
            {config.markets.filter((market) => market.status === "active").map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}
          </select>
        </label>
        <label>Territory
          <select value={territoryId} onChange={(event) => { setTerritoryId(event.target.value); setRepId(""); }}>
            <option value="">All territories</option>
            {config.territories.filter((territory) => (!marketId || territory.marketId === marketId) && (!teamId || territory.teamId === teamId)).map((territory) => <option key={territory.id} value={territory.id}>{territory.name}</option>)}
          </select>
        </label>
        <label>Representative
          <select value={repId} onChange={(event) => setRepId(event.target.value)}>
            <option value="">All reps</option>
            {config.reps.filter((rep) => rep.status === "active" && (!teamId || rep.teamId === teamId) && (!territoryId || rep.territoryIds.includes(territoryId))).map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
          </select>
        </label>
        <button className="button secondary compact-button" type="button" onClick={() => { setTeamId(""); setMarketId(""); setTerritoryId(""); setRepId(""); }}>Reset</button>
      </section>

      <section className="dispatch-metrics">
        <div className="dispatch-metric"><span>Active now</span><strong>{activeNow}</strong><small>{filteredReps.length} reps in view</small></div>
        <div className="dispatch-metric"><span>Locations worked</span><strong>{workedLocationIds.size}</strong><small>{visibleInteractions.length} interactions today</small></div>
        <div className="dispatch-metric"><span>Sales today</span><strong>{salesCount}</strong><small>{visibleOrders.filter((order) => order.reviewStatus === "needs_attention").length} need review</small></div>
        <div className="dispatch-metric"><span>Appointments</span><strong>{openAppointments}</strong><small>{completedAppointments} completed today</small></div>
        <div className={`dispatch-metric ${openExceptions ? "metric-warning" : ""}`}><span>Lifecycle exceptions</span><strong>{openExceptions}</strong><small>{openExceptions ? "Needs manager attention" : "No open exceptions"}</small></div>
      </section>

      <section className="card dispatch-panel dispatch-live-map-panel">
        <div className="dispatch-panel-header">
          <div>
            <div className="eyebrow">Live visibility</div>
            <h2>Rep activity map</h2>
            <p className="muted dispatch-map-note">GPS appears after a rep uses location services in Field Workspace. Otherwise the map falls back to the rep’s latest mapped field event.</p>
          </div>
          <div className="dispatch-live-meta">
            <span className={autoRefresh ? "live-dot-label active" : "live-dot-label"}><i />{autoRefresh ? "Refreshing every 30s" : "Live refresh paused"}</span>
            <small>{lastUpdatedAt ? `Updated ${shortTime(lastUpdatedAt)}` : "Waiting for live presence"}</small>
          </div>
        </div>
        {liveError && <div className="error-banner compact-error"><strong>Live presence</strong><span>{liveError}. Apply migration 019 if this feature has not been installed yet.</span></div>}
        <div className="dispatch-map-shell">
          <DispatchLiveMap
            reps={repMapPoints}
            activity={mapActivityPoints}
            selectedRepId={repId || undefined}
            onSelectRep={(id) => setRepId(id)}
          />
          <div className="dispatch-map-legend">
            <span><i className="rep-map-dot active" />Active</span>
            <span><i className="rep-map-dot recent" />Recent</span>
            <span><i className="rep-map-dot quiet" />Quiet</span>
            <span><i className="activity-map-dot" />Today’s field event</span>
          </div>
        </div>
      </section>

      <div className="dispatch-grid dispatch-grid-primary">
        <section className="card dispatch-panel">
          <div className="dispatch-panel-header">
            <div><div className="eyebrow">Live team</div><h2>Representative activity</h2></div>
            <Link className="text-link" href="/representatives">Manage reps</Link>
          </div>

          {repRows.length === 0 ? <div className="empty-state">No active representatives match these filters.</div> : (
            <div className="dispatch-rep-list">
              {repRows.map((row) => (
                <div className="dispatch-rep-row" key={row.rep.id}>
                  <div className={`rep-presence ${row.activity.tone}`} aria-hidden="true" />
                  <div className="rep-primary">
                    <strong>{row.rep.name}</strong>
                    <span>{row.rep.team || "Unassigned team"} · {row.rep.territoryIds.length} territor{row.rep.territoryIds.length === 1 ? "y" : "ies"}</span>
                  </div>
                  <div className="rep-status-cell"><span className={`status-pill ${row.activity.tone}`}>{row.activity.label}</span><small>{row.presence ? `${row.presence.page_path || "In app"} · seen ${shortTime(row.presence.last_seen_at)}` : row.lastSeen ? `Last field event ${shortTime(row.lastSeen)}` : "No activity yet"}</small></div>
                  <div className="rep-number"><strong>{row.worked}</strong><span>worked</span></div>
                  <div className="rep-number"><strong>{row.sales}</strong><span>sales</span></div>
                  <div className="rep-number"><strong>{row.appointments}</strong><span>appts</span></div>
                  <div className="rep-row-actions"><button className="button secondary compact-button" type="button" onClick={() => setRepId(row.rep.id)}>Map</button><Link className="button secondary compact-button" href="/field">Open field</Link></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card dispatch-panel dispatch-alert-panel">
          <div className="dispatch-panel-header"><div><div className="eyebrow">Intervention</div><h2>Needs attention</h2></div></div>
          <div className="dispatch-alert-list">
            <Link href="/lifecycle" className={openExceptions ? "dispatch-alert warning" : "dispatch-alert clear"}><span>Lifecycle exceptions</span><strong>{openExceptions}</strong><small>{openExceptions ? "Open exception records" : "Clear"}</small></Link>
            <Link href="/sales" className={visibleOrders.some((order) => order.reviewStatus === "needs_attention") ? "dispatch-alert warning" : "dispatch-alert clear"}><span>Orders needing review</span><strong>{visibleOrders.filter((order) => order.reviewStatus === "needs_attention").length}</strong><small>Today’s filtered orders</small></Link>
            <Link href="/scheduling" className={visibleAppointments.some((appointment) => appointment.status === "no_show") ? "dispatch-alert warning" : "dispatch-alert clear"}><span>No-shows</span><strong>{visibleAppointments.filter((appointment) => appointment.status === "no_show").length}</strong><small>Appointments today</small></Link>
            <Link href="/field" className="dispatch-alert"><span>Quiet reps</span><strong>{repRows.filter((row) => row.activity.tone === "quiet").length}</strong><small>No recent field event</small></Link>
          </div>
        </section>
      </div>

      <div className="dispatch-grid dispatch-grid-secondary">
        <section className="card dispatch-panel">
          <div className="dispatch-panel-header"><div><div className="eyebrow">Coverage</div><h2>Territory movement</h2></div><Link className="text-link" href="/territories">All territories</Link></div>
          {territoryRows.length === 0 ? <div className="empty-state">No territories match these filters.</div> : (
            <div className="dispatch-territory-list">
              {territoryRows.slice(0, 8).map((row) => {
                const coverage = row.totalLocations ? Math.min(100, Math.round((row.worked / row.totalLocations) * 100)) : 0;
                return (
                  <Link href={`/territories/${row.territory.id}`} className="dispatch-territory-row" key={row.territory.id}>
                    <div className="territory-title"><strong>{row.territory.name}</strong><span>{row.territory.market || "Unassigned market"} · {row.reps} reps</span></div>
                    <div className="territory-progress"><div><span style={{ width: `${coverage}%` }} /></div><small>{row.worked}/{row.totalLocations} worked</small></div>
                    <div className="territory-mini"><strong>{row.sales}</strong><span>sales</span></div>
                    <div className="territory-mini"><strong>{row.appointments}</strong><span>appts</span></div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="card dispatch-panel">
          <div className="dispatch-panel-header"><div><div className="eyebrow">Live feed</div><h2>Recent field activity</h2></div><Link className="text-link" href="/locations">Locations</Link></div>
          {recentActivity.length === 0 ? <div className="empty-state">No field interactions yet today.</div> : (
            <div className="dispatch-feed">
              {recentActivity.map((interaction) => {
                const location = locationById.get(interaction.locationId);
                const territory = location ? territoryById.get(location.territoryId) : undefined;
                return (
                  <Link href={`/locations/${interaction.locationId}`} className="dispatch-feed-row" key={interaction.id}>
                    <span className="feed-time">{shortTime(interaction.occurredAt)}</span>
                    <div><strong>{interaction.representativeName || "Representative"}</strong><span>{interaction.disposition} · {location?.address || "Location"}</span><small>{territory?.name || location?.territory || "Unassigned territory"}</small></div>
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
