"use client";

import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { makeId, type DemoSchedulingOverride, type DemoSchedulingPolicy, usePlatformStore } from "@/lib/store/platformStore";

const weekdays = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"],
] as const;

const blankPolicy = (): DemoSchedulingPolicy => ({
  id: makeId("schedule"), name: "", territoryId: "", teamId: "", allowedWeekdays: [1,2,3,4,5],
  times: ["8:00 AM", "10:00 AM", "1:00 PM", "3:00 PM"], defaultCapacity: 1, minimumLeadHours: 12, isActive: true,
});

const blankOverride = (): DemoSchedulingOverride => ({ id: makeId("override"), territoryId: "", date: "", time: "", isBlackout: true, note: "" });

export default function SchedulingAdminPage() {
  const { data, saveSchedulingPolicy, deleteSchedulingPolicy, saveSchedulingOverride, deleteSchedulingOverride } = usePlatformStore();
  const [policy, setPolicy] = useState<DemoSchedulingPolicy>(blankPolicy());
  const [override, setOverride] = useState<DemoSchedulingOverride>(blankOverride());
  const [timesText, setTimesText] = useState(policy.times.join(", "));
  const [overrideMode, setOverrideMode] = useState<"blackout" | "capacity">("blackout");

  const territoryName = useMemo(() => Object.fromEntries(data.territories.map((row) => [row.id, row.name])), [data.territories]);

  function editPolicy(row: DemoSchedulingPolicy) {
    setPolicy(row);
    setTimesText(row.times.join(", "));
  }

  function savePolicy(e: FormEvent) {
    e.preventDefault();
    const times = timesText.split(",").map((value) => value.trim()).filter(Boolean);
    if (!policy.name.trim() || !policy.territoryId || !times.length || !policy.allowedWeekdays.length) return;
    const territory = data.territories.find((row) => row.id === policy.territoryId);
    saveSchedulingPolicy({ ...policy, name: policy.name.trim(), times, teamId: territory?.teamId ?? policy.teamId });
    const next = blankPolicy(); setPolicy(next); setTimesText(next.times.join(", "));
  }

  function saveOverride(e: FormEvent) {
    e.preventDefault();
    if (!override.territoryId || !override.date) return;
    saveSchedulingOverride({
      ...override,
      time: override.time || undefined,
      isBlackout: overrideMode === "blackout",
      capacity: overrideMode === "capacity" ? Math.max(0, Number(override.capacity ?? 0)) : undefined,
    });
    setOverride(blankOverride());
  }

  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Admin & Configuration</div><h1>Scheduling</h1><p className="muted">Define territory calendars, slot times, capacity, lead time, blackout dates, and one-off capacity overrides.</p></div></div>
    <AdminNav />

    <div className="admin-split">
      <form className="card admin-form single" onSubmit={savePolicy}>
        <h2>{data.schedulingPolicies.some((row)=>row.id===policy.id) ? "Edit scheduling policy" : "Create scheduling policy"}</h2>
        <label>Policy name<input value={policy.name} onChange={(e)=>setPolicy({...policy,name:e.target.value})} placeholder="Weekday Install Schedule" /></label>
        <label>Territory<select value={policy.territoryId} onChange={(e)=>setPolicy({...policy,territoryId:e.target.value})}><option value="">Select territory</option>{data.territories.filter((row)=>row.status==="active").map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <fieldset><legend>Allowed weekdays</legend><div className="weekday-picker">{weekdays.map(([value,label])=><label key={value} className="weekday-check"><input type="checkbox" checked={policy.allowedWeekdays.includes(value)} onChange={(e)=>setPolicy({...policy,allowedWeekdays:e.target.checked?[...policy.allowedWeekdays,value]:policy.allowedWeekdays.filter((day)=>day!==value)})}/><span>{label}</span></label>)}</div></fieldset>
        <label>Slot times <span className="muted small">comma separated</span><input value={timesText} onChange={(e)=>setTimesText(e.target.value)} placeholder="8:00 AM, 10:00 AM, 1:00 PM" /></label>
        <label>Default capacity<input type="number" min="0" value={policy.defaultCapacity} onChange={(e)=>setPolicy({...policy,defaultCapacity:Number(e.target.value)})} /></label>
        <label>Minimum lead time (hours)<input type="number" min="0" value={policy.minimumLeadHours} onChange={(e)=>setPolicy({...policy,minimumLeadHours:Number(e.target.value)})} /></label>
        <label className="check-row"><input type="checkbox" checked={policy.isActive} onChange={(e)=>setPolicy({...policy,isActive:e.target.checked})}/>Policy active</label>
        <div className="form-actions"><button className="button" type="submit">Save policy</button><button className="button secondary" type="button" onClick={()=>{const next=blankPolicy();setPolicy(next);setTimesText(next.times.join(", "));}}>Clear</button></div>
      </form>

      <div className="card table-card"><table><thead><tr><th>Policy</th><th>Territory</th><th>Days</th><th>Times</th><th>Capacity</th><th></th></tr></thead><tbody>{data.schedulingPolicies.map((row)=><tr key={row.id}><td><strong>{row.name}</strong><div className="small muted">{row.minimumLeadHours}h lead · {row.isActive?"Active":"Inactive"}</div></td><td>{territoryName[row.territoryId] ?? "Unknown"}</td><td>{row.allowedWeekdays.length} days</td><td>{row.times.join(", ")}</td><td>{row.defaultCapacity}</td><td className="row-actions"><button onClick={()=>editPolicy(row)}>Edit</button><button className="danger-link" onClick={()=>deleteSchedulingPolicy(row.id)}>Delete</button></td></tr>)}</tbody></table></div>
    </div>

    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">Exceptions</div><h2>Blackouts & capacity overrides</h2></div></div>
      <div className="admin-split">
        <form className="card admin-form single" onSubmit={saveOverride}>
          <label>Territory<select value={override.territoryId} onChange={(e)=>setOverride({...override,territoryId:e.target.value})}><option value="">Select territory</option>{data.territories.map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label>Date<input type="date" value={override.date} onChange={(e)=>setOverride({...override,date:e.target.value})}/></label>
          <label>Specific time <span className="small muted">optional — blank applies all day</span><input value={override.time ?? ""} onChange={(e)=>setOverride({...override,time:e.target.value})} placeholder="10:00 AM" /></label>
          <label>Override type<select value={overrideMode} onChange={(e)=>setOverrideMode(e.target.value as "blackout"|"capacity")}><option value="blackout">Blackout / unavailable</option><option value="capacity">Capacity override</option></select></label>
          {overrideMode === "capacity" && <label>Capacity<input type="number" min="0" value={override.capacity ?? 1} onChange={(e)=>setOverride({...override,capacity:Number(e.target.value)})}/></label>}
          <label>Note<input value={override.note ?? ""} onChange={(e)=>setOverride({...override,note:e.target.value})} placeholder="Holiday / staffing change" /></label>
          <div className="form-actions"><button className="button" type="submit">Add override</button></div>
        </form>
        <div className="card table-card"><table><thead><tr><th>Date</th><th>Territory</th><th>Time</th><th>Rule</th><th>Note</th><th></th></tr></thead><tbody>{data.schedulingOverrides.length ? data.schedulingOverrides.map((row)=><tr key={row.id}><td>{row.date}</td><td>{territoryName[row.territoryId] ?? "Unknown"}</td><td>{row.time || "All day"}</td><td>{row.isBlackout ? <span className="badge warning">Blackout</span> : <span className="badge">Capacity {row.capacity}</span>}</td><td>{row.note || "—"}</td><td className="row-actions"><button className="danger-link" onClick={()=>deleteSchedulingOverride(row.id)}>Delete</button></td></tr>) : <tr><td colSpan={6}><div className="empty-state">No scheduling exceptions configured.</div></td></tr>}</tbody></table></div>
      </div>
    </section>
  </AppShell>;
}
