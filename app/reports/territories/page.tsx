"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";
import { pct } from "@/lib/reporting/liveMetrics";
import {
  downloadCsv,
  filterAttempts,
  filterInteractions,
  filterOrders,
  territoryMetrics,
  type DateRangeKey,
} from "@/lib/reporting/analytics";

export default function Page() {
  const config = useSupabaseConfig();
  const sales = useSupabaseSales();
  const ops = useSupabaseTerritoryOps();
  const [range, setRange] = useState<DateRangeKey>("30d");
  const [market, setMarket] = useState("all");

  const attempts = useMemo(() => filterAttempts(sales.attempts, range), [range, sales.attempts]);
  const orders = useMemo(() => filterOrders(sales.orders, range), [range, sales.orders]);
  const interactions = useMemo(() => filterInteractions(ops.interactions, range), [ops.interactions, range]);

  const rows = config.territories
    .filter((territory) => market === "all" || territory.market === market)
    .map((territory) => ({
      id: territory.id,
      name: territory.name,
      market: territory.market,
      ...territoryMetrics({ territory, locations: config.locations, attempts, orders, interactions }),
    }))
    .sort((a, b) => b.orders - a.orders || b.prospects - a.prospects);

  const markets = Array.from(new Set(config.territories.map((item) => item.market).filter(Boolean))).sort();

  return <AppShell>
    <div className="breadcrumbs"><Link href="/reports">Reports</Link><span>/</span>Territories</div>
    <div className="page-header report-header"><div><div className="eyebrow">Territory Intelligence</div><h1>Territory Performance</h1><p className="muted">Compare penetration, sales conversion, current customers, and unworked opportunity.</p></div>
      <div className="report-toolbar">
        <select value={range} onChange={(e) => setRange(e.target.value as DateRangeKey)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All time</option></select>
        <select value={market} onChange={(e) => setMarket(e.target.value)}><option value="all">All markets</option>{markets.map((item) => <option value={item} key={item}>{item}</option>)}</select>
        <button className="button secondary" onClick={() => downloadCsv("territory-performance.csv", rows.map((row) => ({
          Territory: row.name, Market: row.market, Locations: row.totalLocations, Prospects: row.prospects, Customers: row.customers,
          Attempts: row.attempts, Orders: row.orders, Conversion: pct(row.conversion), Penetration: pct(row.penetration), "Unworked Prospects": row.unworkedProspects,
        })))}>Export CSV</button>
      </div>
    </div>
    <div className="card table-card report-scroll-table"><table><thead><tr><th>Territory</th><th>Market</th><th>Locations</th><th>Prospects</th><th>Customers</th><th>Attempts</th><th>Orders</th><th>Conversion</th><th>Penetration</th><th>Unworked</th><th /></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.market}</td><td>{row.totalLocations.toLocaleString()}</td><td>{row.prospects.toLocaleString()}</td><td>{row.customers.toLocaleString()}</td><td>{row.attempts}</td><td>{row.orders}</td><td>{pct(row.conversion)}</td><td>{pct(row.penetration)}</td><td>{row.unworkedProspects.toLocaleString()}</td><td><Link className="text-link" href={`/territories/${row.id}`}>Open</Link></td></tr>)}</tbody>
    </table></div>
  </AppShell>;
}
