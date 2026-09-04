"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {FormEvent,useState} from "react";
import {AppShell} from "@/components/AppShell";
import {useSupabaseFinance} from "@/lib/finance/SupabaseFinanceProvider";
import {useSupabaseSales} from "@/lib/sales/SupabaseSalesProvider";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";

export default function InvoicePage(){
  const {id}=useParams<{id:string}>();
  const finance=useSupabaseFinance();
  const sales=useSupabaseSales();
  const config=useSupabaseConfig();

  const batch=finance.batches.find(x=>x.id===id);
  const items=finance.items.filter(x=>x.batchId===id);
  const adjustments=finance.adjustments.filter(x=>x.invoiceBatchId===id);
  const [description,setDescription]=useState("");
  const [amount,setAmount]=useState("0");
  const [message,setMessage]=useState("");

  if(finance.loading)return <AppShell><div className="card">Loading invoice…</div></AppShell>;
  if(!batch)return <AppShell><div className="card"><h1>Invoice not found</h1><Link href="/finance">Return to Finance</Link></div></AppShell>;

  async function addAdjustment(e:FormEvent){
    e.preventDefault();
    try{
      await finance.addAdjustment(batch.id,description,Number(amount));
      setDescription("");setAmount("0");setMessage("Adjustment added.");
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to add adjustment.");}
  }

  async function setStatus(status:"finalized"|"exported"|"void"){
    try{await finance.setBatchStatus(batch.id,status);setMessage(`Invoice marked ${status}.`);}
    catch(e){setMessage(e instanceof Error?e.message:"Unable to update invoice.");}
  }

  const format=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:batch.currency||"USD"}).format(n);

  return <AppShell>
    <div className="breadcrumbs"><Link href="/finance">Finance</Link><span>/</span>{batch.invoiceNumber}</div>
    <div className="page-header">
      <div><div className="eyebrow">Invoice Batch · Supabase</div><h1>{batch.invoiceNumber}</h1><p className="muted">Created {new Date(batch.createdAt).toLocaleString()}</p></div>
      <span className="badge">{batch.status}</span>
    </div>

    {message&&<div className="success-banner"><strong>Invoice</strong><span>{message}</span></div>}

    <div className="grid location-summary-grid">
      <div className="card"><div className="eyebrow">Line items</div><div className="metric-small">{items.length}</div></div>
      <div className="card"><div className="eyebrow">Subtotal</div><div className="metric-small">{format(items.reduce((s,x)=>s+x.lineAmount,0))}</div></div>
      <div className="card"><div className="eyebrow">Adjustments</div><div className="metric-small">{format(adjustments.reduce((s,x)=>s+x.amount,0))}</div></div>
      <div className="card"><div className="eyebrow">Total</div><div className="metric-small">{format(finance.getBatchTotal(batch.id))}</div></div>
    </div>

    <section className="card table-card section-block">
      <div className="section-heading compact"><div><div className="eyebrow">Invoice Lines</div><h2>Orders</h2></div></div>
      <table><thead><tr><th>Customer</th><th>Location</th><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>
        {items.map(item=>{
          const order=sales.orders.find(x=>x.id===item.orderId);
          const location=order?config.locations.find(x=>x.id===order.locationId):undefined;
          return <tr key={item.id}>
            <td><strong>{order?.customerName??"Unknown"}</strong><div className="small muted"><Link href={`/sales/orders/${item.orderId}`}>Order</Link></div></td>
            <td>{location?.address??"Unknown"}</td>
            <td>{item.description}</td>
            <td>{item.quantity}</td>
            <td>{format(item.unitAmount)}</td>
            <td>{format(item.lineAmount)}</td>
          </tr>
        })}
      </tbody></table>
    </section>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Adjustments</div><h2>Credits / charges</h2>
        {adjustments.length===0?<div className="empty-state">No adjustments.</div>:
        <div className="stack-list">{adjustments.map(adj=><div key={adj.id}><div><strong>{adj.description||adj.type}</strong><span className="muted small">{adj.type}</span></div><div className="row-actions"><strong>{format(adj.amount)}</strong>{batch.status!=="exported"&&batch.status!=="void"&&<button className="danger-link" onClick={()=>finance.removeAdjustment(adj.id)}>Remove</button>}</div></div>)}</div>}

        {batch.status!=="exported"&&batch.status!=="void"&&
        <form className="admin-form single section-block" onSubmit={addAdjustment}>
          <label>Description<input value={description} onChange={e=>setDescription(e.target.value)} required/></label>
          <label>Amount <span className="muted small">negative = credit</span><input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
          <button className="button">Add adjustment</button>
        </form>}
      </section>

      <section className="card">
        <div className="eyebrow">Invoice Actions</div><h2>Finalize</h2>
        <p className="muted">Finalized locks the operational invoice state for output. Exported records that the invoice was handed off to a downstream file or integration.</p>
        <div className="form-actions vertical-actions">
          {batch.status==="draft"&&<button className="button" onClick={()=>setStatus("finalized")}>Finalize Invoice</button>}
          {batch.status==="finalized"&&<button className="button" onClick={()=>setStatus("exported")}>Mark Exported</button>}
          {batch.status!=="exported"&&batch.status!=="void"&&<button className="danger-link" onClick={()=>{if(confirm("Void this invoice batch?"))setStatus("void")}}>Void batch</button>}
        </div>
        <dl className="detail-list section-block">
          <div><dt>Finalized</dt><dd>{batch.generatedAt?new Date(batch.generatedAt).toLocaleString():"Not finalized"}</dd></div>
          <div><dt>Exported</dt><dd>{batch.sentAt?new Date(batch.sentAt).toLocaleString():"Not exported"}</dd></div>
        </dl>
      </section>
    </div>
  </AppShell>;
}
