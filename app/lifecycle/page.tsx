"use client";

import Link from "next/link";
import {AppShell} from "@/components/AppShell";
import {useSupabaseSales} from "@/lib/sales/SupabaseSalesProvider";
import {useSupabaseLifecycle} from "@/lib/lifecycle/SupabaseLifecycleProvider";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";
import {useSupabaseScheduling} from "@/lib/scheduling/SupabaseSchedulingProvider";

export default function LifecyclePage(){
  const sales=useSupabaseSales();
  const lifecycle=useSupabaseLifecycle();
  const config=useSupabaseConfig();
  const scheduling=useSupabaseScheduling();

  const installed=sales.orders.filter(o=>lifecycle.getCurrentStage(o.id)?.category==="installed").length;
  const activated=sales.orders.filter(o=>lifecycle.getCurrentStage(o.id)?.category==="activated").length;
  const submitted=sales.orders.filter(o=>lifecycle.getCurrentStage(o.id)?.category==="submitted").length;
  const openExceptions=lifecycle.exceptions.filter(x=>x.status==="open");

  return <AppShell>
    <div className="page-header">
      <div>
        <div className="eyebrow">Lifecycle Operations · Supabase</div>
        <h1>Order Lifecycle</h1>
        <p className="muted">Manage post-sale fulfillment from submission through installation and activation.</p>
      </div>
    </div>

    {lifecycle.error&&<div className="error-banner"><strong>Lifecycle load failed</strong><span>{lifecycle.error}</span></div>}

    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Orders</div><div className="metric">{sales.orders.length}</div></div>
      <div className="card"><div className="eyebrow">Submitted</div><div className="metric">{submitted}</div></div>
      <div className="card"><div className="eyebrow">Installed</div><div className="metric">{installed}</div></div>
      <div className="card"><div className="eyebrow">Activated</div><div className="metric">{activated}</div></div>
      <div className="card"><div className="eyebrow">Open exceptions</div><div className="metric">{openExceptions.length}</div></div>
    </div>

    <section className="section-block">
      <div className="section-heading">
        <div><div className="eyebrow">Fulfillment Queue</div><h2>Orders</h2></div>
        <Link className="text-link" href="/lifecycle/exceptions">Exception queue</Link>
      </div>

      <div className="card table-card">
        {lifecycle.loading||sales.loading?<div className="empty-state">Loading lifecycle…</div>:
        sales.orders.length===0?<div className="empty-state">No submitted orders yet.</div>:
        <table>
          <thead><tr><th>Customer</th><th>Location</th><th>Product</th><th>Appointment</th><th>Current stage</th><th>Last change</th><th></th></tr></thead>
          <tbody>
            {[...sales.orders].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map(order=>{
              const stage=lifecycle.getCurrentStage(order.id);
              const event=lifecycle.getOrderEvents(order.id)[0];
              const location=config.locations.find(x=>x.id===order.locationId);
              const appointment=scheduling.appointments.find(x=>x.orderId===order.id);
              return <tr key={order.id}>
                <td><strong>{order.customerName}</strong><div className="muted small">{order.phone||order.email||"No contact"}</div></td>
                <td>{location?.address??"Unknown"}</td>
                <td>{order.productNameSnapshot}</td>
                <td>{appointment?<><strong>{appointment.date}</strong><div className="muted small">{appointment.time} · {appointment.status}</div></>:"Not scheduled"}</td>
                <td><span className={`badge ${stage?.isTerminal?"success":"neutral"}`}>{stage?.name??"No lifecycle"}</span></td>
                <td>{event?new Date(event.occurredAt).toLocaleString():"—"}</td>
                <td><Link className="button secondary" href={`/lifecycle/orders/${order.id}`}>Open</Link></td>
              </tr>;
            })}
          </tbody>
        </table>}
      </div>
    </section>
  </AppShell>;
}
