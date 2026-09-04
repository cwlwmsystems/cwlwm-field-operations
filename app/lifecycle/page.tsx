"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function LifecyclePage() {
  const { data, getCurrentLifecycleStage } = usePlatformStore();
  const openExceptions = data.lifecycleExceptions.filter((row) => row.status === "open");
  const linkedOrders = new Set(data.externalRecords.filter((row) => row.entityType === "order").map((row) => row.internalEntityId)).size;
  const installed = data.orders.filter((order) => getCurrentLifecycleStage(order.id)?.category === "installed").length;
  const activated = data.orders.filter((order) => getCurrentLifecycleStage(order.id)?.category === "activated").length;

  return <AppShell>
    <div className="page-header">
      <div>
        <div className="eyebrow">Order Lifecycle</div>
        <h1>Lifecycle & Integrations</h1>
        <p className="muted">Track what happens after submission using configurable stages and external-system mappings.</p>
      </div>
      <Link className="button secondary" href="/admin/lifecycle">Configure lifecycle</Link>
    </div>

    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Orders</div><div className="metric">{data.orders.length}</div></div>
      <div className="card"><div className="eyebrow">Externally linked</div><div className="metric">{linkedOrders}</div></div>
      <div className="card"><div className="eyebrow">Installed</div><div className="metric">{installed}</div></div>
      <div className="card"><div className="eyebrow">Activated</div><div className="metric">{activated}</div></div>
      <div className="card"><div className="eyebrow">Open exceptions</div><div className="metric">{openExceptions.length}</div></div>
    </div>

    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">Current State</div><h2>Orders</h2></div></div>
      <div className="card table-card">
        {data.orders.length === 0 ? <div className="empty-state">Submit an order to begin lifecycle tracking.</div> :
        <table>
          <thead><tr><th>Customer</th><th>Order</th><th>External ID</th><th>Current stage</th><th>Last event</th><th></th></tr></thead>
          <tbody>
            {[...data.orders].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map((order) => {
              const stage = getCurrentLifecycleStage(order.id);
              const external = data.externalRecords.find((row) => row.internalEntityId === order.id && row.entityType === "order");
              const lastEvent = [...data.lifecycleEvents].filter((row) => row.orderId === order.id).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt))[0];
              return <tr key={order.id}>
                <td>{order.customerName}</td>
                <td><span className="mono small">{order.id}</span></td>
                <td>{external?.externalId ?? "—"}</td>
                <td><span className={`badge ${stage?.isTerminal ? "success" : "neutral"}`}>{stage?.name ?? "No lifecycle"}</span></td>
                <td>{lastEvent ? new Date(lastEvent.occurredAt).toLocaleString() : "—"}</td>
                <td><Link className="text-link" href={`/lifecycle/orders/${order.id}`}>Open</Link></td>
              </tr>;
            })}
          </tbody>
        </table>}
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">Validation</div><h2>Open exceptions</h2></div><Link className="text-link" href="/lifecycle/exceptions">View queue</Link></div>
      <div className="card table-card">
        {openExceptions.length === 0 ? <div className="empty-state">No open lifecycle exceptions.</div> :
        <table><thead><tr><th>Type</th><th>Order</th><th>Message</th><th>Created</th></tr></thead><tbody>
          {openExceptions.slice(0,5).map((row)=><tr key={row.id}><td><span className="badge warning">{row.exceptionType.replaceAll("_"," ")}</span></td><td><Link className="text-link" href={`/lifecycle/orders/${row.orderId}`}>{row.orderId}</Link></td><td>{row.message}</td><td>{new Date(row.createdAt).toLocaleString()}</td></tr>)}
        </tbody></table>}
      </div>
    </section>
  </AppShell>;
}
