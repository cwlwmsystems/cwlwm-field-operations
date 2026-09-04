"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {AppShell} from "@/components/AppShell";
import {useSupabaseSales} from "@/lib/sales/SupabaseSalesProvider";
import {useSupabaseLifecycle} from "@/lib/lifecycle/SupabaseLifecycleProvider";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";
import {useSupabaseScheduling} from "@/lib/scheduling/SupabaseSchedulingProvider";

export default function LifecycleOrderPage(){
  const {id}=useParams<{id:string}>();
  const sales=useSupabaseSales();
  const lifecycle=useSupabaseLifecycle();
  const config=useSupabaseConfig();
  const scheduling=useSupabaseScheduling();

  const order=sales.orders.find(x=>x.id===id);
  const current=lifecycle.getCurrentStage(id);
  const events=lifecycle.getOrderEvents(id);
  const appointment=scheduling.appointments.find(x=>x.orderId===id);
  const location=order?config.locations.find(x=>x.id===order.locationId):undefined;
  const rep=order?config.reps.find(x=>x.id===order.representativeId):undefined;

  const [stageId,setStageId]=useState("");
  const [detail,setDetail]=useState("");
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  const availableStages=useMemo(()=>{
    return lifecycle.stages
      .filter(stage=>stage.isActive && stage.id!==current?.id)
      .sort((a,b)=>a.sortOrder-b.sortOrder);
  },[lifecycle.stages,current?.id]);

  async function updateLifecycle(){
    if(!stageId)return;
    setSaving(true);setMessage("");
    try{
      const stage=lifecycle.stages.find(x=>x.id===stageId);
      await lifecycle.recordStage(id,stageId,detail);
      setMessage(`Order moved to ${stage?.name??"the selected stage"}.`);
      setDetail("");setStageId("");
    }catch(e){
      setMessage(e instanceof Error?e.message:"Lifecycle update failed.");
    }finally{
      setSaving(false);
    }
  }

  if(sales.loading||lifecycle.loading){
    return <AppShell><div className="card">Loading lifecycle order…</div></AppShell>;
  }

  if(!order){
    return <AppShell><div className="card"><h1>Order not found</h1><Link href="/lifecycle">Return to Lifecycle</Link></div></AppShell>;
  }

  return <AppShell>
    <div className="breadcrumbs"><Link href="/lifecycle">Lifecycle</Link><span>/</span>{order.customerName}</div>

    <div className="page-header">
      <div>
        <div className="eyebrow">Lifecycle Order · Supabase</div>
        <h1>{order.customerName}</h1>
        <p className="muted">{order.productNameSnapshot} · {location?.address??"Unknown location"}</p>
      </div>
      <div className="status-stack">
        <span className={`badge ${current?.isTerminal?"success":"neutral"}`}>{current?.name??"No lifecycle"}</span>
        <Link className="button secondary" href={`/sales/orders/${order.id}`}>Order detail</Link>{current&&["installed","activated"].includes(current.category)&&<Link className="button" href="/finance">Finance</Link>}
      </div>
    </div>

    {message&&<div className="success-banner"><strong>Lifecycle</strong><span>{message}</span></div>}

    <div className="grid location-summary-grid">
      <div className="card"><div className="eyebrow">Current stage</div><div className="metric-small">{current?.name??"—"}</div></div>
      <div className="card"><div className="eyebrow">Representative</div><div className="metric-small">{rep?.name??"Unassigned"}</div></div>
      <div className="card"><div className="eyebrow">Appointment</div><div className="metric-small">{appointment?.date??"None"}</div><div className="muted small">{appointment?`${appointment.time} · ${appointment.status}`:"No linked appointment"}</div></div>
      <div className="card"><div className="eyebrow">Events</div><div className="metric-small">{events.length}</div></div>
    </div>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Operational Update</div>
        <h2>Move order to another stage</h2>

        {current?.isTerminal?
          <div className="empty-state">This order is in a terminal lifecycle stage and cannot be moved again.</div>:
          <>
            <label>New stage
              <select value={stageId} onChange={e=>setStageId(e.target.value)}>
                <option value="">Select stage…</option>
                {availableStages.map(stage=><option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
            </label>
            <label>Operational note
              <textarea value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Optional note about this lifecycle change"/>
            </label>

            {lifecycle.stages.find(x=>x.id===stageId)?.category==="installed"&&
              <div className="mock-notice"><strong>Installed:</strong> recording this stage will also mark the linked active appointment Completed.</div>}
            {lifecycle.stages.find(x=>x.id===stageId)?.category==="activated"&&
              <div className="mock-notice"><strong>Activated:</strong> recording this stage will complete the appointment if needed and close the order.</div>}
            {lifecycle.stages.find(x=>x.id===stageId)?.category==="cancelled"&&
              <div className="error-banner"><strong>Cancellation</strong><span>This will cancel the order and any scheduled appointment.</span></div>}

            <button className="button" disabled={!stageId||saving} onClick={updateLifecycle}>
              {saving?"Recording…":"Record lifecycle stage"}
            </button>
          </>
        }
      </section>

      <section className="card">
        <div className="eyebrow">Order Context</div><h2>Fulfillment details</h2>
        <dl className="detail-list">
          <div><dt>Order</dt><dd className="mono small">{order.id}</dd></div>
          <div><dt>Location</dt><dd>{location?.address??"Unknown"}</dd></div>
          <div><dt>Representative</dt><dd>{rep?.name??"Unassigned"}</dd></div>
          <div><dt>Review</dt><dd>{order.reviewStatus.replace("_"," ")}</dd></div>
          <div><dt>Order status</dt><dd>{order.orderStatus}</dd></div>
          <div><dt>Appointment status</dt><dd>{appointment?.status??"Not scheduled"}</dd></div>
        </dl>
      </section>
    </div>

    <section className="card section-block">
      <div className="section-heading compact">
        <div><div className="eyebrow">History</div><h2>Lifecycle timeline</h2></div>
      </div>

      {events.length===0?<div className="empty-state">No lifecycle events yet.</div>:
      <div className="simple-timeline">
        {events.map((event,index)=>{
          const stage=lifecycle.stages.find(x=>x.id===event.lifecycleStageId);
          const integration=lifecycle.integrations.find(x=>x.id===event.integrationId);
          return <div key={event.id} className={index===0?"current":""}>
            <strong>{stage?.name??"Unknown stage"}</strong>
            <span>{new Date(event.occurredAt).toLocaleString()} · {event.source}{integration?` · ${integration.name}`:""}</span>
            {event.externalStatus&&<span>External status: {event.externalStatus}</span>}
            {event.detail&&<span>{event.detail}</span>}
          </div>;
        })}
      </div>}
    </section>
  </AppShell>;
}
