"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { appConfig } from "@/lib/config/appConfig";
import { touchLivePresence } from "@/lib/presence/livePresence";
import {
  canAccessPath,
  fieldRoles,
  managerRoles,
  operationsAdminRoles,
  organizationAdminRoles,
  reportingRoles,
  roleLabel,
  type OrganizationRole,
} from "@/lib/auth/permissions";

type NavItem = {
  label: string;
  href: string;
  short: string;
  roles?: OrganizationRole[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Command Center", href: "/dashboard", short: "CC", roles: reportingRoles.concat(["representative"]) },
      { label: "Dispatch", href: "/dispatch", short: "DP", roles: managerRoles },
      { label: "Alerts", href: "/alerts", short: "AL", roles: managerRoles },
      { label: "Field Workspace", href: "/field", short: "FW", roles: fieldRoles },
      { label: "Locations", href: "/locations", short: "LO", roles: managerRoles },
      { label: "Territories", href: "/territories", short: "TE", roles: managerRoles },
      { label: "Representatives", href: "/representatives", short: "RE", roles: managerRoles },
    ],
  },
  {
    label: "Revenue Operations",
    items: [
      { label: "Sales", href: "/sales", short: "SA", roles: managerRoles },
      { label: "Scheduling", href: "/scheduling", short: "SC", roles: managerRoles },
      { label: "Lifecycle", href: "/lifecycle", short: "LC", roles: reportingRoles },
      { label: "Finance", href: "/finance", short: "FI", roles: operationsAdminRoles.concat(["analyst", "viewer"]) },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Reports", href: "/reports", short: "RP", roles: reportingRoles },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Setup", href: "/admin/setup", short: "SU", roles: operationsAdminRoles },
      { label: "Teams", href: "/teams", short: "TM", roles: operationsAdminRoles },
      { label: "Markets", href: "/markets", short: "MK", roles: operationsAdminRoles },
      { label: "Organizations", href: "/organizations", short: "OR", roles: organizationAdminRoles },
      { label: "Users", href: "/admin/users", short: "US", roles: organizationAdminRoles },
      { label: "Access Matrix", href: "/admin/access", short: "AC", roles: operationsAdminRoles },
      { label: "Security & Audit", href: "/admin/security", short: "SE", roles: operationsAdminRoles },
      { label: "Admin", href: "/admin", short: "AD", roles: operationsAdminRoles },
    ],
  },
];

function initials(value?: string | null) {
  if (!value) return "CF";
  return value
    .split(/[@.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CF";
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    configured,
    loading,
    user,
    organization,
    membership,
    membershipError,
    signOut,
  } = useAuth();

  useEffect(() => {
    if (!loading && configured && !user) router.replace("/login");
  }, [loading, configured, user, router]);

  useEffect(() => {
    if (!configured || !user || !organization?.id) return;

    let disposed = false;
    const heartbeat = () => {
      if (disposed) return;
      touchLivePresence({ organizationId: organization.id, pagePath: pathname }).catch(() => undefined);
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, 60000);
    const onFocus = () => heartbeat();
    const onVisibility = () => { if (document.visibilityState === "visible") heartbeat(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [configured, organization?.id, pathname, user]);

  if (configured && loading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="eyebrow">Cwlwm Field Operations</div>
          <h1>Loading workspace…</h1>
          <p className="muted">Checking your Supabase session and organization access.</p>
        </section>
      </main>
    );
  }

  if (configured && !user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Authentication required</h1>
          <p className="muted">Redirecting to sign in…</p>
        </section>
      </main>
    );
  }

  if (configured && user && !organization) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="eyebrow">Organization Access</div>
          <h1>Membership required</h1>
          <p className="muted">{membershipError ?? "No active organization could be loaded for this account."}</p>
          <div className="row-actions">
            <button className="button secondary" onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>
          </div>
        </section>
      </main>
    );
  }

  const role = membership?.role;
  const routeAllowed = canAccessPath(role, pathname);

  if (configured && user && organization && !routeAllowed) {
    return (
      <main className="auth-page">
        <section className="auth-card access-denied-card">
          <div className="eyebrow">Access Control</div>
          <h1>This area is not available for your role</h1>
          <p className="muted">
            Your {roleLabel(role).toLowerCase()} access does not include this page.
            Use the navigation available to your account or contact an organization administrator if your responsibilities have changed.
          </p>
          <div className="row-actions">
            <button className="button" onClick={() => router.replace(role === "representative" ? "/field" : "/dashboard")}>
              Return to workspace
            </button>
            <button className="button secondary" onClick={() => signOut().then(() => router.replace("/login"))}>
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role as OrganizationRole))),
    }))
    .filter((group) => group.items.length > 0);

  const mobileLinks = visibleGroups.flatMap((group) => group.items).slice(0, 6);

  return (
    <div className="shell shell-v11">
      <aside className="sidebar sidebar-v11">
        <div className="brand-lockup">
          <div className="brand-mark brand-mark-logo"><img src="/cwlwm-knot-logo.png" alt="Cwlwm Systems" /></div>
          <div>
            <div className="brand">{appConfig.name}</div>
            <div className="brand-subtitle">Field operations command center</div>
          </div>
        </div>

        <nav className="nav nav-v11" aria-label="Primary navigation">
          {visibleGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link className={active ? "active" : ""} key={item.href} href={item.href}>
                    <span className="nav-icon">{item.short}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-org-dot" />
          <div>
            <strong>{organization?.name ?? "Organization"}</strong>
            <span>{roleLabel(role)}</span>
          </div>
        </div>
      </aside>

      <div className="app-column">
        <header className="app-topbar app-topbar-v11">
          <div className="topbar-context">
            <span className="topbar-kicker">Active workspace</span>
            <strong>{organization?.name ?? "Organization"}</strong>
          </div>
          <div className="topbar-actions">
            {configured && <Link className="system-status" href="/connection"><span className="status-dot" />System healthy</Link>}
            <div className="user-chip">
              <span className="user-avatar">{initials(user?.email)}</span>
              <span className="user-meta"><strong>{user?.email ?? "Signed in"}</strong><small>{roleLabel(role)}</small></span>
            </div>
            {user && <button className="button-link" onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>}
          </div>
        </header>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {mobileLinks.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} className={active ? "active" : ""}>{item.label}</Link>;
          })}
        </nav>

        <main className="main main-v11">{children}</main>
      </div>
    </div>
  );
}
