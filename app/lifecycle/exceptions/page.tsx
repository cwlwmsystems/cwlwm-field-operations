"use client";

import Link from "next/link";
import {AppShell} from "@/components/AppShell";
import {useSupabaseLifecycle} from "@/lib/lifecycle/SupabaseLifecycleProvider";

export default function LifecycleExceptionsPage(){
  const lifecycle=useSupabaseLifecycle();

  return <AppShell>
    <div className="breadcrumbs"><Link href="/lifecycle">Lifecycle</Link><span>/</span>Exceptions</div>
    <div className="page-header">
      <div><div className="eyebrow">Lifecycle Validation · Supabase</div><h1>Exception Queue</h1><p className="muted">Unmapped integration statuses and lifecycle review items.</p></div>
    </div>

    <div className="card table-card">
      {lifecycle.loading?<div className="empty-state">Loading exceptions…</div>:
      lifecycle.exceptions.length===0?<div className="empty-state">No lifecycle exceptions.</div>:
      <table>
        <thead><tr><th>Status</th><th>Type</th><th>Order</th><th>External status</th><th>Message</th><th>Created</th><th></th></tr></thead>
        <tbody>{lifecycle.exceptions.map(row=><tr key={row.id}>
          <td><span className={`badge ${row.status==="open"?"warning":"success"}`}>{row.status}</span></td>
          <td>{row.exceptionType.replaceAll("_"," ")}</td>
          <td><Link className="text-link" href={`/lifecycle/orders/${row.orderId}`}>{row.orderId}</Link></td>
          <td>{row.externalStatus??"—"}</td>
          <td>{row.message}</td>
          <td>{new Date(row.createdAt).toLocaleString()}</td>
          <td>{row.status==="open"&&<div className="row-actions"><button onClick={()=>lifecycle.resolveException(row.id,"resolved")}>Resolve</button><button onClick={()=>lifecycle.resolveException(row.id,"dismissed")}>Dismiss</button></div>}</td>
        </tr>)}</tbody>
      </table>}
    </div>
  </AppShell>;
}
