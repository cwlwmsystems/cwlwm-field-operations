"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { makeId, type DemoAdjustment, usePlatformStore } from "@/lib/store/platformStore";

export default function InvoiceDetailPage() {
  const { id } = useParams<{id:string}>();
  const { data, finalizeInvoiceBatch, markInvoiceExported, voidInvoiceBatch, saveAdjustment, applyAdjustment, reverseAdjustment } = usePlatformStore();
  const batch = data.invoiceBatches.find((row)=>row.id===id);
  const [adjustment, setAdjustment] = useState<DemoAdjustment>({
    id:"", orderId:"", invoiceBatchId:id, adjustmentType:"clawback", reason:"", amount:0, status:"open", createdAt:""
  });

  if (!batch) return <AppShell><div className="card"><h1>Invoice not found</h1><Link className="text-link" href="/finance">Return to Finance</Link></div></AppShell>;

  const orders = data.orders.filter((order)=>batch.orderIds.includes(order.id));
  const adjustments = data.adjustments.filter((row)=>row.invoiceBatchId===batch.id);

  function saveAdj() {
    if (!adjustment.orderId || !adjustment.reason.trim() || !adjustment.amount) return;
    saveAdjustment({
      ...adjustment,
      id: adjustment.id || makeId("adj"),
      invoiceBatchId: batch!.id,
      createdAt: adjustment.createdAt || new Date().toISOString()
    });
    setAdjustment({id:"",orderId:"",invoiceBatchId:batch!.id,adjustmentType:"clawback",reason:"",amount:0,status:"open",createdAt:""});
  }

  function exportCsv() {
    const headers = ["invoice_number","order_id","customer","product","amount"];
    const rows = orders.map((order)=>[
      batch!.invoiceNumber,
      order.id,
      order.customerName,
      order.productNameSnapshot,
      Number(String(order.monthlyPriceSnapshot ?? "0").replace(/[^0-9.-]/g,"")||0).toFixed(2)
    ]);
    const csv = [headers, ...rows].map((row)=>row.map((v)=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batch!.invoiceNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    markInvoiceExported(batch!.id);
  }

  return <AppShell>
    <div className="breadcrumbs"><Link href="/finance">Finance</Link><span>/</span>{batch.invoiceNumber}</div>
    <div className="page-header">
      <div><div className="eyebrow">Invoice Batch</div><h1>{batch.invoiceNumber}</h1><p className="muted">Created {new Date(batch.createdAt).toLocaleString()}</p></div>
      <div className="row-actions">
        {batch.status==="draft" && <button className="button" onClick={()=>finalizeInvoiceBatch(batch.id)}>Finalize</button>}
        {["draft","finalized"].includes(batch.status) && <button className="button secondary" onClick={exportCsv}>Export CSV</button>}
        {batch.status!=="void" && <button className="button secondary" onClick={()=>voidInvoiceBatch(batch.id)}>Void</button>}
      </div>
    </div>

    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Status</div><div className="metric-small">{batch.status}</div></div>
      <div className="card"><div className="eyebrow">Orders</div><div className="metric-small">{batch.orderIds.length}</div></div>
      <div className="card"><div className="eyebrow">Subtotal</div><div className="metric-small">${batch.subtotal.toFixed(2)}</div></div>
      <div className="card"><div className="eyebrow">Adjustments</div><div className="metric-small">${batch.adjustmentsTotal.toFixed(2)}</div></div>
      <div className="card"><div className="eyebrow">Total</div><div className="metric-small">${batch.total.toFixed(2)}</div></div>
    </div>

    <section className="card table-card section-block">
      <div className="eyebrow">Included Orders</div><h2>Invoice items</h2>
      <table><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Amount</th></tr></thead><tbody>
        {orders.map((order)=><tr key={order.id}>
          <td><Link className="text-link" href={`/sales/orders/${order.id}`}>{order.id}</Link></td>
          <td>{order.customerName}</td>
          <td>{order.productNameSnapshot}</td>
          <td>${Number(String(order.monthlyPriceSnapshot ?? "0").replace(/[^0-9.-]/g,"")||0).toFixed(2)}</td>
        </tr>)}
      </tbody></table>
    </section>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Adjustment</div><h2>Add credit / clawback</h2>
        <label>Order<select value={adjustment.orderId} onChange={(e)=>setAdjustment({...adjustment,orderId:e.target.value})}>
          <option value="">Select order</option>
          {orders.map((order)=><option key={order.id} value={order.id}>{order.customerName} · {order.id}</option>)}
        </select></label>
        <label>Type<select value={adjustment.adjustmentType} onChange={(e)=>setAdjustment({...adjustment,adjustmentType:e.target.value as DemoAdjustment["adjustmentType"]})}>
          <option value="clawback">Clawback</option><option value="credit">Credit</option><option value="debit">Debit</option><option value="void">Void</option><option value="other">Other</option>
        </select></label>
        <label>Reason<input value={adjustment.reason} onChange={(e)=>setAdjustment({...adjustment,reason:e.target.value})} placeholder="Cancellation, correction, bonus adjustment..." /></label>
        <label>Amount<input type="number" step="0.01" value={adjustment.amount} onChange={(e)=>setAdjustment({...adjustment,amount:Number(e.target.value)})} /></label>
        <button className="button" onClick={saveAdj}>Save adjustment</button>
      </section>

      <section className="card table-card">
        <div className="eyebrow">Adjustments</div><h2>Batch adjustments</h2>
        {adjustments.length===0 ? <div className="empty-state">No adjustments for this invoice.</div> :
        <table><thead><tr><th>Type</th><th>Reason</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
          {adjustments.map((row)=><tr key={row.id}>
            <td>{row.adjustmentType}</td><td>{row.reason}</td><td>${Math.abs(row.amount).toFixed(2)}</td><td>{row.status}</td>
            <td className="row-actions">
              {row.status==="open" && <button className="button-link" onClick={()=>applyAdjustment(row.id)}>Apply</button>}
              {row.status==="applied" && <button className="button-link" onClick={()=>reverseAdjustment(row.id)}>Reverse</button>}
            </td>
          </tr>)}
        </tbody></table>}
      </section>
    </div>
  </AppShell>;
}
