"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { appConfig } from "@/lib/config/appConfig";

const links = [
  ["Dashboard", "/dashboard"], ["Organizations", "/organizations"],
  ["Teams", "/teams"], ["Markets", "/markets"], ["Territories", "/territories"],
  ["Representatives", "/representatives"], ["Locations", "/locations"], ["Sales", "/sales"],
  ["Scheduling", "/scheduling"], ["Lifecycle", "/lifecycle"], ["Finance", "/finance"],
  ["Reports", "/reports"], ["Admin", "/admin"]
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    configured, loading, user, organization, membership, membershipError,
    operationalDataMode, signOut
  } = useAuth();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/login");
    }
  }, [loading, configured, user, router]);

  if (configured && loading) {
    return <main className="auth-page"><section className="auth-card"><h1>Loading session…</h1><p className="muted">Checking Supabase authentication.</p></section></main>;
  }

  if (configured && !user) {
    return <main className="auth-page"><section className="auth-card"><h1>Authentication required</h1><p className="muted">Redirecting to sign in…</p></section></main>;
  }

  if (configured && user && !organization) {
    return <main className="auth-page">
      <section className="auth-card">
        <div className="eyebrow">Organization Access</div>
        <h1>Membership required</h1>
        <p className="muted">{membershipError ?? "No active organization could be loaded for this account."}</p>
        <div className="row-actions">
          <button className="button secondary" onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>
        </div>
      </section>
    </main>;
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand">{appConfig.name}</div>
      <nav className="nav">
        {links.map(([label, href]) =>
          <Link className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""} key={href} href={href}>{label}</Link>
        )}
      </nav>
    </aside>

    <div className="app-column">
      <header className="app-topbar">
        <div>
          <strong>{organization?.name ?? "Organization"}</strong>
          <span className="muted small">
            {membership?.role?.replaceAll("_", " ") ?? "member"} · Supabase data
          </span>
        </div>
        <div className="topbar-actions">
          {configured && <Link className="text-link" href="/connection">Connection</Link>}
          {user && <span className="muted small">{user.email}</span>}
          {user && <button className="button-link" onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  </div>;
}
