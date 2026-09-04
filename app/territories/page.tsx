import { AppShell } from "@/components/AppShell";
import { demoOrganization, demoTeams, demoTerritories, demoReps, demoLocations } from "@/lib/mock/data";
export default function Page(){
 const title = "Territories";
 const rows:any[] = title === "Teams" ? demoTeams : title === "Territories" ? demoTerritories : title === "Representatives" ? demoReps : title === "Locations" ? demoLocations : title === "Organizations" ? [demoOrganization] : [{name:"Central Market", status:"active"}];
 return <AppShell><div className="eyebrow">Foundation module</div><h1>{title}</h1><div className="card"><table><thead><tr><th>Name / Record</th><th>Details</th></tr></thead><tbody>{rows.map((row:any,i:number)=><tr key={row.id ?? i}><td>{row.name ?? row.address}</td><td><span className="badge">{row.status ?? row.type ?? row.territory ?? row.market ?? row.slug ?? "demo"}</span></td></tr>)}</tbody></table></div></AppShell>
}
