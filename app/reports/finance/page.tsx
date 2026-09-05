"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useSupabaseFinance } from "@/lib/finance/SupabaseFinanceProvider";
import { money, pct } from "@/lib/reporting/liveMetrics";
import { downloadCsv, pctValue } from "@/lib/reporting/analytics";

export default function Page() {
  const finance = useSupabaseFinance();
  const currency = finance.settings?.currency ?? "USD";
  const active = finance.batches.filter((item) => item.status !== "void");
  const total = active.reduce((sum, item) => sum + finance.getBatchTotal(item.id), 0);
  const exported = active.filter((item) => item.status === "exported").length;
  const finalized = active.filter((item) => item.status === "finalized").length;

  return <AppShell>
    <div className="breadcrumbs"><Link href="/reports">Reports</Link><span>/</span>Finance</div>
    <div className="page-header report-header"><div><div className="eyebrow">Finance Analytics</div><h1>Invoice Performance</h1></div>
      <button className="button secondary" onClick={() => downloadCsv("invoice-performance.csv", active.map((batch) => ({
        Invoice: batch.invoiceNumber, Status: batch.status, Subtotal: batch.subtotal, Adjustments: batch.adjustmentsTotal, Total: finance.getBatchTotal(batch.id), Exports: finance.exports.filter((item) => item.batchId === batch.id).length,
      })))}>Export CSV</button>
    </div>
    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Active batches</div><div className="metric">{active.length}</div></div>
      <div className="card"><div className="eyebrow">Total value</div><div className="metric">{money(total, currency)}</div></div>
      <div className="card"><div className="eyebrow">Finalized</div><div className="metric">{finalized}</div><small>{pct(pctValue(finalized, active.length))} of active batches</small></div>
      <div className="card"><div className="eyebrow">Exported</div><div className="metric">{exported}</div><small>{pct(pctValue(exported, active.length))} of active batches</small></div>
    </div>
    <div className="card table-card section-block report-scroll-table"><table><thead><tr><th>Invoice</th><th>Status</th><th>Subtotal</th><th>Adjustments</th><th>Total</th><th>Exports</th><th /></tr></thead>
      <tbody>{finance.batches.map((batch) => <tr key={batch.id}><td><strong>{batch.invoiceNumber}</strong></td><td>{batch.status}</td><td>{money(batch.subtotal, currency)}</td><td>{money(batch.adjustmentsTotal, currency)}</td><td>{money(finance.getBatchTotal(batch.id), currency)}</td><td>{finance.exports.filter((item) => item.batchId === batch.id).length}</td><td><Link className="text-link" href={`/finance/invoices/${batch.id}`}>Open</Link></td></tr>)}</tbody>
    </table></div>
  </AppShell>;
}
