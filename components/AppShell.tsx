import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  ["Dashboard", "/dashboard"], ["Organizations", "/organizations"],
  ["Teams", "/teams"], ["Markets", "/markets"], ["Territories", "/territories"],
  ["Representatives", "/representatives"], ["Locations", "/locations"], ["Sales", "/sales"], ["Scheduling", "/scheduling"], ["Lifecycle", "/lifecycle"], ["Finance", "/finance"], ["Admin", "/admin"]
];

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="shell">
    <aside className="sidebar"><div className="brand">Cwlwm Field Operations</div><nav className="nav">
      {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
    </nav></aside>
    <main className="main">{children}</main>
  </div>;
}
