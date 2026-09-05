"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import { useSupabaseFinance } from "@/lib/finance/SupabaseFinanceProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";
import { conversion, money, pct } from "@/lib/reporting/liveMetrics";
import {
  buildDailySeries,
  filterAppointments,
  filterAttempts,
  filterInteractions,
  filterOrders,
  pctValue,
  repMetrics,
  territoryMetrics,
  type DateRangeKey,
} from "@/lib/reporting/analytics";

const ranges: { value: DateRangeKey; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

export default function ReportsPage() {
  const config = useSupabaseConfig();
  const sales = useSupabaseSales();
  const sched = useSupabaseScheduling();
  const life = useSupabaseLifecycle();
  const fin = useSupabaseFinance();
  const ops = useSupabaseTerritoryOps();
  const [range, setRange] = useState<DateRangeKey>("30d");

  const attempts = useMemo(() => filterAttempts(sales.attempts, range), [range, sales.attempts]);
  const orders = useMemo(() => filterOrders(sales.orders, range), [range, sales.orders]);
  const appointments = useMemo(() => filterAppointments(sched.appointments, range), [range, sched.appointments]);
  const interactions = useMemo(() => filterInteractions(ops.interactions, range), [ops.interactions, range]);

  const converted = attempts.filter((item) => item.status === "converted").length;
  const completedAppointments = appointments.filter((item) => item.status === "completed").length;
  const noShows = appointments.filter((item) => item.status === "no_show").length;
  const cancelledAppointments = appointments.filter((item) => item.status === "cancelled").length;
  const serviceable = config.locations.filter((item) => ["prospect", "current_customer"].includes(item.serviceStatus ?? "prospect"));
  const currentCustomers = serviceable.filter((item) => item.serviceStatus === "current_customer").length;
  const penetration = pctValue(currentCustomers, serviceable.length);

  const repRows = config.reps.map((rep) => ({
    id: rep.id,
    name: rep.name,
    team: config.teams.find((team) => team.id === rep.teamId)?.name ?? "Unassigned",
    ...repMetrics({ rep, attempts, orders, appointments, interactions }),
  })).sort((a, b) => b.orders - a.orders).slice(0, 6);

  const territoryRows = config.territories.map((territory) => ({
    id: territory.id,
    name: territory.name,
    market: territory.market,
    ...territoryMetrics({ territory, locations: config.locations, attempts, orders, interactions }),
  })).sort((a, b) => b.orders - a.orders).slice(0, 6);

  const trendDays = range === "7d" ? 7 : range === "30d" ? 30 : 30;
  const trend = buildDailySeries({ orders, attempts, days: trendDays });
  const maxTrend = Math.max(1, ...trend.flatMap((row) => [row.attempts, row.orders]));
  const stageRows = life.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    count: orders.filter((order) => life.getCurrentStage(order.id)?.id === stage.id).length,
  }));
  const stageMax = Math.max(1, ...stageRows.map((row) => row.count));
  const invoiceValue = fin.batches.filter((item) => item.status !== "void").reduce((sum, item) => sum + fin.getBatchTotal(item.id), 0);

  return (
    <AppShell>
      <div className="page-header report-header">
        <div>
          <div className="eyebrow">Reporting & Analytics · Supabase</div>
          <h1>Performance Intelligence</h1>
          <p className="muted">Sales, territory penetration, rep productivity, scheduling outcomes, lifecycle progress, and finance in one management view.</p>
        </div>
        <label className="report-range-control">
          Reporting window
          <select value={range} onChange={(event) => setRange(event.target.value as DateRangeKey)}>
            {ranges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid metric-grid report-kpi-grid">
        <div className="card"><div className="eyebrow">Sales attempts</div><div className="metric">{attempts.length.toLocaleString()}</div><small>{converted.toLocaleString()} converted attempts</small></div>
        <div className="card"><div className="eyebrow">Orders</div><div className="metric">{orders.length.toLocaleString()}</div><small>{pct(conversion(attempts.length, orders.length))} attempt conversion</small></div>
        <div className="card"><div className="eyebrow">Territory penetration</div><div className="metric">{pct(penetration)}</div><small>{currentCustomers.toLocaleString()} current customers</small></div>
        <div className="card"><div className="eyebrow">Install completion</div><div className="metric">{pct(pctValue(completedAppointments, appointments.length))}</div><small>{noShows} no-show · {cancelledAppointments} cancelled</small></div>
        <div className="card"><div className="eyebrow">Open exceptions</div><div className="metric">{life.exceptions.filter((item) => item.status === "open").length}</div><small>Lifecycle attention queue</small></div>
        <div className="card"><div className="eyebrow">Invoice value</div><div className="metric">{money(invoiceValue, fin.settings?.currency ?? "USD")}</div><small>{fin.batches.filter((item) => item.status === "exported").length} exported batches</small></div>
      </div>

      <div className="grid two-column section-block report-primary-grid">
        <section className="card">
          <div className="section-heading compact">
            <div><div className="eyebrow">Sales Trend</div><h2>Attempts vs. orders</h2></div>
            <span className="report-window-label">{range === "all" ? "Last 30 days shown" : ranges.find((item) => item.value === range)?.label}</span>
          </div>
          <div className="trend-chart" aria-label="Sales attempts and orders trend">
            {trend.map((row) => (
              <div className="trend-column" key={row.key} title={`${row.label}: ${row.attempts} attempts, ${row.orders} orders`}>
                <div className="trend-bars">
                  <span className="trend-bar attempts" style={{ height: `${Math.max(2, row.attempts / maxTrend * 100)}%` }} />
                  <span className="trend-bar orders" style={{ height: `${Math.max(2, row.orders / maxTrend * 100)}%` }} />
                </div>
                {(trend.length <= 10 || trend.indexOf(row) % 5 === 0) && <small>{row.label}</small>}
              </div>
            ))}
          </div>
          <div className="report-legend"><span><i className="attempts" />Attempts</span><span><i className="orders" />Orders</span></div>
        </section>

        <section className="card">
          <div className="section-heading compact">
            <div><div className="eyebrow">Lifecycle Funnel</div><h2>Current order stages</h2></div>
            <Link className="text-link" href="/reports/lifecycle">Full report</Link>
          </div>
          <div className="report-bars">
            {stageRows.map((row) => (
              <div className="report-bar-row" key={row.id}>
                <div className="report-bar-label"><span>{row.name}</span><strong>{row.count}</strong></div>
                <div className="report-bar-track"><div className="report-bar-fill" style={{ width: `${Math.max(3, row.count / stageMax * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid two-column section-block">
        <section className="card table-card">
          <div className="section-heading compact">
            <div><div className="eyebrow">Representative Performance</div><h2>Top reps</h2></div>
            <Link className="text-link" href="/reports/reps">Full report</Link>
          </div>
          <table><thead><tr><th>Rep</th><th>Orders</th><th>Conv.</th><th>Interactions</th><th>Installs</th></tr></thead>
            <tbody>{repRows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small className="table-subline">{row.team}</small></td><td>{row.orders}</td><td>{pct(row.conversion)}</td><td>{row.interactions}</td><td>{pct(row.appointmentCompletion)}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="card table-card">
          <div className="section-heading compact">
            <div><div className="eyebrow">Territory Performance</div><h2>Top territories</h2></div>
            <Link className="text-link" href="/reports/territories">Full report</Link>
          </div>
          <table><thead><tr><th>Territory</th><th>Orders</th><th>Conv.</th><th>Penetration</th><th>Unworked</th></tr></thead>
            <tbody>{territoryRows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small className="table-subline">{row.market}</small></td><td>{row.orders}</td><td>{pct(row.conversion)}</td><td>{pct(row.penetration)}</td><td>{row.unworkedProspects.toLocaleString()}</td></tr>)}</tbody>
          </table>
        </section>
      </div>

      <div className="grid three-column section-block report-link-grid">
        <Link className="card report-link-card" href="/reports/reps"><span>Representatives</span><strong>Rep productivity & conversion</strong><small>Attempts, orders, interactions, install outcomes</small></Link>
        <Link className="card report-link-card" href="/reports/territories"><span>Territories</span><strong>Penetration & workload</strong><small>Customers, prospects, sales, unworked opportunity</small></Link>
        <Link className="card report-link-card" href="/reports/scheduling"><span>Scheduling</span><strong>Appointment outcomes</strong><small>Completion, cancellation and no-show rates</small></Link>
        <Link className="card report-link-card" href="/reports/lifecycle"><span>Lifecycle</span><strong>Fulfillment funnel</strong><small>Current stages and exception visibility</small></Link>
        <Link className="card report-link-card" href="/reports/finance"><span>Finance</span><strong>Invoice performance</strong><small>Batch totals, exports, finalization status</small></Link>
        <Link className="card report-link-card" href="/territories"><span>Territory Ops</span><strong>Act on the numbers</strong><small>Open the operational workload workspace</small></Link>
      </div>
    </AppShell>
  );
}
