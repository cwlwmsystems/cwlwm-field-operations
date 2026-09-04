"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function SalesPage() {
  const { data } = usePlatformStore();
  const activeAttempts = data.salesAttempts.filter((row) => row.status === "in_progress");
  const pendingOrders = data.orders.filter((row) => row.reviewStatus === "pending");
  return <AppShell>
    <div className="page-header">
      <div><div className="eyebrow">Sales Operations</div><h1>Sales</h1><p className="muted">Start, resume, submit, and review field sales without a live backend connection.</p></div>
      <Link className="button" href="/locations">Start from a location</Link>
    </div>
    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">In-progress attempts</div><div className="metric">{activeAttempts.length}</div></div>
      <div className="card"><div className="eyebrow">Orders submitted</div><div className="metric">{data.orders.length}</div></div>
      <div className="card"><div className="eyebrow">Pending review</div><div className="metric">{pendingOrders.length}</div></div>
    </div>

    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">Resume</div><h2>Open sales attempts</h2></div></div>
      <div className="card table-card">
        {activeAttempts.length === 0 ? <div className="empty-state">No open sales attempts yet.</div> : <table><thead><tr><th>Customer</th><th>Location</th><th>Progress</th><th>Updated</th><th></th></tr></thead><tbody>
          {activeAttempts.map((attempt) => {
            const location = data.locations.find((row) => row.id === attempt.locationId);
            return <tr key={attempt.id}><td>{[attempt.firstName, attempt.lastName].filter(Boolean).join(" ") || "Unnamed customer"}</td><td>{location?.address ?? "Unknown"}</td><td><span className="badge">Step {attempt.progressStep}/4 · {attempt.progressStage}</span></td><td>{new Date(attempt.updatedAt).toLocaleString()}</td><td className="row-actions"><Link className="text-link" href={`/sales/new/${attempt.locationId}?attempt=${attempt.id}`}>Resume</Link></td></tr>;
          })}
        </tbody></table>}
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">Orders</div><h2>Recent submissions</h2></div><Link className="text-link" href="/admin/sales-review">Open Sales Review</Link></div>
      <div className="card table-card">
        {data.orders.length === 0 ? <div className="empty-state">No orders have been submitted.</div> : <table><thead><tr><th>Customer</th><th>Product</th><th>Install</th><th>Review</th><th></th></tr></thead><tbody>
          {[...data.orders].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map((order) => <tr key={order.id}><td>{order.customerName}</td><td>{order.productNameSnapshot}<div className="muted small">{order.offerNameSnapshot}</div></td><td>{order.installDate} · {order.installTime}</td><td><span className={`badge ${order.reviewStatus === "approved" ? "success" : order.reviewStatus === "needs_attention" ? "warning" : "neutral"}`}>{order.reviewStatus.replace("_", " ")}</span></td><td className="row-actions"><Link className="text-link" href={`/sales/orders/${order.id}`}>View</Link></td></tr>)}
        </tbody></table>}
      </div>
    </section>
  </AppShell>;
}
