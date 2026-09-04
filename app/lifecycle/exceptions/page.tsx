"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function LifecycleExceptionsPage() {
  const { data, resolveLifecycleException } = usePlatformStore();
  const rows = [...data.lifecycleExceptions].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return <AppShell>
    <div className="breadcrumbs"><Link href="/lifecycle">Lifecycle</Link><span>/</span>Exceptions</div>
    <div className="page-header"><div><div className="eyebrow">Lifecycle Validation</div><h1>Exception Queue</h1><p className="muted">Unmapped statuses, sync failures, and manual lifecycle review items surface here.</p></div></div>
    <div className="card table-card">
      {rows.length===0 ? <div className="empty-state">No lifecycle exceptions have been generated.</div> :
      <table><thead><tr><th>Status</th><th>Type</th><th>Order</th><th>External status</th><th>Message</th><th>Created</th><th></th></tr></thead><tbody>
        {rows.map((row)=><tr key={row.id}>
          <td><span className={`badge ${row.status==="open"?"warning":"success"}`}>{row.status}</span></td>
          <td>{row.exceptionType.replaceAll("_"," ")}</td>
          <td><Link className="text-link" href={`/lifecycle/orders/${row.orderId}`}>{row.orderId}</Link></td>
          <td>{row.externalStatus ?? "—"}</td>
          <td>{row.message}</td>
          <td>{new Date(row.createdAt).toLocaleString()}</td>
          <td>{row.status==="open" && <div className="row-actions"><button className="button-link" onClick={()=>resolveLifecycleException(row.id,"resolved")}>Resolve</button><button className="button-link" onClick={()=>resolveLifecycleException(row.id,"dismissed")}>Dismiss</button></div>}</td>
        </tr>)}
      </tbody></table>}
    </div>
  </AppShell>;
}
