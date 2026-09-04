"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams();
  const { data, getCurrentLifecycleStage, getOrderInvoiceBatch } = usePlatformStore();
  const order = data.orders.find((row) => row.id === id);
  if (!order) return <AppShell><div className="card"><h1>Order not found</h1><Link className="text-link" href="/sales">Return to Sales</Link></div>
    <section className="card section-block">
      <div className="section-heading compact">
        <div><div className="eyebrow">Finance</div><h2>Invoice status</h2></div>
        {invoiceBatch && <Link className="text-link" href={`/finance/invoices/${invoiceBatch.id}`}>Open invoice</Link>}
      </div>
      {invoiceBatch ? <div className="summary-list">
        <div><span>Invoice</span><strong>{invoiceBatch.invoiceNumber}</strong></div>
        <div><span>Status</span><strong>{invoiceBatch.status}</strong></div>
        <div><span>Batch total</span><strong>${invoiceBatch.total.toFixed(2)}</strong></div>
      </div> : <div className="empty-state">This order has not been placed into an invoice batch.</div>}
    </section>

  </AppShell>;
  const location = data.locations.find((row) => row.id === order.locationId);
  const rep = data.reps.find((row) => row.id === order.representativeId);
  const lifecycleStage = getCurrentLifecycleStage(order.id);
  const lifecycleEvents = [...data.lifecycleEvents].filter((row) => row.orderId === order.id).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
  const invoiceBatch = getOrderInvoiceBatch(order.id);
  return <AppShell>
    <div className="breadcrumbs"><Link href="/sales">Sales</Link><span>/</span>Order</div>
    {query.get("submitted") === "1" && <div className="success-banner"><strong>Order submitted successfully.</strong><span>The partial attempt was converted and this order is now waiting for Sales Review.</span></div>}
    <div className="page-header"><div><div className="eyebrow">Order Detail</div><h1>{order.customerName}</h1><p className="muted">Submitted {new Date(order.createdAt).toLocaleString()}</p></div><div className="status-stack"><span className="badge">{order.orderStatus}</span><span className={`badge ${order.reviewStatus === "approved" ? "success" : order.reviewStatus === "needs_attention" ? "warning" : "neutral"}`}>{order.reviewStatus.replace("_"," ")}</span></div></div>
    <div className="grid location-summary-grid"><div className="card"><div className="eyebrow">Location</div><div className="metric-small">{location?.address ?? "Unknown"}</div>{location&&<Link className="text-link small" href={`/locations/${location.id}`}>Open location</Link>}</div><div className="card"><div className="eyebrow">Representative</div><div className="metric-small">{rep?.name ?? "Unknown"}</div></div><div className="card"><div className="eyebrow">Product</div><div className="metric-small">{order.productNameSnapshot}</div></div><div className="card"><div className="eyebrow">Appointment</div><div className="metric-small">{order.installDate}</div><div className="muted small">{order.installTime}</div></div></div>
    <div className="order-detail-grid section-block">
      <div className="card"><div className="section-heading compact"><div><div className="eyebrow">Pricing Snapshot</div><h2>{order.offerNameSnapshot}</h2></div></div><div className="pricing-phases">{order.pricingSnapshot.phases.map((phase)=><div key={phase.label}><span>{phase.label}</span><strong>{phase.price===0?"$0":`$${phase.price.toFixed(2)}/mo`}</strong><small>{phase.months}</small></div>)}</div></div>
      <div className="card"><div className="eyebrow">Contact</div><h2>Customer details</h2><dl className="detail-list"><div><dt>Phone</dt><dd>{order.phone || "—"}</dd></div><div><dt>Email</dt><dd>{order.email || "—"}</dd></div><div><dt>Notes</dt><dd>{order.notes || "—"}</dd></div></dl></div>
    </div>
    <section className="card section-block"><div className="section-heading compact"><div><div className="eyebrow">Order Timeline</div><h2>Current lifecycle</h2></div><Link className="text-link" href={`/lifecycle/orders/${order.id}`}>Manage lifecycle</Link></div><div className="simple-timeline"><div><strong>Order submitted</strong><span>{new Date(order.createdAt).toLocaleString()}</span></div><div><strong>Sales review</strong><span>{order.reviewStatus.replace("_"," ")}</span></div><div className="current"><strong>{lifecycleStage?.name ?? "Submitted"}</strong><span>{lifecycleEvents[0] ? new Date(lifecycleEvents[0].occurredAt).toLocaleString() : "Lifecycle tracking initialized"}</span></div></div></section>
  
    <section className="card section-block">
      <div className="section-heading compact">
        <div><div className="eyebrow">Finance</div><h2>Invoice status</h2></div>
        {invoiceBatch && <Link className="text-link" href={`/finance/invoices/${invoiceBatch.id}`}>Open invoice</Link>}
      </div>
      {invoiceBatch ? <div className="summary-list">
        <div><span>Invoice</span><strong>{invoiceBatch.invoiceNumber}</strong></div>
        <div><span>Status</span><strong>{invoiceBatch.status}</strong></div>
        <div><span>Batch total</span><strong>${invoiceBatch.total.toFixed(2)}</strong></div>
      </div> : <div className="empty-state">This order has not been placed into an invoice batch.</div>}
    </section>

  </AppShell>;
}
