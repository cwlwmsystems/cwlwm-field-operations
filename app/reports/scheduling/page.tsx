"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { pct } from "@/lib/reporting/liveMetrics";
import { downloadCsv, filterAppointments, pctValue, type DateRangeKey } from "@/lib/reporting/analytics";

export default function Page() {
  const scheduling = useSupabaseScheduling();
  const config = useSupabaseConfig();
  const [range, setRange] = useState<DateRangeKey>("30d");
  const appointments = useMemo(() => filterAppointments(scheduling.appointments, range), [range, scheduling.appointments]);

  const rows = config.territories.map((territory) => {
    const items = appointments.filter((item) => item.territoryId === territory.id);
    const completed = items.filter((item) => item.status === "completed").length;
    const cancelled = items.filter((item) => item.status === "cancelled").length;
    const noShow = items.filter((item) => item.status === "no_show").length;
    const active = items.filter((item) => ["booked", "confirmed", "rescheduled"].includes(item.status)).length;
    return { id: territory.id, name: territory.name, total: items.length, active, completed, cancelled, noShow, completionRate: pctValue(completed, items.length), noShowRate: pctValue(noShow, items.length) };
  }).sort((a, b) => b.total - a.total);

  const completed = appointments.filter((item) => item.status === "completed").length;
  const cancelled = appointments.filter((item) => item.status === "cancelled").length;
  const noShow = appointments.filter((item) => item.status === "no_show").length;

  return <AppShell>
    <div className="breadcrumbs"><Link href="/reports">Reports</Link><span>/</span>Scheduling</div>
    <div className="page-header report-header"><div><div className="eyebrow">Scheduling Analytics</div><h1>Appointment Outcomes</h1></div>
      <div className="report-toolbar"><select value={range} onChange={(e) => setRange(e.target.value as DateRangeKey)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All time</option></select>
        <button className="button secondary" onClick={() => downloadCsv("scheduling-performance.csv", rows.map((row) => ({
          Territory: row.name, Total: row.total, Active: row.active, Completed: row.completed, Cancelled: row.cancelled, "No Show": row.noShow, "Completion Rate": pct(row.completionRate), "No Show Rate": pct(row.noShowRate),
        })))}>Export CSV</button></div>
    </div>
    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Appointments</div><div className="metric">{appointments.length}</div></div>
      <div className="card"><div className="eyebrow">Completion rate</div><div className="metric">{pct(pctValue(completed, appointments.length))}</div></div>
      <div className="card"><div className="eyebrow">Cancellation rate</div><div className="metric">{pct(pctValue(cancelled, appointments.length))}</div></div>
      <div className="card"><div className="eyebrow">No-show rate</div><div className="metric">{pct(pctValue(noShow, appointments.length))}</div></div>
    </div>
    <div className="card table-card section-block"><table><thead><tr><th>Territory</th><th>Total</th><th>Active</th><th>Completed</th><th>Cancelled</th><th>No show</th><th>Completion</th><th>No-show rate</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.total}</td><td>{row.active}</td><td>{row.completed}</td><td>{row.cancelled}</td><td>{row.noShow}</td><td>{pct(row.completionRate)}</td><td>{pct(row.noShowRate)}</td></tr>)}</tbody>
    </table></div>
  </AppShell>;
}
