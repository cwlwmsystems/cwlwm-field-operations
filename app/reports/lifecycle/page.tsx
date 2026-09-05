"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { pct } from "@/lib/reporting/liveMetrics";
import { pctValue } from "@/lib/reporting/analytics";

export default function Page() {
  const lifecycle = useSupabaseLifecycle();
  const sales = useSupabaseSales();
  const rows = lifecycle.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    category: stage.category,
    terminal: stage.isTerminal,
    count: sales.orders.filter((order) => lifecycle.getCurrentStage(order.id)?.id === stage.id).length,
  }));
  const terminal = rows.filter((row) => row.terminal).reduce((sum, row) => sum + row.count, 0);
  const openExceptions = lifecycle.exceptions.filter((item) => item.status === "open").length;

  return <AppShell>
    <div className="breadcrumbs"><Link href="/reports">Reports</Link><span>/</span>Lifecycle</div>
    <div className="page-header"><div><div className="eyebrow">Fulfillment Analytics</div><h1>Lifecycle Funnel</h1><p className="muted">See where submitted orders currently sit in the fulfillment process.</p></div></div>
    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Orders</div><div className="metric">{sales.orders.length}</div></div>
      <div className="card"><div className="eyebrow">Terminal stage</div><div className="metric">{terminal}</div><small>{pct(pctValue(terminal, sales.orders.length))} of orders</small></div>
      <div className="card"><div className="eyebrow">Open exceptions</div><div className="metric">{openExceptions}</div></div>
      <div className="card"><div className="eyebrow">Configured stages</div><div className="metric">{rows.length}</div></div>
    </div>
    <div className="grid two-column section-block">
      <section className="card table-card"><table><thead><tr><th>Stage</th><th>Category</th><th>Orders</th><th>Share</th><th>Terminal</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.category}</td><td>{row.count}</td><td>{pct(pctValue(row.count, sales.orders.length))}</td><td>{row.terminal ? "Yes" : "No"}</td></tr>)}</tbody></table></section>
      <section className="card"><div className="section-heading compact"><div><div className="eyebrow">Exceptions</div><h2>Current attention</h2></div><Link className="text-link" href="/lifecycle">Open lifecycle</Link></div>
        <div className="summary-list"><div><span>Open</span><strong>{openExceptions}</strong></div><div><span>Resolved</span><strong>{lifecycle.exceptions.filter((item) => item.status !== "open").length}</strong></div><div><span>Total events</span><strong>{lifecycle.events.length}</strong></div></div>
      </section>
    </div>
  </AppShell>;
}
