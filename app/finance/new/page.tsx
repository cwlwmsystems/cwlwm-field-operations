"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function NewInvoiceBatchPage() {
  const router = useRouter();
  const { data, getCurrentLifecycleStage, getOrderInvoiceBatch, createInvoiceBatch } = usePlatformStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [teamId, setTeamId] = useState("");
  const [notes, setNotes] = useState("");

  const eligible = useMemo(() => data.orders.filter((order) => {
    const stage = getCurrentLifecycleStage(order.id);
    if (!["installed", "activated"].includes(stage?.category ?? "")) return false;
    if (getOrderInvoiceBatch(order.id)) return false;
    if (!teamId) return true;
    const rep = data.reps.find((row)=>row.id===order.representativeId);
    return rep?.teamId === teamId;
  }), [data, teamId, getCurrentLifecycleStage, getOrderInvoiceBatch]);

  function submit() {
    const batch = createInvoiceBatch({ orderIds: selected, teamId: teamId || undefined, notes: notes || undefined });
    if (batch) router.push(`/finance/invoices/${batch.id}`);
  }

  return <AppShell>
    <div className="breadcrumbs"><Link href="/finance">Finance</Link><span>/</span>New invoice batch</div>
    <div className="page-header"><div><div className="eyebrow">Billing Queue</div><h1>Create Invoice Batch</h1><p className="muted">Select installed or activated orders that have not already been invoiced.</p></div></div>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Batch settings</div><h2>Invoice setup</h2>
        <label>Team filter<select value={teamId} onChange={(e)=>{setTeamId(e.target.value); setSelected([]);}}>
          <option value="">All teams</option>
          {data.teams.map((team)=><option key={team.id} value={team.id}>{team.name}</option>)}
        </select></label>
        <label>Notes<textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Optional batch note" /></label>
        <div className="summary-list">
          <div><span>Selected orders</span><strong>{selected.length}</strong></div>
          <div><span>Next invoice number</span><strong>{data.invoiceSettings.prefix}-{data.invoiceSettings.includeYear ? `${new Date().getFullYear()}-` : ""}{String(data.invoiceSettings.nextNumber).padStart(data.invoiceSettings.padding,"0")}</strong></div>
        </div>
        <button className="button" disabled={selected.length===0} onClick={submit}>Create invoice batch</button>
      </section>

      <section className="card table-card">
        <div className="eyebrow">Eligible orders</div><h2>Select orders</h2>
        {eligible.length===0 ? <div className="empty-state">No eligible orders for this filter.</div> :
        <table><thead><tr><th></th><th>Customer</th><th>Stage</th><th>Amount</th></tr></thead><tbody>
          {eligible.map((order)=>{
            const stage=getCurrentLifecycleStage(order.id);
            const amount=Number(String(order.monthlyPriceSnapshot ?? "0").replace(/[^0-9.-]/g,"")||0);
            return <tr key={order.id}>
              <td><input type="checkbox" checked={selected.includes(order.id)} onChange={(e)=>setSelected(e.target.checked ? [...selected,order.id] : selected.filter((id)=>id!==order.id))} /></td>
              <td>{order.customerName}<div className="muted small">{order.id}</div></td>
              <td>{stage?.name}</td>
              <td>${amount.toFixed(2)}</td>
            </tr>;
          })}
        </tbody></table>}
      </section>
    </div>
  </AppShell>;
}
