"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { makeId, usePlatformStore } from "@/lib/store/platformStore";

export default function LifecycleOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, addLifecycleEvent, ingestExternalStatus, linkExternalRecord, getCurrentLifecycleStage } = usePlatformStore();
  const order = data.orders.find((row) => row.id === id);
  const [manualStageId, setManualStageId] = useState("stage_accepted");
  const [manualDetail, setManualDetail] = useState("");
  const [integrationId, setIntegrationId] = useState(data.integrations[0]?.id ?? "");
  const [externalId, setExternalId] = useState("");
  const [externalStatus, setExternalStatus] = useState("ACCEPTED");
  const [message, setMessage] = useState("");

  const events = useMemo(() => [...data.lifecycleEvents].filter((row)=>row.orderId===id).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt)), [data.lifecycleEvents, id]);
  const current = getCurrentLifecycleStage(id);
  const external = data.externalRecords.find((row)=>row.internalEntityId===id && row.entityType==="order");

  if (!order) return <AppShell><div className="card"><h1>Order not found</h1><Link className="text-link" href="/lifecycle">Return to Lifecycle</Link></div></AppShell>;

  function addManual() {
    if (!manualStageId) return;
    const now = new Date().toISOString();
    addLifecycleEvent({
      id: makeId("life"),
      orderId: order!.id,
      lifecycleStageId: manualStageId,
      source: "manual",
      detail: manualDetail || "Manual lifecycle update.",
      occurredAt: now,
      createdAt: now,
    });
    setManualDetail("");
    setMessage("Manual lifecycle event recorded.");
  }

  function simulateExternal() {
    if (!integrationId || !externalStatus.trim()) return;
    const result = ingestExternalStatus({
      orderId: order!.id,
      integrationId,
      externalId: externalId || external?.externalId,
      externalStatus,
      externalEventId: makeId("evt"),
      detail: "Synthetic external status received in local prototype mode.",
    });
    setMessage(result.exception ? result.exception.message : "External lifecycle event processed.");
  }

  function saveExternalId() {
    if (!integrationId || !externalId.trim()) return;
    linkExternalRecord({
      id: external?.id ?? makeId("ext"),
      integrationId,
      entityType: "order",
      internalEntityId: order!.id,
      externalId: externalId.trim(),
      externalStatus: external?.externalStatus,
      lastSyncedAt: new Date().toISOString(),
    });
    setMessage("External record link saved.");
  }

  return <AppShell>
    <div className="breadcrumbs"><Link href="/lifecycle">Lifecycle</Link><span>/</span>{order.customerName}</div>
    <div className="page-header">
      <div><div className="eyebrow">Lifecycle Order</div><h1>{order.customerName}</h1><p className="muted">{order.productNameSnapshot} · {order.installDate} {order.installTime}</p></div>
      <div className="status-stack"><span className="badge">{current?.name ?? "No lifecycle"}</span><Link className="button secondary" href={`/sales/orders/${order.id}`}>Order detail</Link></div>
    </div>

    {message && <div className="success-banner"><strong>Lifecycle updated</strong><span>{message}</span></div>}

    <div className="grid location-summary-grid">
      <div className="card"><div className="eyebrow">Current stage</div><div className="metric-small">{current?.name ?? "—"}</div></div>
      <div className="card"><div className="eyebrow">External ID</div><div className="metric-small">{external?.externalId ?? "Not linked"}</div></div>
      <div className="card"><div className="eyebrow">Events</div><div className="metric-small">{events.length}</div></div>
      <div className="card"><div className="eyebrow">Exceptions</div><div className="metric-small">{data.lifecycleExceptions.filter((row)=>row.orderId===order.id && row.status==="open").length}</div></div>
    </div>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Manual Update</div><h2>Record lifecycle stage</h2>
        <label>Stage<select value={manualStageId} onChange={(e)=>setManualStageId(e.target.value)}>
          {data.lifecycleStages.filter((row)=>row.isActive).sort((a,b)=>a.sortOrder-b.sortOrder).map((stage)=><option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select></label>
        <label>Detail<textarea value={manualDetail} onChange={(e)=>setManualDetail(e.target.value)} placeholder="Optional operational note" /></label>
        <button className="button" onClick={addManual}>Record stage</button>
      </section>

      <section className="card">
        <div className="eyebrow">Integration Simulator</div><h2>External system event</h2>
        <label>Integration<select value={integrationId} onChange={(e)=>setIntegrationId(e.target.value)}>
          {data.integrations.map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        <label>External order ID<input value={externalId} onChange={(e)=>setExternalId(e.target.value)} placeholder={external?.externalId ?? "CRM-12345"} /></label>
        <div className="row-actions"><button className="button secondary" onClick={saveExternalId}>Save external ID</button></div>
        <label>Incoming external status<input value={externalStatus} onChange={(e)=>setExternalStatus(e.target.value)} placeholder="INSTALLED" /></label>
        <button className="button" onClick={simulateExternal}>Process simulated event</button>
        <p className="muted small">Mapped statuses create lifecycle events. Unmapped statuses create an exception instead.</p>
      </section>
    </div>

    <section className="card section-block">
      <div className="section-heading compact"><div><div className="eyebrow">History</div><h2>Lifecycle timeline</h2></div></div>
      {events.length === 0 ? <div className="empty-state">No lifecycle events yet.</div> :
      <div className="simple-timeline">
        {events.map((event)=>{
          const stage = data.lifecycleStages.find((row)=>row.id===event.lifecycleStageId);
          const integration = data.integrations.find((row)=>row.id===event.integrationId);
          return <div key={event.id} className={event.id===events[0]?.id?"current":""}>
            <strong>{stage?.name ?? "Unknown stage"}</strong>
            <span>{new Date(event.occurredAt).toLocaleString()} · {event.source}{integration ? ` · ${integration.name}` : ""}</span>
            {event.externalStatus && <span>External status: {event.externalStatus}</span>}
            {event.detail && <span>{event.detail}</span>}
          </div>;
        })}
      </div>}
    </section>
  </AppShell>;
}
