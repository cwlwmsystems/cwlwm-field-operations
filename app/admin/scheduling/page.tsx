"use client";

import {FormEvent,useMemo,useState} from "react";
import {AppShell} from "@/components/AppShell";
import {AdminNav} from "@/components/admin/AdminNav";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";
import {useSupabaseScheduling} from "@/lib/scheduling/SupabaseSchedulingProvider";
import type {DemoSchedulingOverride,DemoSchedulingPolicy} from "@/lib/types/platform";

const weekdays=[[1,"Mon"],[2,"Tue"],[3,"Wed"],[4,"Thu"],[5,"Fri"],[6,"Sat"],[0,"Sun"]] as const;
const blankPolicy=():DemoSchedulingPolicy=>({id:"",name:"",territoryId:"",teamId:"",allowedWeekdays:[1,2,3,4,5],times:["8:00 AM","10:00 AM","1:00 PM","3:00 PM"],defaultCapacity:1,minimumLeadHours:12,isActive:true});
const blankOverride=():DemoSchedulingOverride=>({id:"",territoryId:"",date:"",time:"",isBlackout:true,note:""});

export default function Page(){
 const {territories}=useSupabaseConfig();
 const sched=useSupabaseScheduling();
 const [policy,setPolicy]=useState(blankPolicy());
 const [override,setOverride]=useState(blankOverride());
 const [timesText,setTimesText]=useState(policy.times.join(", "));
 const [mode,setMode]=useState<"blackout"|"capacity">("blackout");
 const [message,setMessage]=useState("");
 const territoryName=useMemo(()=>Object.fromEntries(territories.map(t=>[t.id,t.name])),[territories]);

 function editPolicy(row:DemoSchedulingPolicy){setPolicy(row);setTimesText(row.times.join(", "));}
 async function savePolicy(e:FormEvent){e.preventDefault();try{
  const times=timesText.split(",").map(v=>v.trim()).filter(Boolean);
  await sched.savePolicy({...policy,times}); const n=blankPolicy();setPolicy(n);setTimesText(n.times.join(", "));setMessage("Scheduling policy saved to Supabase.");
 }catch(e){setMessage(e instanceof Error?e.message:"Save failed");}}
 async function saveOverride(e:FormEvent){e.preventDefault();try{
  await sched.saveOverride({...override,isBlackout:mode==="blackout",capacity:mode==="capacity"?Math.max(0,Number(override.capacity??0)):undefined});
  setOverride(blankOverride());setMessage("Scheduling override saved to Supabase.");
 }catch(e){setMessage(e instanceof Error?e.message:"Save failed");}}

 return <AppShell>
  <div className="page-header"><div><div className="eyebrow">Admin · Supabase</div><h1>Scheduling</h1><p className="muted">Policies, capacity, lead time, blackouts, and overrides are live in Supabase.</p></div></div>
  <AdminNav/>
  {sched.error&&<div className="error-banner"><strong>Scheduling error</strong><span>{sched.error}</span></div>}
  {message&&<div className="form-message">{message}</div>}

  <div className="admin-split">
   <form className="card admin-form single" onSubmit={savePolicy}>
    <h2>{policy.id?"Edit scheduling policy":"Create scheduling policy"}</h2>
    <label>Policy name<input value={policy.name} onChange={e=>setPolicy({...policy,name:e.target.value})} required/></label>
    <label>Territory<select value={policy.territoryId} onChange={e=>setPolicy({...policy,territoryId:e.target.value})} required><option value="">Select territory</option>{territories.filter(t=>t.status==="active").map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <fieldset><legend>Allowed weekdays</legend><div className="weekday-picker">{weekdays.map(([v,l])=><label key={v} className="weekday-check"><input type="checkbox" checked={policy.allowedWeekdays.includes(v)} onChange={e=>setPolicy({...policy,allowedWeekdays:e.target.checked?[...policy.allowedWeekdays,v]:policy.allowedWeekdays.filter(x=>x!==v)})}/><span>{l}</span></label>)}</div></fieldset>
    <label>Slot times <span className="muted small">comma separated</span><input value={timesText} onChange={e=>setTimesText(e.target.value)}/></label>
    <label>Default capacity<input type="number" min="0" value={policy.defaultCapacity} onChange={e=>setPolicy({...policy,defaultCapacity:Number(e.target.value)})}/></label>
    <label>Minimum lead time (hours)<input type="number" min="0" step="0.5" value={policy.minimumLeadHours} onChange={e=>setPolicy({...policy,minimumLeadHours:Number(e.target.value)})}/></label>
    <label className="check-row"><input type="checkbox" checked={policy.isActive} onChange={e=>setPolicy({...policy,isActive:e.target.checked})}/>Policy active</label>
    <div className="form-actions"><button className="button">Save policy</button><button type="button" className="button secondary" onClick={()=>{const n=blankPolicy();setPolicy(n);setTimesText(n.times.join(", "));}}>Clear</button></div>
   </form>

   <div className="card table-card">{sched.loading?<div className="empty-state">Loading policies…</div>:<table><thead><tr><th>Policy</th><th>Territory</th><th>Days</th><th>Times</th><th>Capacity</th><th></th></tr></thead><tbody>{sched.policies.map(row=><tr key={row.id}><td><strong>{row.name}</strong><div className="muted small">{row.minimumLeadHours}h lead · {row.isActive?"Active":"Inactive"}</div></td><td>{territoryName[row.territoryId]??"Unknown"}</td><td>{row.allowedWeekdays.length}</td><td>{row.times.join(", ")}</td><td>{row.defaultCapacity}</td><td className="row-actions"><button onClick={()=>editPolicy(row)}>Edit</button><button className="danger-link" onClick={async()=>{if(confirm("Delete policy?"))await sched.deletePolicy(row.id)}}>Delete</button></td></tr>)}</tbody></table>}</div>
  </div>

  <section className="section-block">
   <div className="section-heading"><div><div className="eyebrow">Exceptions</div><h2>Blackouts & capacity overrides</h2></div></div>
   <div className="admin-split">
    <form className="card admin-form single" onSubmit={saveOverride}>
     <label>Territory<select value={override.territoryId} onChange={e=>setOverride({...override,territoryId:e.target.value})} required><option value="">Select territory</option>{territories.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
     <label>Date<input type="date" value={override.date} onChange={e=>setOverride({...override,date:e.target.value})} required/></label>
     <label>Specific time <span className="small muted">blank = all day</span><input value={override.time??""} onChange={e=>setOverride({...override,time:e.target.value})} placeholder="10:00 AM"/></label>
     <label>Override type<select value={mode} onChange={e=>setMode(e.target.value as any)}><option value="blackout">Blackout</option><option value="capacity">Capacity override</option></select></label>
     {mode==="capacity"&&<label>Capacity<input type="number" min="0" value={override.capacity??1} onChange={e=>setOverride({...override,capacity:Number(e.target.value)})}/></label>}
     <label>Note<input value={override.note??""} onChange={e=>setOverride({...override,note:e.target.value})}/></label>
     <button className="button">Add override</button>
    </form>
    <div className="card table-card"><table><thead><tr><th>Date</th><th>Territory</th><th>Time</th><th>Rule</th><th>Note</th><th></th></tr></thead><tbody>{sched.overrides.length?sched.overrides.map(row=><tr key={row.id}><td>{row.date}</td><td>{territoryName[row.territoryId]??"Unknown"}</td><td>{row.time||"All day"}</td><td>{row.isBlackout?<span className="badge warning">Blackout</span>:<span className="badge">Capacity {row.capacity}</span>}</td><td>{row.note||"—"}</td><td><button className="danger-link" onClick={()=>sched.deleteOverride(row.id)}>Delete</button></td></tr>):<tr><td colSpan={6}><div className="empty-state">No exceptions configured.</div></td></tr>}</tbody></table></div>
   </div>
  </section>
 </AppShell>;
}
