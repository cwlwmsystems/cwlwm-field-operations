"use client";
import Link from "next/link";
import {AppShell} from "@/components/AppShell";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";
import {useSupabaseSales} from "@/lib/sales/SupabaseSalesProvider";
import {useSupabaseScheduling} from "@/lib/scheduling/SupabaseSchedulingProvider";
import {useSupabaseLifecycle} from "@/lib/lifecycle/SupabaseLifecycleProvider";
import {useSupabaseFinance} from "@/lib/finance/SupabaseFinanceProvider";

export default function Dashboard(){
  const config=useSupabaseConfig(),sales=useSupabaseSales(),sched=useSupabaseScheduling(),life=useSupabaseLifecycle(),fin=useSupabaseFinance();
  const installed=sales.orders.filter(o=>life.getCurrentStage(o.id)?.category==="installed").length;
  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Production Operations · Supabase</div><h1>{config.organization?.name??"Dashboard"}</h1><p className="muted">Live operational status across the active organization.</p></div><Link className="button secondary" href="/connection">System health</Link></div>
    <div className="grid metric-grid">
      <div className="card"><div className="eyebrow">Locations</div><div className="metric">{config.locations.length}</div></div>
      <div className="card"><div className="eyebrow">Representatives</div><div className="metric">{config.reps.filter(r=>r.status==="active").length}</div></div>
      <div className="card"><div className="eyebrow">Orders</div><div className="metric">{sales.orders.length}</div></div>
      <div className="card"><div className="eyebrow">Appointments</div><div className="metric">{sched.appointments.length}</div></div>
      <div className="card"><div className="eyebrow">Installed</div><div className="metric">{installed}</div></div>
      <div className="card"><div className="eyebrow">Invoices</div><div className="metric">{fin.batches.length}</div></div>
    </div>
  </AppShell>;
}
