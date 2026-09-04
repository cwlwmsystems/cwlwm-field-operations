import { AppShell } from "@/components/AppShell";
import { demoLocations, demoOrganization, demoReps, demoTeams, demoTerritories } from "@/lib/mock/data";
export default function Dashboard(){ return <AppShell><div className="eyebrow">Mock-data development mode</div><h1>{demoOrganization.name}</h1><p className="muted">Foundation v0.2 runs without a live Supabase project.</p><div className="grid">
  <div className="card"><h2>Teams</h2><div className="metric">{demoTeams.length}</div></div>
  <div className="card"><h2>Territories</h2><div className="metric">{demoTerritories.length}</div></div>
  <div className="card"><h2>Representatives</h2><div className="metric">{demoReps.length}</div></div>
  <div className="card"><h2>Demo Locations</h2><div className="metric">{demoLocations.length}</div></div>
</div></AppShell> }
