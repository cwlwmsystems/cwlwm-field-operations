"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { usePlatformStore } from "@/lib/store/platformStore";

function todayIso(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function plusDays(n:number){ const d=new Date(); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function SchedulingPage(){
  const { data, getAvailability, cancelAppointment, rescheduleAppointment, updateAppointment } = usePlatformStore();
  const [territoryId,setTerritoryId]=useState(data.territories[0]?.id ?? "");
  const [date,setDate]=useState(todayIso());
  const [message,setMessage]=useState("");
  const [rescheduleId,setRescheduleId]=useState<string | null>(null);
  const [newDate,setNewDate]=useState(plusDays(1));
  const [newTime,setNewTime]=useState("");
  const availability=getAvailability(territoryId,date);
  const territoryMap=useMemo(()=>Object.fromEntries(data.territories.map((r)=>[r.id,r.name])),[data.territories]);
  const locationMap=useMemo(()=>Object.fromEntries(data.locations.map((r)=>[r.id,r.address])),[data.locations]);
  const repMap=useMemo(()=>Object.fromEntries(data.reps.map((r)=>[r.id,r.name])),[data.reps]);
  const appointments=[...data.appointments].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const rescheduleAppointmentRow=data.appointments.find((row)=>row.id===rescheduleId);
  const rescheduleSlots=rescheduleAppointmentRow ? getAvailability(rescheduleAppointmentRow.territoryId,newDate) : [];

  function doReschedule(){
    if(!rescheduleId || !newDate || !newTime) return;
    try { rescheduleAppointment(rescheduleId,newDate,newTime); setMessage("Appointment rescheduled and the linked order date/time was updated."); setRescheduleId(null); setNewTime(""); }
    catch(e){ setMessage(e instanceof Error ? e.message : "Unable to reschedule appointment."); }
  }

  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Operations</div><h1>Scheduling</h1><p className="muted">Monitor capacity and manage booked appointments across territories.</p></div><Link className="button" href="/admin/scheduling">Configure scheduling</Link></div>
    {message && <div className="form-message">{message}</div>}
    <section className="card schedule-capacity-card">
      <div className="section-heading compact"><div><div className="eyebrow">Capacity Viewer</div><h2>Slot availability</h2></div></div>
      <div className="schedule-filters"><label>Territory<select value={territoryId} onChange={(e)=>setTerritoryId(e.target.value)}>{data.territories.filter((r)=>r.status==="active").map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/></label></div>
      {!availability.length ? <div className="empty-inline">No active scheduling policy or this date is not an allowed weekday.</div> : <div className="slot-grid">{availability.map((slot)=><div key={slot.key} className={`slot-card ${slot.available?"available":"unavailable"}`}><strong>{slot.time}</strong><span>{slot.blackout?"Blackout":`${slot.remaining} of ${slot.capacity} remaining`}</span><small>{slot.booked} booked</small></div>)}</div>}
    </section>

    <section className="section-block"><div className="section-heading"><div><div className="eyebrow">Appointments</div><h2>Booking management</h2></div><span className="badge">{appointments.filter((a)=>a.status!=="cancelled").length} active</span></div>
      <div className="card table-card"><table><thead><tr><th>Date / Time</th><th>Customer</th><th>Location</th><th>Territory</th><th>Rep</th><th>Status</th><th></th></tr></thead><tbody>{appointments.length ? appointments.map((row)=><tr key={row.id}><td><strong>{row.date}</strong><div className="small muted">{row.time}</div></td><td>{row.customerName}</td><td>{locationMap[row.locationId] ?? "Unknown"}</td><td>{territoryMap[row.territoryId] ?? "Unknown"}</td><td>{repMap[row.representativeId] ?? "Unknown"}</td><td><span className={`badge ${row.status==="cancelled"?"warning":row.status==="completed"?"success":""}`}>{row.status.replaceAll("_"," ")}</span></td><td className="row-actions">{row.status!=="cancelled" && <><button onClick={()=>{setRescheduleId(row.id);setNewDate(plusDays(1));setNewTime("");}}>Reschedule</button>{row.status!=="completed" && <button onClick={()=>updateAppointment(row.id,{status:"completed"})}>Complete</button>}<button className="danger-link" onClick={()=>{cancelAppointment(row.id);setMessage("Appointment cancelled. Its former slot capacity is available again.");}}>Cancel</button></>}</td></tr>) : <tr><td colSpan={7}><div className="empty-state">No appointments yet. Submit a sale with an available slot to create one.</div></td></tr>}</tbody></table></div>
    </section>

    {rescheduleAppointmentRow && <div className="modal-backdrop"><div className="card modal-card"><div className="section-heading"><div><div className="eyebrow">Reschedule</div><h2>{rescheduleAppointmentRow.customerName}</h2></div><button className="link-button" onClick={()=>setRescheduleId(null)}>Close</button></div><label className="modal-label">New date<input type="date" value={newDate} onChange={(e)=>{setNewDate(e.target.value);setNewTime("");}}/></label><div className="slot-grid compact-slots">{rescheduleSlots.map((slot)=><button type="button" disabled={!slot.available} key={slot.key} className={`slot-card slot-button ${newTime===slot.time?"selected":""} ${slot.available?"available":"unavailable"}`} onClick={()=>setNewTime(slot.time)}><strong>{slot.time}</strong><span>{slot.available?`${slot.remaining} remaining`:slot.blackout?"Blackout":"Unavailable"}</span></button>)}</div><div className="form-actions"><button className="button" onClick={doReschedule} disabled={!newTime}>Confirm reschedule</button></div></div></div>}
  </AppShell>;
}
