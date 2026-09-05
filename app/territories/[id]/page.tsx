"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FieldMap } from "@/components/field/FieldMap";
import { useAuth } from "@/lib/auth/AuthProvider";
import { operationsAdminRoles } from "@/lib/auth/permissions";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";

type ServiceFilter = "all" | "prospect" | "current_customer" | "do_not_knock" | "vacant" | "business";
const bulkRoles = new Set<string>(operationsAdminRoles);
function percent(value:number,total:number){return total?Math.round((value/total)*100):0;}

export default function TerritoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { membership } = useAuth();
  const config = useSupabaseConfig();
  const ops = useSupabaseTerritoryOps();
  const sales = useSupabaseSales();
  const { territories, markets, teams, reps, locations, loading } = config;
  const [serviceFilter,setServiceFilter] = useState<ServiceFilter>("all");
  const [assignmentFilter,setAssignmentFilter] = useState<"all"|"unassigned"|"assigned">("all");
  const [repId,setRepId] = useState("");
  const [selectedId,setSelectedId] = useState<string>();
  const [bulkBusy,setBulkBusy] = useState(false);
  const [message,setMessage] = useState("");

  const territory = territories.find((row) => row.id === id);
  const territoryLocations = useMemo(()=>locations.filter((location)=>location.territoryId===id),[locations,id]);
  const territoryReps = reps.filter((rep) => rep.territoryIds.includes(id) && rep.status === "active");
  const prospectRows = territoryLocations.filter((l)=>(l.serviceStatus??"prospect")==="prospect");
  const customers = territoryLocations.filter((l)=>l.serviceStatus==="current_customer");
  const doNotKnock = territoryLocations.filter((l)=>l.serviceStatus==="do_not_knock");
  const vacant = territoryLocations.filter((l)=>l.serviceStatus==="vacant");
  const business = territoryLocations.filter((l)=>l.serviceStatus==="business");
  const serviceable = prospectRows.length + customers.length;
  const unworked = prospectRows.filter((l)=>l.disposition==="Unvisited");
  const assignedProspects = prospectRows.filter((l)=>Boolean(l.assignedRepId));
  const workedIds = new Set(ops.interactions.filter((i)=>territoryLocations.some((l)=>l.id===i.locationId)).map((i)=>i.locationId));
  const territoryOrders = sales.orders.filter((o)=>territoryLocations.some((l)=>l.id===o.locationId) && o.orderStatus !== "cancelled");
  const conversion = percent(new Set(territoryOrders.map((o)=>o.locationId)).size, workedIds.size);

  const visibleLocations = territoryLocations.filter((location)=>{
    if(serviceFilter!=="all" && (location.serviceStatus??"prospect")!==serviceFilter) return false;
    if(assignmentFilter==="assigned" && !location.assignedRepId) return false;
    if(assignmentFilter==="unassigned" && location.assignedRepId) return false;
    return true;
  });

  const eligibleForBulk = visibleLocations.filter((location)=>(location.serviceStatus??"prospect")==="prospect");
  const canBulk = bulkRoles.has(membership?.role??"viewer");

  async function assignVisible(){
    if(!canBulk || !repId || eligibleForBulk.length===0) return;
    setBulkBusy(true);setMessage("");
    try{
      await config.bulkAssignLocations(eligibleForBulk.map((l)=>l.id),repId);
      const rep=reps.find((r)=>r.id===repId);
      setMessage(`Assigned ${eligibleForBulk.length.toLocaleString()} eligible prospect locations to ${rep?.name??"representative"}.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to assign locations.");}
    finally{setBulkBusy(false);}
  }

  async function clearVisible(){
    if(!canBulk || eligibleForBulk.length===0) return;
    setBulkBusy(true);setMessage("");
    try{
      await config.bulkAssignLocations(eligibleForBulk.map((l)=>l.id));
      setMessage(`Cleared assignments from ${eligibleForBulk.length.toLocaleString()} eligible prospect locations.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to clear assignments.");}
    finally{setBulkBusy(false);}
  }

  if (loading) return <AppShell><div className="card">Loading territory…</div></AppShell>;
  if (!territory) return <AppShell><div className="card"><h1>Territory not found</h1><Link href="/territories">Return</Link></div></AppShell>;

  return <AppShell>
    <div className="breadcrumbs"><Link href="/territories">Territories</Link><span>/</span>{territory.name}</div>
    <div className="page-header territory-intelligence-header">
      <div><div className="eyebrow">Territory Intelligence</div><h1>{territory.name}</h1><p className="muted">Full-footprint visibility, penetration, eligible workload, and representative coverage.</p></div>
      <span className="badge">{territory.status}</span>
    </div>

    <div className="territory-kpi-grid">
      <div className="card territory-kpi"><span>Total footprint</span><strong>{territoryLocations.length.toLocaleString()}</strong><small>all imported locations</small></div>
      <div className="card territory-kpi"><span>Eligible prospects</span><strong>{prospectRows.length.toLocaleString()}</strong><small>{unworked.length.toLocaleString()} unworked</small></div>
      <div className="card territory-kpi"><span>Current customers</span><strong>{customers.length.toLocaleString()}</strong><small>{percent(customers.length,serviceable)}% penetration</small></div>
      <div className="card territory-kpi"><span>Prospect assignment</span><strong>{assignedProspects.length.toLocaleString()}</strong><small>{percent(assignedProspects.length,prospectRows.length)}% assigned</small></div>
      <div className="card territory-kpi"><span>Worked locations</span><strong>{workedIds.size.toLocaleString()}</strong><small>all-time field activity</small></div>
      <div className="card territory-kpi"><span>Sales conversion</span><strong>{conversion}%</strong><small>{territoryOrders.length.toLocaleString()} submitted orders</small></div>
    </div>

    <section className="card territory-control-center">
      <div className="section-heading"><div><div className="eyebrow">Workload Controls</div><h2>Filter and assign the footprint</h2></div><div className="muted small">Bulk assignment only changes eligible prospects.</div></div>
      <div className="territory-status-filter">
        {([[
          "all","All",territoryLocations.length],["prospect","Prospects",prospectRows.length],["current_customer","Customers",customers.length],["do_not_knock","Do not knock",doNotKnock.length],["vacant","Vacant",vacant.length],["business","Business",business.length
        ]] as any)[0].map(([value,label,count]:[ServiceFilter,string,number])=><button key={value} className={serviceFilter===value?"active":""} onClick={()=>setServiceFilter(value)}><span>{label}</span><strong>{count.toLocaleString()}</strong></button>)}
      </div>
      <div className="territory-workload-toolbar">
        <label>Assignment<select value={assignmentFilter} onChange={(e)=>setAssignmentFilter(e.target.value as typeof assignmentFilter)}><option value="all">All locations</option><option value="unassigned">Unassigned only</option><option value="assigned">Assigned only</option></select></label>
        <label>Representative<select value={repId} onChange={(e)=>setRepId(e.target.value)}><option value="">Choose representative</option>{territoryReps.map((rep)=><option value={rep.id} key={rep.id}>{rep.name}</option>)}</select></label>
        <div className="territory-bulk-actions"><button className="button" disabled={!canBulk||!repId||bulkBusy||eligibleForBulk.length===0} onClick={assignVisible}>{bulkBusy?"Working…":`Assign ${eligibleForBulk.length.toLocaleString()} prospects`}</button><button className="button secondary" disabled={!canBulk||bulkBusy||eligibleForBulk.length===0} onClick={clearVisible}>Clear assignments</button></div>
      </div>
      {!canBulk && <div className="muted small">Bulk location assignment is available to organization owners, admins, and operations managers.</div>}
      {message && <div className="form-message">{message}</div>}
    </section>

    <section className="card territory-map-card">
      <div className="section-heading"><div><div className="eyebrow">Satellite Territory Map</div><h2>{visibleLocations.length.toLocaleString()} visible locations</h2></div><div className="territory-map-legend"><span className="prospect-dot">Prospect</span><span className="customer-dot">Customer</span><span className="dnk-dot">DNK</span><span className="business-dot">Business</span></div></div>
      <FieldMap locations={visibleLocations} routeIds={[]} selectedId={selectedId} onSelect={setSelectedId}/>
    </section>

    <div className="grid two-column section-block territory-detail-lower">
      <section className="card"><div className="eyebrow">Assigned Representatives</div><h2>Field team</h2>{territoryReps.length===0?<div className="empty-state">No representatives assigned.</div>:<div className="stack-list">{territoryReps.map((rep)=>{const load=prospectRows.filter((l)=>l.assignedRepId===rep.id).length;return <div key={rep.id} className="territory-rep-load"><div><strong>{rep.name}</strong><span className="muted small">{rep.email||"No email"}</span></div><span>{load.toLocaleString()} prospects</span></div>})}</div>}</section>
      <section className="card territory-status-breakdown"><div className="eyebrow">Footprint Breakdown</div><h2>Service status</h2><div className="status-breakdown-list"><div><span>Prospects</span><strong>{prospectRows.length.toLocaleString()}</strong></div><div><span>Current customers</span><strong>{customers.length.toLocaleString()}</strong></div><div><span>Do not knock</span><strong>{doNotKnock.length.toLocaleString()}</strong></div><div><span>Vacant</span><strong>{vacant.length.toLocaleString()}</strong></div><div><span>Business</span><strong>{business.length.toLocaleString()}</strong></div></div></section>
    </div>

    <section className="card table-card territory-location-table"><div className="section-heading"><div><div className="eyebrow">Filtered Locations</div><h2>Operational workload</h2></div><span className="muted small">Showing {visibleLocations.length.toLocaleString()}</span></div>{visibleLocations.length===0?<div className="empty-state">No locations match these filters.</div>:<div className="table-scroll"><table><thead><tr><th>Address</th><th>Service status</th><th>Rep</th><th>Disposition</th><th></th></tr></thead><tbody>{visibleLocations.slice(0,500).map((location)=><tr key={location.id}><td><strong>{location.address}</strong><div className="muted small">{location.city}, {location.state} {location.postalCode}</div></td><td><span className={`service-status-badge ${location.serviceStatus??"prospect"}`}>{(location.serviceStatus??"prospect").replaceAll("_"," ")}</span></td><td>{reps.find((r)=>r.id===location.assignedRepId)?.name??"Unassigned"}</td><td>{location.disposition}</td><td><Link className="text-link" href={`/locations/${location.id}`}>Open</Link></td></tr>)}</tbody></table>{visibleLocations.length>500&&<div className="table-limit-note">Showing the first 500 rows for performance. The map and metrics include all {visibleLocations.length.toLocaleString()} filtered locations.</div>}</div>}</section>
  </AppShell>;
}
