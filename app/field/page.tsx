"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FieldMap } from "@/components/field/FieldMap";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fieldRoles } from "@/lib/auth/permissions";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling, type SlotAvailability } from "@/lib/scheduling/SupabaseSchedulingProvider";
import type { DemoLocation } from "@/lib/types/platform";
import { touchLivePresence } from "@/lib/presence/livePresence";

const writeRoles = new Set<string>(fieldRoles);
type Mode = "today" | "followups" | "appointments" | "sales" | "all";
type Position = { latitude: number; longitude: number };

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isKnockableLocation(location: { serviceStatus?: string }) {
  return !["current_customer", "do_not_knock", "vacant", "business"].includes(location.serviceStatus ?? "prospect");
}

function formatWhen(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function dispositionTone(value: string) {
  const normalized = value.toLowerCase();
  if (["sale", "sold", "installed", "activated", "interested"].some((word) => normalized.includes(word))) return "success";
  if (["no", "vacant", "cancel", "hard"].some((word) => normalized.includes(word))) return "warning";
  return "neutral";
}

function hasCoordinates(location: DemoLocation) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

function distance(a: Position, b: Position) {
  const toRad = (value: number) => value * Math.PI / 180;
  const earth = 3958.8;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function mapsUrl(location: DemoLocation) {
  if (hasCoordinates(location)) return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  const query = [location.address, location.city, location.state, location.postalCode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function routeDirectionsUrl(stops: DemoLocation[], currentPosition?: Position) {
  const mapped = stops.filter(hasCoordinates);
  if (!mapped.length) return "";
  if (mapped.length === 1) return mapsUrl(mapped[0]);
  const origin = currentPosition ? `${currentPosition.latitude},${currentPosition.longitude}` : `${mapped[0].latitude},${mapped[0].longitude}`;
  const destination = mapped[mapped.length - 1];
  const mids = mapped.slice(currentPosition ? 0 : 1, -1).slice(0, 8);
  const params = new URLSearchParams({ api: "1", origin, destination: `${destination.latitude},${destination.longitude}`, travelmode: "driving" });
  if (mids.length) params.set("waypoints", mids.map((stop) => `${stop.latitude},${stop.longitude}`).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function FieldWorkspacePage() {
  const { membership, user, organization } = useAuth();
  const config = useSupabaseConfig();
  const ops = useSupabaseTerritoryOps();
  const sales = useSupabaseSales();
  const scheduling = useSupabaseScheduling();

  const role = membership?.role ?? "viewer";
  const canWrite = writeRoles.has(role);
  const currentRep = config.reps.find((rep) => rep.email && rep.email.toLowerCase() === user?.email?.toLowerCase());

  const baseLocations = useMemo(() => {
    if (role !== "representative" || !currentRep) return config.locations;
    const territoryIds = new Set(currentRep.territoryIds);
    return config.locations.filter((location) => location.assignedRepId === currentRep.id || territoryIds.has(location.territoryId));
  }, [config.locations, currentRep, role]);

  const territoryOptions = useMemo(() => {
    const ids = new Set(baseLocations.map((location) => location.territoryId).filter(Boolean));
    return config.territories.filter((territory) => ids.has(territory.id));
  }, [baseLocations, config.territories]);

  const [territoryId, setTerritoryId] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("today");
  const [serviceFilter, setServiceFilter] = useState<"all" | "prospect" | "current_customer" | "do_not_knock" | "vacant" | "business">("all");
  const [selectedId, setSelectedId] = useState("");
  const [routeOrderIds, setRouteOrderIds] = useState<string[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Position | undefined>();
  const [gpsMessage, setGpsMessage] = useState("");
  const [dispositionId, setDispositionId] = useState("");
  const [note, setNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [arrivedStopId, setArrivedStopId] = useState("");
  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);
  const [skippedStopIds, setSkippedStopIds] = useState<string[]>([]);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotAvailability[]>([]);
  const [rescheduling, setRescheduling] = useState(false);

  const today = dateKey(new Date());
  const endOfToday = new Date(`${today}T23:59:59`).getTime();

  const latestInteractionByLocation = useMemo(() => {
    const map = new Map<string, (typeof ops.interactions)[number]>();
    for (const interaction of [...ops.interactions].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))) {
      if (!map.has(interaction.locationId)) map.set(interaction.locationId, interaction);
    }
    return map;
  }, [ops.interactions]);

  const activeOrderByLocation = useMemo(() => {
    const map = new Map<string, (typeof sales.orders)[number]>();
    for (const order of [...sales.orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
      if (order.orderStatus === "cancelled" || map.has(order.locationId)) continue;
      map.set(order.locationId, order);
    }
    return map;
  }, [sales.orders]);

  const soldLocationIds = useMemo(() => new Set(activeOrderByLocation.keys()), [activeOrderByLocation]);

  const dueFollowUpIds = useMemo(() => {
    const ids = new Set<string>();

    // Only the latest interaction should determine whether a location
    // still has an active follow-up. Historical follow-up interactions
    // remain in the timeline for audit/history, but a newer outcome such
    // as a Sale with followUpNeeded=false clears the active follow-up state.
    for (const interaction of latestInteractionByLocation.values()) {
      if (soldLocationIds.has(interaction.locationId)) continue;
      if (!interaction.followUpNeeded || !interaction.followUpAt) continue;

      const due = Date.parse(interaction.followUpAt);

      if (Number.isFinite(due) && due <= endOfToday) {
        ids.add(interaction.locationId);
      }
    }

    return ids;
  }, [latestInteractionByLocation, endOfToday, soldLocationIds]);

  const appointmentLocationIds = useMemo(() => new Set(
    scheduling.appointments
      .filter((appointment) => appointment.date === today && !["cancelled", "completed"].includes(appointment.status))
      .map((appointment) => appointment.locationId)
  ), [scheduling.appointments, today]);

  const openAttemptLocationIds = useMemo(() => new Set(
    sales.attempts.filter((attempt) => attempt.status === "in_progress").map((attempt) => attempt.locationId)
  ), [sales.attempts]);

  const filteredLocations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return baseLocations
      .filter((location) => !territoryId || location.territoryId === territoryId)
      .filter((location) => !normalized || [location.address, location.city, location.state, location.postalCode, location.externalId, location.disposition]
        .some((value) => value?.toLowerCase().includes(normalized)))
      .filter((location) => {
        if (serviceFilter !== "all" && (location.serviceStatus ?? "prospect") !== serviceFilter) return false;
        if (mode === "followups") return isKnockableLocation(location) && dueFollowUpIds.has(location.id);
        if (mode === "appointments") return appointmentLocationIds.has(location.id);
        if (mode === "sales") return isKnockableLocation(location) && openAttemptLocationIds.has(location.id);
        if (mode === "today") {
          if (!isKnockableLocation(location)) return false;
          if (soldLocationIds.has(location.id)) return false;
          return dueFollowUpIds.has(location.id) || appointmentLocationIds.has(location.id) || openAttemptLocationIds.has(location.id) || location.disposition === "Unvisited";
        }
        return true;
      })
      .sort((a, b) => {
        const score = (location: DemoLocation) =>
          (appointmentLocationIds.has(location.id) ? 40 : 0) +
          (dueFollowUpIds.has(location.id) ? 30 : 0) +
          (openAttemptLocationIds.has(location.id) ? 20 : 0) +
          (location.disposition === "Unvisited" ? 10 : 0);
        return score(b) - score(a) || a.address.localeCompare(b.address);
      });
  }, [appointmentLocationIds, baseLocations, dueFollowUpIds, mode, openAttemptLocationIds, query, serviceFilter, soldLocationIds, territoryId]);

  useEffect(() => {
    const ids = filteredLocations.map((location) => location.id);
    setRouteOrderIds((current) => {
      const retained = current.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !retained.includes(id));
      return [...retained, ...missing];
    });
    if (filteredLocations.length === 0) setSelectedId("");
    else if (!selectedId || !filteredLocations.some((location) => location.id === selectedId)) setSelectedId(filteredLocations[0].id);
  }, [filteredLocations, selectedId]);

  useEffect(() => {
    if (!dispositionId) setDispositionId(config.dispositions.find((item) => item.isActive !== false)?.id ?? "");
  }, [config.dispositions, dispositionId]);

  const routeStops = useMemo(() => routeOrderIds.map((id) => filteredLocations.find((location) => location.id === id)).filter(Boolean) as DemoLocation[], [filteredLocations, routeOrderIds]);
  const mappedCount = routeStops.filter(hasCoordinates).length;
  const unmappedCount = routeStops.length - mappedCount;
  const directionsUrl = routeDirectionsUrl(routeStops, currentPosition);
  const completedStopSet = useMemo(() => new Set(completedStopIds), [completedStopIds]);
  const skippedStopSet = useMemo(() => new Set(skippedStopIds), [skippedStopIds]);
  const activeRouteStops = routeStops.filter((location) => !soldLocationIds.has(location.id) && !completedStopSet.has(location.id) && !skippedStopSet.has(location.id));
  const currentStop = activeRouteStops[0];
  const finishedCount = routeStops.filter((location) => soldLocationIds.has(location.id) || completedStopSet.has(location.id) || skippedStopSet.has(location.id)).length;
  const routeProgress = routeStops.length ? Math.round((finishedCount / routeStops.length) * 100) : 0;

  const selected = baseLocations.find((location) => location.id === selectedId);
  const selectedTerritory = config.territories.find((territory) => territory.id === selected?.territoryId);
  const selectedRep = config.reps.find((rep) => rep.id === selected?.assignedRepId);
  const selectedDisposition = config.dispositions.find((item) => item.id === dispositionId);
  const selectedLatestInteraction = selected ? latestInteractionByLocation.get(selected.id) : undefined;
  const selectedAttempt = selected ? sales.attempts.find((attempt) => attempt.locationId === selected.id && attempt.status === "in_progress") : undefined;
  const selectedOrder = selected ? [...sales.orders].reverse().find((order) => order.locationId === selected.id) : undefined;
  const selectedActiveOrder = selected ? activeOrderByLocation.get(selected.id) : undefined;
  const selectedIsSold = Boolean(selectedActiveOrder);
  const selectedAppointment = selected ? scheduling.appointments.find((appointment) => appointment.locationId === selected.id && !["cancelled", "completed"].includes(appointment.status)) : undefined;

  const selectLocation = useCallback((id: string) => {
    setSelectedId(id);
    setMobilePanelOpen(true);
  }, []);

  function selectNextActive(afterId?: string) {
    const startIndex = afterId ? routeStops.findIndex((location) => location.id === afterId) : -1;
    const ordered = [...routeStops.slice(startIndex + 1), ...routeStops.slice(0, Math.max(0, startIndex + 1))];
    const next = ordered.find((location) => !completedStopSet.has(location.id) && !skippedStopSet.has(location.id));
    if (next) {
      setSelectedId(next.id);
      setMobilePanelOpen(true);
      setArrivedStopId("");
    }
    return next;
  }

  function markArrived(id: string) {
    if (soldLocationIds.has(id)) {
      setSelectedId(id);
      setMobilePanelOpen(true);
      setMessage("This location already has a submitted sale and is locked from normal field updates.");
      return;
    }
    setSelectedId(id);
    setArrivedStopId(id);
    setMobilePanelOpen(true);
    setMessage("Arrived at stop. Record the outcome when the visit is complete.");
  }

  function skipStop(id: string) {
    if (soldLocationIds.has(id)) {
      setSelectedId(id);
      setMessage("Sold locations are already complete and cannot be skipped.");
      return;
    }
    setSkippedStopIds((current) => current.includes(id) ? current : [...current, id]);
    setArrivedStopId((current) => current === id ? "" : current);
    setMessage("Stop skipped for this route.");
    selectNextActive(id);
  }

  function resetRouteProgress() {
    setCompletedStopIds([]);
    setSkippedStopIds([]);
    setArrivedStopId("");
    setMessage("Route progress reset.");
    if (routeStops[0]) setSelectedId(routeStops[0].id);
  }

  function requestGps() {
    if (!navigator.geolocation) {
      setGpsMessage("Location services are not available in this browser.");
      return;
    }
    setGpsMessage("Locating…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCurrentPosition(nextPosition);
        if (organization?.id) {
          touchLivePresence({
            organizationId: organization.id,
            pagePath: "/field",
            latitude: nextPosition.latitude,
            longitude: nextPosition.longitude,
            accuracyMeters: position.coords.accuracy,
          }).catch(() => undefined);
        }
        setGpsMessage("Using your current position for route optimization and dispatcher visibility.");
      },
      () => setGpsMessage("Unable to access your current position. Check browser location permissions."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function optimizeRoute() {
    const mapped = routeStops.filter(hasCoordinates);
    const unmapped = routeStops.filter((location) => !hasCoordinates(location));
    if (mapped.length < 2) {
      setGpsMessage("At least two mapped stops are needed to optimize the route.");
      return;
    }
    let cursor: Position = currentPosition ?? { latitude: mapped[0].latitude as number, longitude: mapped[0].longitude as number };
    const remaining = [...mapped];
    const ordered: DemoLocation[] = [];
    if (!currentPosition) {
      ordered.push(remaining.shift()!);
      cursor = { latitude: ordered[0].latitude as number, longitude: ordered[0].longitude as number };
    }
    while (remaining.length) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((location, index) => {
        const miles = distance(cursor, { latitude: location.latitude as number, longitude: location.longitude as number });
        if (miles < bestDistance) { bestDistance = miles; bestIndex = index; }
      });
      const next = remaining.splice(bestIndex, 1)[0];
      ordered.push(next);
      cursor = { latitude: next.latitude as number, longitude: next.longitude as number };
    }
    setRouteOrderIds([...ordered, ...unmapped].map((location) => location.id));
    setSelectedId(ordered[0]?.id ?? selectedId);
    setArrivedStopId("");
    setGpsMessage(currentPosition ? "Route reordered from your current position." : "Route reordered by nearest mapped stop.");
  }

  function moveStop(id: string, direction: -1 | 1) {
    setRouteOrderIds((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveInteraction() {
    if (!selected || !dispositionId || !canWrite) return;
    if (selected && !isKnockableLocation(selected)) {
      setMessage("This location is not available for normal knocking based on its service status.");
      return;
    }
    if (selectedIsSold) {
      setMessage("This sale is locked. Use order, lifecycle, or scheduling controls for changes after submission.");
      return;
    }
    if (selectedDisposition?.requiresNote && !note.trim()) {
      setMessage("This disposition requires a note.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await ops.addInteraction({
        locationId: selected.id,
        representativeId: selected.assignedRepId || currentRep?.id || undefined,
        territoryId: selected.territoryId || undefined,
        teamId: selected.teamId || undefined,
        dispositionId,
        note: note.trim() || undefined,
        followUpNeeded: selectedDisposition?.requiresFollowUp ?? false,
        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      });
      setNote("");
      setFollowUpAt("");
      setCompletedStopIds((current) => current.includes(selected.id) ? current : [...current, selected.id]);
      setSkippedStopIds((current) => current.filter((id) => id !== selected.id));
      setArrivedStopId("");
      const next = selectNextActive(selected.id);
      setMessage(next ? `Visit saved. Next stop: ${next.address}.` : "Visit saved. Route complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save interaction.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!rescheduleOpen || !selectedAppointment || !rescheduleDate) return;
    scheduling.getAvailability(selectedAppointment.territoryId, rescheduleDate)
      .then(setRescheduleSlots)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load install slots."));
  }, [rescheduleOpen, rescheduleDate, selectedAppointment?.id, selectedAppointment?.territoryId, scheduling.policies, scheduling.appointments]);

  function openReschedule() {
    if (!selectedAppointment) return;
    setRescheduleDate(selectedAppointment.date);
    setRescheduleTime("");
    setRescheduleSlots([]);
    setRescheduleOpen(true);
    setMessage("");
  }

  async function confirmReschedule() {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
    const previous = `${selectedAppointment.date} · ${selectedAppointment.time}`;
    setRescheduling(true);
    setMessage("");
    try {
      await scheduling.rescheduleAppointment(selectedAppointment.id, rescheduleDate, rescheduleTime);
      setRescheduleOpen(false);
      setRescheduleTime("");
      setMessage(`Install rescheduled from ${previous} to ${rescheduleDate} · ${rescheduleTime}. The original slot has been released.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reschedule install.");
    } finally {
      setRescheduling(false);
    }
  }

  const todayAppointments = scheduling.appointments.filter((appointment) => appointment.date === today && baseLocations.some((location) => location.id === appointment.locationId) && !["cancelled", "completed"].includes(appointment.status)).length;
  const dueFollowUps = baseLocations.filter((location) => dueFollowUpIds.has(location.id)).length;
  const openAttempts = sales.attempts.filter((attempt) => attempt.status === "in_progress" && baseLocations.some((location) => location.id === attempt.locationId)).length;
  const unvisited = baseLocations.filter((location) => !soldLocationIds.has(location.id) && location.disposition === "Unvisited").length;

  return (
    <AppShell>
      <section className="field-hero">
        <div>
          <div className="eyebrow">Field Workspace · Map & Route Operations</div>
          <h1>{role === "representative" && currentRep ? `Today for ${currentRep.name}` : "Run the field from the map"}</h1>
          <p>Plan the stop sequence, trace the route, focus a location, record the visit, and move directly to the next stop.</p>
        </div>
        <div className="field-hero-actions">
          <button className="button secondary" onClick={requestGps}>Use my location</button>
          {directionsUrl && <a className="button" href={directionsUrl} target="_blank" rel="noreferrer">Navigate route</a>}
        </div>
      </section>

      <section className="field-summary-strip" aria-label="Today summary">
        <button className={mode === "today" ? "active" : ""} onClick={() => setMode("today")}><span>Today queue</span><strong>{mode === "today" ? filteredLocations.length : baseLocations.filter((location) => !soldLocationIds.has(location.id) && (dueFollowUpIds.has(location.id) || appointmentLocationIds.has(location.id) || openAttemptLocationIds.has(location.id) || location.disposition === "Unvisited")).length}</strong><small>prioritized stops</small></button>
        <button className={mode === "appointments" ? "active" : ""} onClick={() => setMode("appointments")}><span>Appointments</span><strong>{todayAppointments}</strong><small>scheduled today</small></button>
        <button className={mode === "followups" ? "active" : ""} onClick={() => setMode("followups")}><span>Follow-ups due</span><strong>{dueFollowUps}</strong><small>due or overdue</small></button>
        <button className={mode === "sales" ? "active" : ""} onClick={() => setMode("sales")}><span>Open sales</span><strong>{openAttempts}</strong><small>resume in progress</small></button>
        <button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}><span>Unvisited</span><strong>{unvisited}</strong><small>remaining locations</small></button>
      </section>

      <section className="field-toolbar card">
        <div className="field-mode-tabs">
          <button className={mode === "today" ? "active" : ""} onClick={() => setMode("today")}>Today</button>
          <button className={mode === "followups" ? "active" : ""} onClick={() => setMode("followups")}>Follow-ups</button>
          <button className={mode === "appointments" ? "active" : ""} onClick={() => setMode("appointments")}>Appointments</button>
          <button className={mode === "sales" ? "active" : ""} onClick={() => setMode("sales")}>Open sales</button>
          <button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>All locations</button>
        </div>
        <div className="field-filters">
          <select value={territoryId} onChange={(event) => setTerritoryId(event.target.value)} aria-label="Territory filter">
            <option value="">All territories</option>
            {territoryOptions.map((territory) => <option key={territory.id} value={territory.id}>{territory.name}</option>)}
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search address, city, ID, disposition…" aria-label="Search locations" />
        </div>
      </section>

      {(config.error || ops.error || sales.error || scheduling.error) && <div className="error-banner"><strong>Field workspace issue</strong><span>{config.error || ops.error || sales.error || scheduling.error}</span></div>}

      {routeStops.length > 0 && (
        <section className="field-route-command card">
          <div className="route-command-progress">
            <div>
              <div className="eyebrow">Route Progress</div>
              <strong>{finishedCount} of {routeStops.length} stops worked</strong>
            </div>
            <div className="route-progress-track" aria-label={`${routeProgress}% route complete`}><span style={{ width: `${routeProgress}%` }} /></div>
            <small>{routeProgress}% complete</small>
          </div>
          <div className="route-current-stop">
            <span className="route-current-label">{currentStop ? "Current stop" : "Route status"}</span>
            {currentStop ? (
              <>
                <div className="route-current-copy">
                  <strong>{currentStop.address}</strong>
                  <span>{currentStop.city}, {currentStop.state}{appointmentLocationIds.has(currentStop.id) ? " · Appointment today" : dueFollowUpIds.has(currentStop.id) ? " · Follow-up due" : ""}</span>
                </div>
                <div className="route-current-actions">
                  <button className="button secondary compact-button" onClick={() => selectLocation(currentStop.id)}>Open</button>
                  <a className="button secondary compact-button" href={mapsUrl(currentStop)} target="_blank" rel="noreferrer">Navigate</a>
                  <button className="button compact-button" onClick={() => markArrived(currentStop.id)}>{arrivedStopId === currentStop.id ? "Arrived ✓" : "I’m here"}</button>
                  <button className="text-button" onClick={() => skipStop(currentStop.id)}>Skip</button>
                </div>
              </>
            ) : (
              <div className="route-complete-state"><strong>Route complete</strong><span>All visible stops are completed or skipped.</span><button className="button secondary compact-button" onClick={resetRouteProgress}>Reset progress</button></div>
            )}
          </div>
        </section>
      )}

      <div className="field-map-workspace">
        <section className="card field-route-panel field-route-panel-map">
          <div className="field-panel-heading">
            <div><div className="eyebrow">Route Tracer</div><h2>{mode === "followups" ? "Follow-ups due" : mode === "appointments" ? "Appointments" : mode === "sales" ? "Open sales" : mode === "all" ? "Location directory" : "Today’s game plan"}</h2></div>
            <span className="count-pill">{routeStops.length}</span>
          </div>
          <div className="route-toolbar">
            <button className="button secondary compact-button" onClick={optimizeRoute}>Optimize stops</button>
            <span>{mappedCount} mapped{unmappedCount ? ` · ${unmappedCount} need coordinates` : ""}</span>
          </div>
          {gpsMessage && <div className="route-message">{gpsMessage}</div>}
          {config.loading || ops.loading ? <div className="empty-state">Loading field activity…</div> : routeStops.length === 0 ? <div className="empty-state">No locations match this view.</div> : (
            <div className="field-stop-list">
              {routeStops.map((location, index) => {
                const territory = config.territories.find((item) => item.id === location.territoryId);
                const latest = latestInteractionByLocation.get(location.id);
                const hasAppointment = appointmentLocationIds.has(location.id);
                const hasFollowUp = dueFollowUpIds.has(location.id);
                const hasAttempt = openAttemptLocationIds.has(location.id);
                const hasSale = soldLocationIds.has(location.id);
                return (
                  <div key={location.id} className={`field-stop ${selectedId === location.id ? "active" : ""} ${currentStop?.id === location.id ? "current" : ""} ${hasSale || completedStopSet.has(location.id) ? "completed" : ""} ${skippedStopSet.has(location.id) ? "skipped" : ""}`}>
                    <button className="field-stop-main" onClick={() => selectLocation(location.id)}>
                      <span className="stop-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="stop-copy">
                        <strong>{location.address}</strong>
                        <span>{location.city}, {location.state} · {territory?.name ?? "Unassigned territory"}</span>
                        <span className="stop-signals">
                          {hasSale && <em className="signal sale">SALE</em>}
                          {!hasSale && currentStop?.id === location.id && <em className="signal current">Current</em>}
                          {completedStopSet.has(location.id) && <em className="signal completed">Done</em>}
                          {skippedStopSet.has(location.id) && <em className="signal skipped">Skipped</em>}
                          {arrivedStopId === location.id && !completedStopSet.has(location.id) && <em className="signal arrived">Arrived</em>}
                          {hasAppointment && <em className="signal appointment">Appointment</em>}
                          {hasFollowUp && <em className="signal followup">Follow-up</em>}
                          {hasAttempt && <em className="signal sale">Open sale</em>}
                          {!hasCoordinates(location) && <em className="signal warning">No map pin</em>}
                          {!hasSale && !hasAppointment && !hasFollowUp && !hasAttempt && <em className="signal neutral">{latest?.disposition ?? location.disposition}</em>}
                        </span>
                      </span>
                      <span className={`status-orb ${dispositionTone(latest?.disposition ?? location.disposition)}`} />
                    </button>
                    <span className="route-order-controls">
                      <button aria-label="Move stop up" disabled={index === 0} onClick={() => moveStop(location.id, -1)}>↑</button>
                      <button aria-label="Move stop down" disabled={index === routeStops.length - 1} onClick={() => moveStop(location.id, 1)}>↓</button>
                    </span>
                    <span className="route-stop-actions">
                      {!hasSale && !completedStopSet.has(location.id) && !skippedStopSet.has(location.id) && <button onClick={() => markArrived(location.id)}>{arrivedStopId === location.id ? "Arrived" : "Arrive"}</button>}
                      {!hasSale && !completedStopSet.has(location.id) && !skippedStopSet.has(location.id) && <button onClick={() => skipStop(location.id)}>Skip</button>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="field-map-main">
          <section className="card field-map-card">
            <div className="field-map-header">
              <div><div className="eyebrow">Live Territory Map</div><h2>Route & location view</h2></div>
              <div className="field-map-legend"><span><i className="legend-dot unvisited" />Unvisited</span><span><i className="legend-dot visited" />Visited</span><span><i className="legend-dot followup" />Follow-up</span><span><i className="legend-dot sale" />Sale</span><span><i className="legend-dot gps" />You</span></div>
            </div>
            <FieldMap locations={filteredLocations} routeIds={routeOrderIds} selectedId={selectedId} currentPosition={currentPosition} onSelect={selectLocation} />
          </section>

          {!selected ? (
            <div className="card field-empty-focus"><div className="eyebrow">Location Focus</div><h2>Select a location</h2><p className="muted">Choose a stop from the route board or map.</p></div>
          ) : (
            <div className={`field-location-sheet ${mobilePanelOpen ? "mobile-open" : ""}`}>
              <div className="field-location-sheet-handle" aria-hidden="true" />
              <button className="field-location-sheet-close" type="button" onClick={() => setMobilePanelOpen(false)} aria-label="Close location panel">×</button>
              <section className="card field-location-card">
                <div className={`field-stop-state-ribbon ${selectedIsSold ? "completed sale-locked" : completedStopSet.has(selected.id) ? "completed" : skippedStopSet.has(selected.id) ? "skipped" : arrivedStopId === selected.id ? "arrived" : currentStop?.id === selected.id ? "current" : ""}`}>
                  <span>{selectedIsSold ? "SALE COMPLETED" : completedStopSet.has(selected.id) ? "Completed" : skippedStopSet.has(selected.id) ? "Skipped" : arrivedStopId === selected.id ? "Arrived" : currentStop?.id === selected.id ? "Current route stop" : "Route stop"}</span>
                  {selectedAppointment && <strong>Appointment · {selectedAppointment.time}</strong>}
                  {!selectedAppointment && dueFollowUpIds.has(selected.id) && <strong>Follow-up due</strong>}
                </div>
                <div className="field-location-topline">
                  <div><div className="eyebrow">Location Focus</div><h2>{selected.address}</h2><p>{selected.city}, {selected.state} {selected.postalCode}</p></div>
                  <span className={`badge ${dispositionTone(selectedLatestInteraction?.disposition ?? selected.disposition)}`}>{selectedLatestInteraction?.disposition ?? selected.disposition}</span>
                </div>
                <div className="field-location-meta">
                  <div><span>Territory</span><strong>{selectedTerritory?.name ?? "Unassigned"}</strong></div>
                  <div><span>Representative</span><strong>{selectedRep?.name ?? currentRep?.name ?? "Unassigned"}</strong></div>
                  <div><span>Map</span><strong>{hasCoordinates(selected) ? `${selected.latitude?.toFixed(5)}, ${selected.longitude?.toFixed(5)}` : "Coordinates needed"}</strong></div>
                  <div><span>Last activity</span><strong>{formatWhen(selectedLatestInteraction?.occurredAt)}</strong></div>
                </div>
                <div className="field-location-actions">
                  <a className="button secondary" href={mapsUrl(selected)} target="_blank" rel="noreferrer">Navigate to stop</a>
                  {!selectedIsSold && <button className="button secondary" type="button" onClick={() => markArrived(selected.id)}>{arrivedStopId === selected.id ? "Arrived ✓" : "Mark arrived"}</button>}
                  {selectedAppointment && canWrite ? <button className="button secondary" type="button" onClick={openReschedule}>Reschedule install</button> : <Link className="button secondary" href={`/scheduling`}>{selectedAppointment ? "View appointment" : "Schedule"}</Link>}
                  <Link className="button secondary" href={`/locations/${selected.id}`}>Full history</Link>
                  {canWrite && !selectedIsSold && (selectedAttempt ? <Link className="button" href={`/sales/new/${selected.id}?attempt=${selectedAttempt.id}`}>Resume sale</Link> : <Link className="button" href={`/sales/new/${selected.id}`}>Start sale</Link>)}
                  {!selectedIsSold && !completedStopSet.has(selected.id) && !skippedStopSet.has(selected.id) && <button className="text-button danger-text" type="button" onClick={() => skipStop(selected.id)}>Skip this stop</button>}
                </div>
              </section>

              <div className="field-context-grid">
                <section className="card field-context-card"><div className="eyebrow">Active Work</div><h3>What needs attention</h3><div className="field-context-list">
                  {selectedAppointment ? <div><span>Appointment</span><strong>{selectedAppointment.date} · {selectedAppointment.time}</strong><small>{selectedAppointment.status.replaceAll("_", " ")}</small></div> : <div><span>Appointment</span><strong>None scheduled</strong><small>Open scheduling when needed</small></div>}
                  {selectedIsSold ? <div><span>Sales state</span><strong>Sale locked</strong><small>Normal field outcomes are disabled</small></div> : selectedAttempt ? <div><span>Sales attempt</span><strong>Step {selectedAttempt.progressStep}/4</strong><small>{selectedAttempt.progressStage}</small></div> : <div><span>Sales attempt</span><strong>No open attempt</strong><small>Ready to start from this location</small></div>}
                  {selectedOrder ? <div><span>Latest order</span><strong>{selectedOrder.productNameSnapshot}</strong><small>{selectedOrder.reviewStatus.replaceAll("_", " ")}</small></div> : <div><span>Latest order</span><strong>No order yet</strong><small>Nothing submitted for this location</small></div>}
                </div></section>
                <section className="card field-context-card"><div className="eyebrow">Last Contact</div><h3>{selectedLatestInteraction?.disposition ?? "No activity yet"}</h3>{selectedLatestInteraction ? <div className="last-contact-copy"><p>{selectedLatestInteraction.note || "No note recorded."}</p><span>{formatWhen(selectedLatestInteraction.occurredAt)} · {selectedLatestInteraction.representativeName}</span>{selectedLatestInteraction.followUpNeeded && <strong>Follow-up {selectedLatestInteraction.followUpAt ? formatWhen(selectedLatestInteraction.followUpAt) : "required"}</strong>}</div> : <p className="muted">This location has not been worked yet.</p>}</section>
              </div>

              {selectedIsSold ? (
                <section className="card field-disposition-card sale-lock-card">
                  <div className="field-panel-heading">
                    <div><div className="eyebrow">Protected Sale State</div><h2>Sale completed</h2></div>
                    <span className="sale-lock-badge">LOCKED</span>
                  </div>
                  <div className="sale-lock-summary">
                    <div><span>Product</span><strong>{selectedActiveOrder?.productNameSnapshot ?? "Submitted order"}</strong></div>
                    <div><span>Order status</span><strong>{selectedActiveOrder?.orderStatus.replaceAll("_", " ")}</strong></div>
                    <div><span>Review</span><strong>{selectedActiveOrder?.reviewStatus.replaceAll("_", " ")}</strong></div>
                    <div><span>Submitted</span><strong>{formatWhen(selectedActiveOrder?.createdAt)}</strong></div>
                  </div>
                  <p className="sale-lock-note">Normal dispositions, arrival changes, skipping, and starting another sale are disabled after submission. Use scheduling to move the install, or order/lifecycle controls for post-sale corrections.</p>
                  {message && <div className="form-message">{message}</div>}
                </section>
              ) : (
              <section className="card field-disposition-card">
                <div className="field-panel-heading"><div><div className="eyebrow">Quick Update</div><h2>Record the visit</h2></div>{!canWrite && <span className="read-only-pill">Read only</span>}</div>
                <div className="quick-disposition-grid">{config.dispositions.filter((item) => item.isActive !== false).slice(0, 6).map((item) => <button key={item.id} disabled={!canWrite} className={dispositionId === item.id ? "active" : ""} onClick={() => setDispositionId(item.id)}><strong>{item.name}</strong><span>{item.requiresFollowUp ? "Follow-up" : item.marksSale ? "Sale" : item.marksContact ? "Contact" : "Field result"}</span></button>)}</div>
                <div className="field-note-form">
                  <label>Disposition<select value={dispositionId} disabled={!canWrite} onChange={(event) => setDispositionId(event.target.value)}>{config.dispositions.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="field-note-wide">Visit note<textarea value={note} disabled={!canWrite} onChange={(event) => setNote(event.target.value)} placeholder={selectedDisposition?.requiresNote ? "Required for this disposition" : "Optional notes from the visit"} /></label>
                  {selectedDisposition?.requiresFollowUp && <label>Follow-up<input type="datetime-local" value={followUpAt} disabled={!canWrite} onChange={(event) => setFollowUpAt(event.target.value)} /></label>}
                </div>
                {message && <div className="form-message">{message}</div>}
                <div className="field-save-row"><span>{selectedDisposition?.description || "Save the current field outcome to the location timeline."}</span><button className="button" disabled={!canWrite || saving || !dispositionId} onClick={saveInteraction}>{saving ? "Saving…" : arrivedStopId === selected.id ? "Complete visit & next stop" : "Save outcome & next stop"}</button></div>
              </section>
              )}
            </div>
          )}
        </section>
      </div>

      {rescheduleOpen && selectedAppointment && (
        <div className="modal-backdrop">
          <div className="card modal-card install-reschedule-modal">
            <div className="section-heading">
              <div><div className="eyebrow">Install Reschedule</div><h2>Move the appointment</h2></div>
              <button className="link-button" onClick={() => setRescheduleOpen(false)}>Close</button>
            </div>
            <div className="reschedule-current-slot">
              <span>Current install</span>
              <strong>{selectedAppointment.date} · {selectedAppointment.time}</strong>
              <small>When confirmed, this slot is released and the appointment moves to the new slot.</small>
            </div>
            <label className="modal-label">New date
              <input type="date" value={rescheduleDate} onChange={(event) => { setRescheduleDate(event.target.value); setRescheduleTime(""); }} />
            </label>
            <div className="slot-grid compact-slots">
              {rescheduleSlots.map((slot) => (
                <button type="button" disabled={!slot.available} key={slot.key} className={`slot-card slot-button ${rescheduleTime === slot.time ? "selected" : ""} ${slot.available ? "available" : "unavailable"}`} onClick={() => setRescheduleTime(slot.time)}>
                  <strong>{slot.time}</strong>
                  <span>{slot.available ? `${slot.remaining} remaining` : "Unavailable"}</span>
                </button>
              ))}
            </div>
            {!rescheduleSlots.length && <div className="empty-inline">No available install slots for this date.</div>}
            <div className="form-actions">
              <button className="button" disabled={!rescheduleTime || rescheduling} onClick={confirmReschedule}>{rescheduling ? "Moving install…" : "Confirm reschedule"}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
