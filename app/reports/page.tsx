"use client";
import Link from "next/link";
import {AppShell} from "@/components/AppShell";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";
import {useSupabaseSales} from "@/lib/sales/SupabaseSalesProvider";
import {useSupabaseScheduling} from "@/lib/scheduling/SupabaseSchedulingProvider";
import {useSupabaseLifecycle} from "@/lib/lifecycle/SupabaseLifecycleProvider";
import {useSupabaseFinance} from "@/lib/finance/SupabaseFinanceProvider";
import {conversion,money,pct} from "@/lib/reporting/liveMetrics";

export default function ReportsPage(){
 const config=useSupabaseConfig(),sales=useSupabaseSales(),sched=useSupabaseScheduling(),life=useSupabaseLifecycle(),fin=useSupabaseFinance();
 const attempts=sales.attempts.length,orders=sales.orders.length;
 const invoiceValue=fin.batches.filter(x=>x.status!=="void").reduce((s,x)=>s+fin.getBatchTotal(x.id),0);
 const repRows=config.reps.map(rep=>{
  const a=sales.attempts.filter(x=>x.representativeId===rep.id).length;
  const o=sales.orders.filter(x=>x.representativeId===rep.id).length;
  return {id:rep.id,name:rep.name,team:config.teams.find(t=>t.id===rep.teamId)?.name??"Unassigned",attempts:a,orders:o,conv:conversion(a,o)};
 }).sort((a,b)=>b.orders-a.orders).slice(0,5);
 const terrRows=config.territories.map(t=>{
  const locIds=new Set(config.locations.filter(l=>l.territoryId===t.id).map(l=>l.id));
  const a=sales.attempts.filter(x=>locIds.has(x.locationId)).length;
  const o=sales.orders.filter(x=>locIds.has(x.locationId)).length;
  return {id:t.id,name:t.name,market:t.market,attempts:a,orders:o,conv:conversion(a,o)};
 }).sort((a,b)=>b.orders-a.orders).slice(0,5);
 const stageRows=life.stages.map(stage=>({id:stage.id,name:stage.name,count:sales.orders.filter(o=>life.getCurrentStage(o.id)?.id===stage.id).length}));
 const max=Math.max(1,...stageRows.map(x=>x.count));
 return <AppShell>
  <div className="page-header"><div><div className="eyebrow">Reporting & Analytics · Supabase</div><h1>Operations Dashboard</h1><p className="muted">Live management visibility across sales, scheduling, lifecycle, finance, and exports.</p></div></div>
  <div className="grid metric-grid">
   <div className="card"><div className="eyebrow">Sales attempts</div><div className="metric">{attempts}</div></div>
   <div className="card"><div className="eyebrow">Orders</div><div className="metric">{orders}</div></div>
   <div className="card"><div className="eyebrow">Conversion</div><div className="metric">{pct(conversion(attempts,orders))}</div></div>
   <div className="card"><div className="eyebrow">Invoice value</div><div className="metric">{money(invoiceValue,fin.settings?.currency??"USD")}</div></div>
   <div className="card"><div className="eyebrow">Open exceptions</div><div className="metric">{life.exceptions.filter(x=>x.status==="open").length}</div></div>
  </div>
  <div className="grid two-column section-block">
   <section className="card table-card"><div className="section-heading compact"><div><div className="eyebrow">Sales Performance</div><h2>Representatives</h2></div><Link className="text-link" href="/reports/reps">Full report</Link></div><table><thead><tr><th>Rep</th><th>Team</th><th>Attempts</th><th>Orders</th><th>Conv.</th></tr></thead><tbody>{repRows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.team}</td><td>{r.attempts}</td><td>{r.orders}</td><td>{pct(r.conv)}</td></tr>)}</tbody></table></section>
   <section className="card table-card"><div className="section-heading compact"><div><div className="eyebrow">Territory Performance</div><h2>Territories</h2></div><Link className="text-link" href="/reports/territories">Full report</Link></div><table><thead><tr><th>Territory</th><th>Market</th><th>Attempts</th><th>Orders</th><th>Conv.</th></tr></thead><tbody>{terrRows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.market}</td><td>{r.attempts}</td><td>{r.orders}</td><td>{pct(r.conv)}</td></tr>)}</tbody></table></section>
  </div>
  <div className="grid two-column section-block">
   <section className="card"><div className="section-heading compact"><div><div className="eyebrow">Lifecycle Funnel</div><h2>Current stages</h2></div><Link className="text-link" href="/reports/lifecycle">Lifecycle report</Link></div><div className="report-bars">{stageRows.map(r=><div className="report-bar-row" key={r.id}><div className="report-bar-label"><span>{r.name}</span><strong>{r.count}</strong></div><div className="report-bar-track"><div className="report-bar-fill" style={{width:`${Math.max(4,r.count/max*100)}%`}}/></div></div>)}</div></section>
   <section className="card"><div className="section-heading compact"><div><div className="eyebrow">Scheduling</div><h2>Appointment outcomes</h2></div><Link className="text-link" href="/reports/scheduling">Scheduling report</Link></div><div className="summary-list"><div><span>Active</span><strong>{sched.appointments.filter(x=>x.status==="booked"||x.status==="confirmed"||x.status==="rescheduled").length}</strong></div><div><span>Completed</span><strong>{sched.appointments.filter(x=>x.status==="completed").length}</strong></div><div><span>Cancelled</span><strong>{sched.appointments.filter(x=>x.status==="cancelled").length}</strong></div><div><span>No show</span><strong>{sched.appointments.filter(x=>x.status==="no_show").length}</strong></div></div></section>
  </div>
  <section className="card section-block"><div className="section-heading compact"><div><div className="eyebrow">Finance</div><h2>Invoice performance</h2></div><Link className="text-link" href="/reports/finance">Finance report</Link></div><div className="grid compact-metrics"><div><span>Batches</span><strong>{fin.batches.length}</strong></div><div><span>Finalized</span><strong>{fin.batches.filter(x=>x.status==="finalized").length}</strong></div><div><span>Exported</span><strong>{fin.batches.filter(x=>x.status==="exported").length}</strong></div><div><span>Artifacts</span><strong>{fin.exports.length}</strong></div></div></section>
 </AppShell>;
}
