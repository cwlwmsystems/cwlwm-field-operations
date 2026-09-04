"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {AppShell} from "@/components/AppShell";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";
import {useSupabaseScheduling,type SlotAvailability} from "@/lib/scheduling/SupabaseSchedulingProvider";

function iso(n=0){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}

export default function Page(){
 const config=useSupabaseConfig(); const sched=useSupabaseScheduling();
 const [territoryId,setTerritoryId]=useState("");
 const [date,setDate]=useState(iso());
 const [slots,setSlots]=useState<SlotAvailability[]>([]);
 const [message,setMessage]=useState("");
 const [rescheduleId,setRescheduleId]=useState<string|null>(null);
 const [newDate,setNewDate]=useState(iso(1));
 const [newSlots,setNewSlots]=useState<SlotAvailability[]>([]);
 const [newTime,setNewTime]=useState("");

 useEffect(()=>{if(!territoryId&&config.territories[0])setTerritoryId(config.territories[0].id)},[config.territories,territoryId]);
 useEffect(()=>{if(!territoryId)return;sched.getAvailability(territoryId,date).then(setSlots).catch(e=>setMessage(e.message))},[territoryId,date,sched.policies,sched.appointments]);
 useEffect(()=>{const ap=sched.appointments.find(a=>a.id===rescheduleId);if(!ap)return;sched.getAvailability(ap.territoryId,newDate).then(setNewSlots).catch(e=>setMessage(e.message))},[rescheduleId,newDate,sched.policies,sched.appointments]);

 const territoryMap=useMemo(()=>Object.fromEntries(config.territories.map(x=>[x.id,x.name])),[config.territories]);
 const locationMap=useMemo(()=>Object.fromEntries(config.locations.map(x=>[x.id,x.address])),[config.locations]);
 const repMap=useMemo(()=>Object.fromEntries(config.reps.map(x=>[x.id,x.name])),[config.reps]);

 async function doReschedule(){
  if(!rescheduleId||!newTime)return;
  const current=sched.appointments.find(a=>a.id===rescheduleId);
  const prior=current?`${current.date} · ${current.time}`:"the previous slot";
  try{
    await sched.rescheduleAppointment(rescheduleId,newDate,newTime);
    setMessage(`Install moved from ${prior} to ${newDate} · ${newTime}. The original slot is now released.`);
    setRescheduleId(null);setNewTime("");
  }
  catch(e){setMessage(e instanceof Error?e.message:"Unable to reschedule");}
 }

 return <AppShell>
  <div className="page-header"><div><div className="eyebrow">Scheduling · Supabase</div><h1>Scheduling</h1><p className="muted">Live capacity and appointment management.</p></div><Link className="button" href="/admin/scheduling">Configure scheduling</Link></div>
  {message&&<div className="form-message">{message}</div>}
  <section className="card schedule-capacity-card">
   <div className="section-heading compact"><div><div className="eyebrow">Capacity Viewer</div><h2>Slot availability</h2></div></div>
   <div className="schedule-filters"><label>Territory<select value={territoryId} onChange={e=>setTerritoryId(e.target.value)}>{config.territories.filter(t=>t.status==="active").map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
   {!slots.length?<div className="empty-inline">No valid slots for this territory/date.</div>:<div className="slot-grid">{slots.map(slot=><div key={slot.key} className={`slot-card ${slot.available?"available":"unavailable"}`}><strong>{slot.time}</strong><span>{slot.available?`${slot.remaining} of ${slot.capacity} remaining`:"Unavailable"}</span><small>{slot.booked} booked</small></div>)}</div>}
  </section>

  <section className="section-block"><div className="section-heading"><div><div className="eyebrow">Appointments</div><h2>Booking management</h2></div><span className="badge">{sched.appointments.filter(a=>a.status!=="cancelled").length} active</span></div>
   <div className="card table-card"><table><thead><tr><th>Date / Time</th><th>Customer</th><th>Location</th><th>Territory</th><th>Rep</th><th>Status</th><th></th></tr></thead><tbody>{sched.appointments.length?sched.appointments.map(row=><tr key={row.id}><td><strong>{row.date}</strong><div className="small muted">{row.time}</div></td><td>{row.customerName}</td><td>{locationMap[row.locationId]??"Unknown"}</td><td>{territoryMap[row.territoryId]??"Unknown"}</td><td>{repMap[row.representativeId]??"Unknown"}</td><td><span className="badge">{row.status}</span></td><td className="row-actions">{row.status!=="cancelled"&&row.status!=="completed"&&<><button onClick={()=>{setRescheduleId(row.id);setNewDate(iso(1));setNewTime("")}}>Reschedule</button><button onClick={()=>sched.setAppointmentStatus(row.id,"completed")}>Complete</button><button className="danger-link" onClick={()=>sched.setAppointmentStatus(row.id,"cancelled")}>Cancel</button></>}</td></tr>):<tr><td colSpan={7}><div className="empty-state">No appointments yet.</div></td></tr>}</tbody></table></div>
  </section>

  {rescheduleId&&<div className="modal-backdrop"><div className="card modal-card"><div className="section-heading"><div><div className="eyebrow">Reschedule</div><h2>Move the install to a new slot</h2></div><button className="link-button" onClick={()=>setRescheduleId(null)}>Close</button></div>{sched.appointments.find(a=>a.id===rescheduleId)&&<div className="reschedule-current-slot"><span>Current install</span><strong>{sched.appointments.find(a=>a.id===rescheduleId)?.date} · {sched.appointments.find(a=>a.id===rescheduleId)?.time}</strong><small>The original slot is released only after the new slot is confirmed.</small></div>}<label className="modal-label">New date<input type="date" value={newDate} onChange={e=>{setNewDate(e.target.value);setNewTime("")}}/></label><div className="slot-grid compact-slots">{newSlots.map(slot=><button type="button" disabled={!slot.available} key={slot.key} className={`slot-card slot-button ${newTime===slot.time?"selected":""} ${slot.available?"available":"unavailable"}`} onClick={()=>setNewTime(slot.time)}><strong>{slot.time}</strong><span>{slot.available?`${slot.remaining} remaining`:"Unavailable"}</span></button>)}</div><div className="form-actions"><button className="button" disabled={!newTime} onClick={doReschedule}>Confirm reschedule</button></div></div></div>}
 </AppShell>;
}
