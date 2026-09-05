"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/browser";

type Shift = {
  id: string;
  representative_id: string;
  started_at: string;
  ended_at: string | null;
};

type ShiftBreak = {
  id: string;
  shift_session_id: string;
  started_at: string;
  ended_at: string | null;
};

type Rep = { id: string; full_name: string; email: string | null };

function duration(startedAt: string, endedAt: string | null) {
  const end = endedAt ? Date.parse(endedAt) : Date.now();
  return Math.max(0, Math.floor((end - Date.parse(startedAt)) / 1000));
}
function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function RepTimeReportPage() {
  const { organization } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [breaks, setBreaks] = useState<ShiftBreak[]>([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organization?.id) return;
    async function load() {
      setLoading(true);
      setError("");
      const supabase = createClient();
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [shiftRes, repRes, breakRes] = await Promise.all([
        supabase.from("rep_shift_sessions")
          .select("id,representative_id,started_at,ended_at")
          .eq("organization_id", organization!.id)
          .gte("started_at", since)
          .order("started_at", { ascending: false }),
        supabase.from("representatives")
          .select("id,full_name,email")
          .eq("organization_id", organization!.id)
          .order("full_name"),
        supabase.from("rep_shift_breaks")
          .select("id,shift_session_id,started_at,ended_at")
          .eq("organization_id", organization!.id)
          .gte("started_at", since)
          .order("started_at", { ascending: false }),
      ]);
      const firstError = shiftRes.error ?? repRes.error ?? breakRes.error;
      if (firstError) setError(firstError.message);
      else {
        setShifts(shiftRes.data ?? []);
        setReps(repRes.data ?? []);
        setBreaks(breakRes.data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [organization?.id, days]);

  const repNames = useMemo(() => new Map(reps.map((r) => [r.id, r.full_name])), [reps]);
  const breaksByShift = useMemo(() => {
    const map = new Map<string, number>();
    const now = Date.now();
    for (const item of breaks) {
      const end = item.ended_at ? Date.parse(item.ended_at) : now;
      const seconds = Math.max(0, Math.floor((end - Date.parse(item.started_at)) / 1000));
      map.set(item.shift_session_id, (map.get(item.shift_session_id) ?? 0) + seconds);
    }
    return map;
  }, [breaks]);

  const netDuration = (shift: Shift) => Math.max(
    0,
    duration(shift.started_at, shift.ended_at) - (breaksByShift.get(shift.id) ?? 0)
  );

  const isStaleOpen = (shift: Shift) =>
    !shift.ended_at && duration(shift.started_at, shift.ended_at) >= 14 * 3600;
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const shift of shifts) map.set(shift.representative_id, (map.get(shift.representative_id) ?? 0) + netDuration(shift));
    return Array.from(map.entries()).sort((a,b) => b[1]-a[1]);
  }, [shifts, breaksByShift]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Reports · Representative Time</div>
          <h1>Field Time Clock</h1>
          <p className="muted">Recorded clock-in/out sessions for field representatives.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <div className="form-message error">{error}</div>}

      <section className="grid rep-time-summary-grid">
        {totals.map(([repId, seconds]) => (
          <article className="card metric-card" key={repId}>
            <div className="metric-label">{repNames.get(repId) ?? "Representative"}</div>
            <div className="metric-value rep-time-value">{fmt(seconds)}</div>
            <div className="metric-sub">{shifts.filter((s) => s.representative_id === repId).length} shifts</div>
          </article>
        ))}
      </section>

      <section className="card table-card">
        <div className="section-heading-row"><div><div className="eyebrow">Shift history</div><h2>Clock records</h2></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Representative</th><th>Clock in</th><th>Clock out</th><th>Gross</th><th>Breaks</th><th>Worked</th><th>Status</th></tr></thead>
            <tbody>
              {!loading && shifts.length === 0 && <tr><td colSpan={7} className="muted">No shifts in this period.</td></tr>}
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <td>{repNames.get(shift.representative_id) ?? "Representative"}</td>
                  <td>{new Date(shift.started_at).toLocaleString()}</td>
                  <td>{shift.ended_at ? new Date(shift.ended_at).toLocaleString() : "—"}</td>
                  <td>{fmt(duration(shift.started_at, shift.ended_at))}</td>
                  <td>{fmt(breaksByShift.get(shift.id) ?? 0)}</td>
                  <td><strong>{fmt(netDuration(shift))}</strong></td>
                  <td>
                    <span className={`status-pill ${shift.ended_at ? "muted" : isStaleOpen(shift) ? "warning" : "success"}`}>
                      {shift.ended_at ? "Complete" : isStaleOpen(shift) ? "Long open shift" : "Clocked in"}
                    </span>
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
