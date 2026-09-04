import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { demoTerritories } from "@/lib/mock/data";

export default function TerritoriesPage() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Territory Operations</div>
          <h1>Territories</h1>
          <p className="muted">Open a territory to view assigned representatives and field locations.</p>
        </div>
        <span className="badge">Mock data</span>
      </div>

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Territory</th>
              <th>Market</th>
              <th>Team</th>
              <th>Locations</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {demoTerritories.map((territory) => (
              <tr key={territory.id}>
                <td>
                  <Link className="table-link" href={`/territories/${territory.id}`}>
                    {territory.name}
                  </Link>
                </td>
                <td>{territory.market}</td>
                <td>{territory.team}</td>
                <td>{territory.locations.toLocaleString()}</td>
                <td><span className="badge success">{territory.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
