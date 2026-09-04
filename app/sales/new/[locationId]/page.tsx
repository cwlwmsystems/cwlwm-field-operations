"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { makeId, type DemoAppointment, type DemoSalesAttempt, usePlatformStore } from "@/lib/store/platformStore";

function todayIso(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function SalesCapturePage() {
  const { locationId } = useParams<{ locationId: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { data, saveSalesAttempt, submitOrder, getAvailability, bookAppointment } = usePlatformStore();
  const location = data.locations.find((row) => row.id === locationId);
  const queryAttempt = params.get("attempt");
  const existingAttempt = data.salesAttempts.find((row) => row.id === queryAttempt) ?? data.salesAttempts.find((row) => row.locationId === locationId && row.status === "in_progress");
  const reps = data.reps.filter((row) => row.status === "active" && (!location || row.territoryIds.includes(location.territoryId)));

  const [attemptId] = useState(existingAttempt?.id ?? makeId("attempt"));
  const [clientAttemptId] = useState(existingAttempt?.clientAttemptId ?? makeId("submission"));
  const [repId, setRepId] = useState(existingAttempt?.representativeId ?? location?.assignedRepId ?? "");
  const [firstName, setFirstName] = useState(existingAttempt?.firstName ?? "");
  const [lastName, setLastName] = useState(existingAttempt?.lastName ?? "");
  const [phone, setPhone] = useState(existingAttempt?.phone ?? "");
  const [email, setEmail] = useState(existingAttempt?.email ?? "");
  const [notes, setNotes] = useState(existingAttempt?.notes ?? "");
  const [productId, setProductId] = useState(existingAttempt?.productId ?? "");
  const [offerId, setOfferId] = useState(existingAttempt?.offerId ?? "");
  const [installDate, setInstallDate] = useState(existingAttempt?.installDate ?? todayIso());
  const [installTime, setInstallTime] = useState(existingAttempt?.installTime ?? "");
  const [message, setMessage] = useState("");

  const activeProducts = data.products.filter((row) => row.isActive);
  const activeOffers = useMemo(() => data.offers.filter((row) => row.isActive && (!productId || row.productId === productId)), [data.offers, productId]);
  const product = data.products.find((row) => row.id === productId);
  const offer = data.offers.find((row) => row.id === offerId);
  const slots = location ? getAvailability(location.territoryId, installDate) : [];
  const selectedSlot = slots.find((row)=>row.time===installTime);

  const progress = installDate && installTime ? { step: 4, stage: "appointment_selected" }
    : productId && offerId ? { step: 3, stage: "offer_selected" }
    : phone || email ? { step: 2, stage: "contact_captured" }
    : firstName || lastName || notes ? { step: 1, stage: "customer_info" }
    : { step: 0, stage: "started" };

  useEffect(() => {
    if (!productId) return;
    if (offerId && !activeOffers.some((row) => row.id === offerId)) setOfferId("");
  }, [productId, offerId, activeOffers]);

  useEffect(()=>{
    if(installTime && !slots.some((slot)=>slot.time===installTime && slot.available)) setInstallTime("");
  },[installDate]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildAttempt(status: DemoSalesAttempt["status"] = "in_progress"): DemoSalesAttempt {
    const now = new Date().toISOString();
    return {
      id: attemptId, clientAttemptId, locationId, representativeId: repId,
      firstName, lastName, phone, email, notes, productId: productId || undefined, offerId: offerId || undefined,
      installDate: installDate || undefined, installTime: installTime || undefined,
      appointmentSlotKey: installDate && installTime && location ? `${location.territoryId}|${installDate}|${installTime}` : undefined,
      progressStep: progress.step, progressStage: progress.stage, status,
      startedAt: existingAttempt?.startedAt ?? now, updatedAt: now,
      convertedAt: status === "converted" ? now : existingAttempt?.convertedAt,
    };
  }

  function saveProgress(e?: FormEvent) {
    e?.preventDefault();
    if (!repId) return setMessage("Choose a representative before saving.");
    saveSalesAttempt(buildAttempt("in_progress"));
    setMessage("Progress saved locally. You can leave this page and resume later.");
  }

  function abandon() { saveSalesAttempt(buildAttempt("abandoned")); router.push("/sales"); }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!location) return;
    if (!repId || !firstName.trim() || !lastName.trim() || (!phone.trim() && !email.trim()) || !product || !offer || !installDate || !installTime || !selectedSlot?.available) {
      return setMessage("Complete the representative, customer name, contact, product, offer, and choose an available appointment slot before submitting.");
    }
    const now = new Date().toISOString();
    const savedAttempt = buildAttempt("in_progress");
    saveSalesAttempt(savedAttempt);
    const appointment: DemoAppointment = {
      id: makeId("appointment"), clientSubmissionId: clientAttemptId, locationId,
      representativeId: repId, territoryId: location.territoryId, teamId: location.teamId,
      date: installDate, time: installTime, status: "booked",
      customerName: `${firstName.trim()} ${lastName.trim()}`, phone: phone.trim(), email: email.trim(), notes: notes.trim(),
      createdAt: now, updatedAt: now,
    };
    try {
      const booked = bookAppointment(appointment);
      const order = submitOrder({
        id: makeId("order"), clientSubmissionId: clientAttemptId, locationId, representativeId: repId,
        salesAttemptId: attemptId, appointmentId: booked.id, customerName: appointment.customerName,
        phone: phone.trim(), email: email.trim(), productId: product.id, offerId: offer.id,
        productNameSnapshot: product.name, offerNameSnapshot: offer.name, pricingSnapshot: { phases: offer.phases },
        installDate, installTime, notes: notes.trim(), orderStatus: "submitted", reviewStatus: "pending", createdAt: now, updatedAt: now,
      });
      router.push(`/sales/orders/${order.id}?submitted=1`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reserve that appointment slot.");
    }
  }

  if (!location) return <AppShell><div className="card"><h1>Location not found</h1><Link className="text-link" href="/locations">Return to locations</Link></div></AppShell>;

  return <AppShell>
    <div className="breadcrumbs"><Link href="/locations">Locations</Link><span>/</span><Link href={`/locations/${location.id}`}>{location.address}</Link><span>/</span>Start Sale</div>
    <div className="page-header"><div><div className="eyebrow">Sales Capture</div><h1>{existingAttempt ? "Resume Sale" : "Start Sale"}</h1><p className="muted">{location.address}, {location.city}, {location.state} {location.postalCode}</p></div><span className="badge">Step {progress.step}/4 · {progress.stage.replaceAll("_", " ")}</span></div>
    <div className="mock-notice"><strong>Local transaction mode:</strong> scheduling policy and capacity are enforced in the browser store for this prototype. The database RPC remains the production concurrency layer.</div>

    <form onSubmit={submit} className="sales-wizard">
      <section className="card sales-step"><div className="step-number">1</div><div className="step-body"><h2>Customer & representative</h2><p className="muted">Capture who is making the sale and the minimum customer identity/contact information.</p><div className="form-grid">
        <label className="full-width">Representative<select value={repId} onChange={(e)=>setRepId(e.target.value)}><option value="">Select representative</option>{reps.map((rep)=><option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
        <label>First name<input value={firstName} onChange={(e)=>setFirstName(e.target.value)} /></label><label>Last name<input value={lastName} onChange={(e)=>setLastName(e.target.value)} /></label><label>Phone<input value={phone} onChange={(e)=>setPhone(e.target.value)} /></label><label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label><label className="full-width">Notes<textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} /></label>
      </div></div></section>

      <section className="card sales-step"><div className="step-number">2</div><div className="step-body"><h2>Product</h2><p className="muted">Products are generic organization catalog records.</p><div className="product-grid">{activeProducts.map((row)=><button type="button" onClick={()=>setProductId(row.id)} key={row.id} className={`select-card ${productId===row.id?"selected":""}`}><strong>{row.name}</strong><span>{row.serviceLevel} service level</span><span className="muted">Base ${row.basePrice.toFixed(2)}/mo</span></button>)}</div></div></section>

      <section className="card sales-step"><div className="step-number">3</div><div className="step-body"><h2>Offer</h2><p className="muted">Available offers are filtered by product and snapshotted on submission.</p>{!productId ? <div className="empty-inline">Select a product first.</div> : <div className="offer-grid">{activeOffers.map((row)=><button type="button" onClick={()=>setOfferId(row.id)} key={row.id} className={`select-card offer-card ${offerId===row.id?"selected":""}`}><div><strong>{row.name}</strong> <span className="badge">{row.badge}</span></div>{row.phases.map((phase)=><span key={phase.label}>{phase.label}: {phase.price===0?"$0":`$${phase.price.toFixed(2)}/mo`} <span className="muted">({phase.months})</span></span>)}<small>{row.disclosure}</small></button>)}</div>}</div></section>

      <section className="card sales-step"><div className="step-number">4</div><div className="step-body"><h2>Appointment</h2><p className="muted">Only policy-approved slots with remaining territory capacity can be selected.</p><div className="form-grid"><label className="full-width">Appointment date<input type="date" value={installDate} onChange={(e)=>{setInstallDate(e.target.value);setInstallTime("");}} /></label></div>
        {!slots.length ? <div className="empty-inline">No available scheduling policy for this date. Choose another date or ask an administrator to configure the territory schedule.</div> : <div className="slot-grid">{slots.map((slot)=><button type="button" disabled={!slot.available} key={slot.key} onClick={()=>setInstallTime(slot.time)} className={`slot-card slot-button ${installTime===slot.time?"selected":""} ${slot.available?"available":"unavailable"}`}><strong>{slot.time}</strong><span>{slot.blackout?"Blackout":slot.available?`${slot.remaining} of ${slot.capacity} remaining`:"Unavailable"}</span><small>{slot.booked} booked</small></button>)}</div>}
      </div></section>

      <section className="card order-review-card"><div className="section-heading compact"><div><div className="eyebrow">Final Review</div><h2>Ready to submit?</h2></div></div><div className="review-grid"><div><span>Customer</span><strong>{[firstName,lastName].filter(Boolean).join(" ") || "Not entered"}</strong></div><div><span>Product</span><strong>{product?.name ?? "Not selected"}</strong></div><div><span>Offer</span><strong>{offer?.name ?? "Not selected"}</strong></div><div><span>Appointment</span><strong>{installDate && installTime ? `${installDate} · ${installTime}` : "Not selected"}</strong></div></div>{message && <div className="form-message">{message}</div>}<div className="form-actions"><button type="button" className="button secondary" onClick={()=>saveProgress()}>Save progress</button><button type="button" className="danger-link" onClick={abandon}>Abandon attempt</button><button type="submit" className="button">Submit Order</button></div></section>
    </form>
  </AppShell>;
}
