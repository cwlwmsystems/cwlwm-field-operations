"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function AdminPage() {
  const { data, resetDemo } = usePlatformStore();
  const cards = [
    ["Teams", data.teams.length, "/admin/teams"],
    ["Markets", data.markets.length, "/admin/markets"],
    ["Territories", data.territories.length, "/admin/territories"],
    ["Representatives", data.reps.length, "/admin/representatives"],
    ["Dispositions", data.dispositions.length, "/admin/dispositions"],
    ["Locations", data.locations.length, "/admin/locations"],
  ] as const;
  return <AppShell>
    <div className="eyebrow">Administration</div><h1>Configuration</h1>
    <p className="muted">Manage the generic platform in local mock mode. Changes are stored in this browser until Supabase is connected.</p>
    <AdminNav />
    <div className="grid admin-metric-grid">{cards.map(([label, count, href]) => <Link href={href} className="card admin-stat" key={label}><div className="eyebrow">{label}</div><div className="metric">{count}</div><span className="text-link">Manage →</span></Link>)}</div>
    <div className="card danger-zone"><div><div className="eyebrow">Development utility</div><h2>Reset synthetic data</h2><p className="muted">Restores the v0.4 demo organization, teams, territories, reps, locations and dispositions.</p></div><button className="button secondary" onClick={() => { if (confirm("Reset all v0.4 local configuration to demo defaults?")) resetDemo(); }}>Reset Demo Data</button></div>
  </AppShell>;
}
