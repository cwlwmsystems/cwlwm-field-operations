"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig, useMockData } from "@/lib/supabase/env";

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  role: string;
  isActive: boolean;
};

export type ActiveOrganization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
};

type AuthContextValue = {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  membership: OrganizationMembership | null;
  organization: ActiveOrganization | null;
  membershipError: string | null;
  operationalDataMode: "mock" | "supabase";
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshOrganizationContext: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSupabaseConfig();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<OrganizationMembership | null>(null);
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);

  const loadOrganizationContext = useCallback(async (user: User | null) => {
    if (!configured || !user) {
      setMembership(null);
      setOrganization(null);
      setMembershipError(null);
      return;
    }

    const supabase = createClient();

    const { data: membershipRow, error: membershipQueryError } = await supabase
      .from("organization_memberships")
      .select("id, organization_id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipQueryError) {
      setMembership(null);
      setOrganization(null);
      setMembershipError(`Membership lookup failed: ${membershipQueryError.message}`);
      return;
    }

    if (!membershipRow) {
      setMembership(null);
      setOrganization(null);
      setMembershipError("This account does not have an active organization membership.");
      return;
    }

    const normalizedMembership: OrganizationMembership = {
      id: membershipRow.id,
      organizationId: membershipRow.organization_id,
      role: membershipRow.role,
      isActive: membershipRow.is_active,
    };
    setMembership(normalizedMembership);

    const { data: organizationRow, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name, slug, status, timezone")
      .eq("id", membershipRow.organization_id)
      .single();

    if (organizationError) {
      setOrganization(null);
      setMembershipError(`Organization lookup failed: ${organizationError.message}`);
      return;
    }

    setOrganization({
      id: organizationRow.id,
      name: organizationRow.name,
      slug: organizationRow.slug,
      status: organizationRow.status,
      timezone: organizationRow.timezone,
    });
    setMembershipError(null);
  }, [configured]);

  const refreshOrganizationContext = useCallback(async () => {
    await loadOrganizationContext(session?.user ?? null);
  }, [loadOrganizationContext, session?.user]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await loadOrganizationContext(data.session?.user ?? null);
      if (!cancelled) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      queueMicrotask(async () => {
        await loadOrganizationContext(nextSession?.user ?? null);
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [configured, loadOrganizationContext]);

  async function signIn(email: string, password: string) {
    if (!configured) return { error: "Supabase is not configured." };

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      return { error: error.message };
    }

    setSession(data.session);
    await loadOrganizationContext(data.user);
    setLoading(false);
    return {};
  }

  async function signOut() {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
    setMembership(null);
    setOrganization(null);
    setMembershipError(null);
  }

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    configured,
    session,
    user: session?.user ?? null,
    membership,
    organization,
    membershipError,
    operationalDataMode: useMockData() ? "mock" : "supabase",
    signIn,
    signOut,
    refreshOrganizationContext,
  }), [loading, configured, session, membership, organization, membershipError, refreshOrganizationContext]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
