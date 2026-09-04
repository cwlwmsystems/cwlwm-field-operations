import type { PlatformData } from "@/lib/store/platformStore";

export function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);}

export function currentStage(data:PlatformData, orderId:string){
 const latest=[...data.lifecycleEvents].filter(e=>e.orderId===orderId).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt))[0];
 return latest ? data.lifecycleStages.find(s=>s.id===latest.lifecycleStageId) : undefined;
}

export function overview(data:PlatformData){
 const attempts=data.salesAttempts.length, orders=data.orders.length;
 const appt=(status:string)=>data.appointments.filter(a=>a.status===status).length;
 const invoiceValue=data.invoiceBatches.filter(b=>b.status!=="void").reduce((n,b)=>n+b.total,0);
 return {attempts,orders,conversion:attempts?orders/attempts:0,booked:appt("booked")+appt("confirmed")+appt("rescheduled"),completed:appt("completed"),cancelled:appt("cancelled"),noShow:appt("no_show"),exceptions:data.lifecycleExceptions.filter(e=>e.status==="open").length,invoiceValue};
}

export function repPerformance(data:PlatformData){
 return data.reps.map(rep=>{
  const attempts=data.salesAttempts.filter(a=>a.representativeId===rep.id);
  const orders=data.orders.filter(o=>o.representativeId===rep.id);
  const appointments=data.appointments.filter(a=>a.representativeId===rep.id);
  const team=data.teams.find(t=>t.id===rep.teamId);
  return {id:rep.id,name:rep.name,team:team?.name??rep.team,attempts:attempts.length,orders:orders.length,conversion:attempts.length?orders.length/attempts.length:0,appointments:appointments.length,completed:appointments.filter(a=>a.status==="completed").length};
 }).sort((a,b)=>b.orders-a.orders||b.conversion-a.conversion);
}

export function territoryPerformance(data:PlatformData){
 return data.territories.map(t=>{
  const locIds=new Set(data.locations.filter(l=>l.territoryId===t.id).map(l=>l.id));
  const attempts=data.salesAttempts.filter(a=>locIds.has(a.locationId));
  const orders=data.orders.filter(o=>locIds.has(o.locationId));
  return {id:t.id,name:t.name,market:t.market,locations:locIds.size,attempts:attempts.length,orders:orders.length,conversion:attempts.length?orders.length/attempts.length:0};
 }).sort((a,b)=>b.orders-a.orders||b.conversion-a.conversion);
}

export function lifecycleFunnel(data:PlatformData){
 const counts=new Map<string,number>();
 data.orders.forEach(o=>{const st=currentStage(data,o.id); if(st) counts.set(st.id,(counts.get(st.id)??0)+1)});
 return [...data.lifecycleStages].filter(s=>s.isActive).sort((a,b)=>a.sortOrder-b.sortOrder).map(s=>({id:s.id,name:s.name,count:counts.get(s.id)??0,category:s.category}));
}

export function financeSummary(data:PlatformData){
 const batches=data.invoiceBatches.filter(b=>b.status!=="void");
 return {batches:batches.length,subtotal:batches.reduce((n,b)=>n+b.subtotal,0),adjustments:batches.reduce((n,b)=>n+b.adjustmentsTotal,0),total:batches.reduce((n,b)=>n+b.total,0),draft:batches.filter(b=>b.status==="draft").length,finalized:batches.filter(b=>b.status==="finalized").length,exported:batches.filter(b=>b.status==="exported").length};
}
