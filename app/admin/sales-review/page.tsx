"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function SalesReviewPage() {
  const { data, updateOrder } = usePlatformStore();
  const [filter, setFilter] = useState("all");
  const orders = [...data.orders].filter((row)=>filter==="all"||row.reviewStatus===filter).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Admin</div><h1>Sales Review</h1><p className="muted">Review submitted field orders before downstream lifecycle processing.</p></div></div>
    <AdminNav />
    <div className="review-toolbar"><label>Review status<select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="needs_attention">Needs attention</option></select></label></div>
    <div className="card table-card">
      {orders.length===0?<div className="empty-state">No orders match this filter.</div>:<table><thead><tr><th>Customer</th><th>Location</th><th>Product</th><th>Rep</th><th>Status</th><th></th></tr></thead><tbody>{orders.map((order)=>{
        const location=data.locations.find((row)=>row.id===order.locationId);const rep=data.reps.find((row)=>row.id===order.representativeId);
        return <tr key={order.id}><td><strong>{order.customerName}</strong><div className="muted small">{new Date(order.createdAt).toLocaleString()}</div></td><td>{location?.address??"Unknown"}</td><td>{order.productNameSnapshot}<div className="muted small">{order.offerNameSnapshot}</div></td><td>{rep?.name??"Unknown"}</td><td><span className={`badge ${order.reviewStatus==="approved"?"success":order.reviewStatus==="needs_attention"?"warning":"neutral"}`}>{order.reviewStatus.replace("_"," ")}</span></td><td className="row-actions"><Link className="text-link" href={`/sales/orders/${order.id}`}>View</Link><button onClick={()=>updateOrder(order.id,{reviewStatus:"approved",reviewNote:"Approved in local Sales Review."})}>Approve</button><button onClick={()=>updateOrder(order.id,{reviewStatus:"needs_attention",reviewNote:"Flagged for follow-up in local Sales Review."})}>Flag</button></td></tr>;
      })}</tbody></table>}
    </div>
  </AppShell>;
}
