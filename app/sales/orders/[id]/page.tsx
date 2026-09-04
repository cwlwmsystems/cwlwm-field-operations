"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams();
  const { data } = usePlatformStore();
  const order = data.orders.find((row) => row.id === id);
  if (!order) return <AppShell><div className="card"><h1>Order not found</h1><Link className="text-link" href="/sales">Return to Sales</Link></div></AppShell>;
  const location = data.locations.find((row) => row.id === order.locationId);
  const rep = data.reps.find((row) => row.id === order.representativeId);
  return <AppShell>
    <div className="breadcrumbs"><Link href="/sales">Sales</Link><span>/</span>Order</div>
    {query.get("submitted") === "1" && <div className="success-banner"><strong>Order submitted successfully.</strong><span>The partial attempt was converted and this order is now waiting for Sales Review.</span></div>}
    <div className="page-header"><div><div className="eyebrow">Order Detail</div><h1>{order.customerName}</h1><p className="muted">Submitted {new Date(order.createdAt).toLocaleString()}</p></div><div className="status-stack"><span className="badge">{order.orderStatus}</span><span className={`badge ${order.reviewStatus === "approved" ? "success" : order.reviewStatus === "needs_attention" ? "warning" : "neutral"}`}>{order.reviewStatus.replace("_"," ")}</span></div></div>
    <div className="grid location-summary-grid"><div className="card"><div className="eyebrow">Location</div><div className="metric-small">{location?.address ?? "Unknown"}</div>{location&&<Link className="text-link small" href={`/locations/${location.id}`}>Open location</Link>}</div><div className="card"><div className="eyebrow">Representative</div><div className="metric-small">{rep?.name ?? "Unknown"}</div></div><div className="card"><div className="eyebrow">Product</div><div className="metric-small">{order.productNameSnapshot}</div></div><div className="card"><div className="eyebrow">Appointment</div><div className="metric-small">{order.installDate}</div><div className="muted small">{order.installTime}</div></div></div>
    <div className="order-detail-grid section-block">
      <div className="card"><div className="section-heading compact"><div><div className="eyebrow">Pricing Snapshot</div><h2>{order.offerNameSnapshot}</h2></div></div><div className="pricing-phases">{order.pricingSnapshot.phases.map((phase)=><div key={phase.label}><span>{phase.label}</span><strong>{phase.price===0?"$0":`$${phase.price.toFixed(2)}/mo`}</strong><small>{phase.months}</small></div>)}</div></div>
      <div className="card"><div className="eyebrow">Contact</div><h2>Customer details</h2><dl className="detail-list"><div><dt>Phone</dt><dd>{order.phone || "—"}</dd></div><div><dt>Email</dt><dd>{order.email || "—"}</dd></div><div><dt>Notes</dt><dd>{order.notes || "—"}</dd></div></dl></div>
    </div>
    <section className="card section-block"><div className="eyebrow">Order Timeline</div><h2>Current lifecycle</h2><div className="simple-timeline"><div><strong>Order submitted</strong><span>{new Date(order.createdAt).toLocaleString()}</span></div><div className={order.reviewStatus==="pending"?"current":""}><strong>Sales review</strong><span>{order.reviewStatus.replace("_"," ")}</span></div><div><strong>External lifecycle</strong><span>Not connected yet</span></div></div></section>
  </AppShell>;
}
