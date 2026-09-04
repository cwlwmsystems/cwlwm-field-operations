"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function FinancePage() {
  const { data, getCurrentLifecycleStage, getOrderInvoiceBatch } = usePlatformStore();

  const readyOrders = data.orders.filter((order) => {
    const stage = getCurrentLifecycleStage(order.id);
    const alreadyInvoiced = !!getOrderInvoiceBatch(order.id);
    return !alreadyInvoiced && ["installed", "activated"].includes(stage?.category ?? "");
  });

  const outstandingAdjustments = data.adjustments.filter((row) => row.status === "open");
  const finalized = data.invoiceBatches.filter((row) => ["finalized", "exported"].includes(row.status));
  const totalFinalized = finalized.reduce((sum, row) => sum + row.total, 0);

  return <AppShell>
    <div className="page-header">
      <div>
        <div className="eyebrow">Finance Operations</div>
        <h1>Invoices & Adjustments</h1>
        <p className="muted">Turn eligible completed orders into invoice batches and manage downstream adjustments.</p>
      </div>
      <Link className="button secondary" href="/admin/finance">Finance settings</Link>
    </div>

    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Ready to invoice</div><div className="metric">{readyOrders.length}</div></div>
      <div className="card"><div className="eyebrow">Invoice batches</div><div className="metric">{data.invoiceBatches.length}</div></div>
      <div className="card"><div className="eyebrow">Open adjustments</div><div className="metric">{outstandingAdjustments.length}</div></div>
      <div className="card"><div className="eyebrow">Finalized value</div><div className="metric">${totalFinalized.toFixed(2)}</div></div>
    </div>

    <section className="section-block">
      <div className="section-heading">
        <div><div className="eyebrow">Billing Queue</div><h2>Invoice-ready orders</h2></div>
        <Link className="button" href="/finance/new">Create invoice batch</Link>
      </div>
      <div className="card table-card">
        {readyOrders.length === 0 ? <div className="empty-state">No installed or activated orders are currently waiting for invoicing.</div> :
        <table>
          <thead><tr><th>Customer</th><th>Order</th><th>Lifecycle</th><th>Amount</th><th>Team</th></tr></thead>
          <tbody>
            {readyOrders.map((order) => {
              const stage = getCurrentLifecycleStage(order.id);
              const rep = data.reps.find((row) => row.id === order.representativeId);
              const team = data.teams.find((row) => row.id === rep?.teamId);
              return <tr key={order.id}>
                <td>{order.customerName}</td>
                <td><span className="mono small">{order.id}</span></td>
                <td><span className="badge success">{stage?.name ?? "—"}</span></td>
                <td>${Number(String(order.monthlyPriceSnapshot ?? "0").replace(/[^0-9.-]/g, "") || 0).toFixed(2)}</td>
                <td>{team?.name ?? "—"}</td>
              </tr>;
            })}
          </tbody>
        </table>}
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">Invoice History</div><h2>Batches</h2></div></div>
      <div className="card table-card">
        {data.invoiceBatches.length === 0 ? <div className="empty-state">No invoice batches yet.</div> :
        <table>
          <thead><tr><th>Invoice</th><th>Status</th><th>Orders</th><th>Subtotal</th><th>Adjustments</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {[...data.invoiceBatches].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map((batch)=><tr key={batch.id}>
              <td><strong>{batch.invoiceNumber}</strong></td>
              <td><span className={`badge ${batch.status==="exported"?"success":"neutral"}`}>{batch.status}</span></td>
              <td>{batch.orderIds.length}</td>
              <td>${batch.subtotal.toFixed(2)}</td>
              <td>${batch.adjustmentsTotal.toFixed(2)}</td>
              <td><strong>${batch.total.toFixed(2)}</strong></td>
              <td><Link className="text-link" href={`/finance/invoices/${batch.id}`}>Open</Link></td>
            </tr>)}
          </tbody>
        </table>}
      </div>
    </section>
  </AppShell>;
}
