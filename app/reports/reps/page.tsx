"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";
import { pct } from "@/lib/reporting/liveMetrics";
import {
  downloadCsv,
  filterAppointments,
  filterAttempts,
  filterInteractions,
  filterOrders,
  repMetrics,
  type DateRangeKey,
} from "@/lib/reporting/analytics";

export default function Page() {
  const config = useSupabaseConfig();
  const sales = useSupabaseSales();
  const scheduling = useSupabaseScheduling();
  const ops = useSupabaseTerritoryOps();
  const [range, setRange] = useState<DateRangeKey>("30d");
  const [teamId, setTeamId] = useState("all");

  const attempts = useMemo(() => filterAttempts(sales.attempts, range), [range, sales.attempts]);
  const orders = useMemo(() => filterOrders(sales.orders, range), [range, sales.orders]);
  const appointments = useMemo(() => filterAppointments(scheduling.appointments, range), [range, scheduling.appointments]);
  const interactions = useMemo(() => filterInteractions(ops.interactions, range), [ops.interactions, range]);

  const rows = config.reps
    .filter((rep) => teamId === "all" || rep.teamId === teamId)
    .map((rep) => ({
      id: rep.id,
      name: rep.name,
      team: config.teams.find((team) => team.id === rep.teamId)?.name ?? "Unassigned",
      ...repMetrics({ rep, attempts, orders, appointments, interactions }),
    }))
    .sort((a, b) => b.orders - a.orders || b.interactions - a.interactions);

  return <AppShell>
    <div className="breadcrumbs"><Link href="/reports">Reports</Link><span>/</span>Representatives</div>
    <div className="page-header report-header"><div><div className="eyebrow">Representative Analytics</div><h1>Rep Performance</h1><p className="muted">Measure sales activity, conversion efficiency, field touches, and installation outcomes.</p></div>
      <div className="report-toolbar">
        <select value={range} onChange={(e) => setRange(e.target.value as DateRangeKey)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All time</option></select>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}><option value="all">All teams</option>{config.teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select>
        <button className="button secondary" onClick={() => downloadCsv("representative-performance.csv", rows.map((row) => ({
          Representative: row.name, Team: row.team, Interactions: row.interactions, Attempts: row.attempts, Orders: row.orders,
          Conversion: pct(row.conversion), Appointments: row.appointments, "Install Completion": pct(row.appointmentCompletion),
          "Sales per 100 Interactions": row.salesPer100Interactions.toFixed(1),
        })))}>Export CSV</button>
      </div>
    </div>
    <div className="card table-card report-scroll-table"><table><thead><tr><th>Rep</th><th>Team</th><th>Interactions</th><th>Attempts</th><th>Orders</th><th>Conversion</th><th>Appointments</th><th>Install completion</th><th>Sales / 100 touches</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.team}</td><td>{row.interactions}</td><td>{row.attempts}</td><td>{row.orders}</td><td>{pct(row.conversion)}</td><td>{row.appointments}</td><td>{pct(row.appointmentCompletion)}</td><td>{row.salesPer100Interactions.toFixed(1)}</td></tr>)}</tbody>
    </table></div>
  </AppShell>;
}
