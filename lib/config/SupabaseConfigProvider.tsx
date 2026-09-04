"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode
} from "react";
import { createClient } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  usePlatformStore,
  type DemoMarket,
  type OrganizationSettings
} from "@/lib/store/platformStore";
import type {
  DemoDisposition, DemoLocation, DemoRep, DemoTeam, DemoTerritory
} from "@/lib/mock/data";

type ConfigContextValue = {
  loading: boolean;
  error: string | null;
  organization: OrganizationSettings | null;
  teams: DemoTeam[];
  markets: DemoMarket[];
  territories: DemoTerritory[];
  reps: DemoRep[];
  dispositions: DemoDisposition[];
  locations: DemoLocation[];
  refresh: () => Promise<void>;
  saveOrganization: (item: OrganizationSettings) => Promise<void>;
  saveTeam: (item: DemoTeam) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  saveMarket: (item: DemoMarket) => Promise<void>;
  deleteMarket: (id: string) => Promise<void>;
  saveTerritory: (item: DemoTerritory) => Promise<void>;
  deleteTerritory: (id: string) => Promise<void>;
  saveRep: (item: DemoRep) => Promise<void>;
  deleteRep: (id: string) => Promise<void>;
  saveDisposition: (item: DemoDisposition) => Promise<void>;
  deleteDisposition: (id: string) => Promise<void>;
  saveLocation: (item: DemoLocation) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  importLocations: (items: DemoLocation[]) => Promise<void>;
};

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function SupabaseConfigProvider({ children }: { children: ReactNode }) {
  const { organization: authOrganization } = useAuth();
  const { hydrateConfiguration } = usePlatformStore();
  const hydrateConfigurationRef = useRef(hydrateConfiguration);

  useEffect(() => {
    hydrateConfigurationRef.current = hydrateConfiguration;
  }, [hydrateConfiguration]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<OrganizationSettings | null>(null);
  const [teams, setTeams] = useState<DemoTeam[]>([]);
  const [markets, setMarkets] = useState<DemoMarket[]>([]);
  const [territories, setTerritories] = useState<DemoTerritory[]>([]);
  const [reps, setReps] = useState<DemoRep[]>([]);
  const [dispositions, setDispositions] = useState<DemoDisposition[]>([]);
  const [locations, setLocations] = useState<DemoLocation[]>([]);

  const orgId = authOrganization?.id;

  const refresh = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [
      orgRes, teamsRes, marketsRes, territoriesRes, repsRes, repTerritoriesRes,
      dispositionsRes, locationsRes
    ] = await Promise.all([
      supabase.from("organizations").select("id,name,slug,status,timezone").eq("id", orgId).single(),
      supabase.from("teams").select("id,name,team_type,is_active").eq("organization_id", orgId).order("name"),
      supabase.from("markets").select("id,name,slug,state_region,is_active").eq("organization_id", orgId).order("name"),
      supabase.from("territories").select("id,name,slug,market_id,team_id,is_active,settings").eq("organization_id", orgId).order("name"),
      supabase.from("representatives").select("id,full_name,email,team_id,status").eq("organization_id", orgId).order("full_name"),
      supabase.from("representative_territories").select("representative_id,territory_id").eq("organization_id", orgId),
      supabase.from("interaction_dispositions").select("id,name,code,is_active,is_terminal,requires_note,requires_follow_up,marks_contact,marks_sale,default_follow_up_days,settings").eq("organization_id", orgId).order("sort_order"),
      supabase.from("locations").select("id,external_location_id,address1,city,state_region,postal_code,territory_id,team_id,current_representative_id").eq("organization_id", orgId).order("address1"),
    ]);

    const firstError = [
      orgRes.error, teamsRes.error, marketsRes.error, territoriesRes.error,
      repsRes.error, repTerritoriesRes.error, dispositionsRes.error, locationsRes.error
    ].find(Boolean);

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const mappedOrganization: OrganizationSettings = {
      id: orgRes.data.id,
      name: orgRes.data.name,
      slug: orgRes.data.slug,
      timezone: orgRes.data.timezone,
      status: orgRes.data.status === "active" ? "active" : "inactive",
    };

    const mappedTeams: DemoTeam[] = (teamsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.team_type === "internal" ? "internal" : "vendor",
      reps: 0,
      status: row.is_active ? "active" : "inactive",
    }));

    const mappedMarkets: DemoMarket[] = (marketsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      stateRegion: row.state_region ?? "",
      status: row.is_active ? "active" : "inactive",
    }));

    const marketName = new Map(mappedMarkets.map((row) => [row.id, row.name]));
    const teamName = new Map(mappedTeams.map((row) => [row.id, row.name]));

    const mappedTerritories: DemoTerritory[] = (territoriesRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      market: row.market_id ? marketName.get(row.market_id) ?? "" : "",
      marketId: row.market_id ?? undefined,
      team: row.team_id ? teamName.get(row.team_id) ?? "Unassigned" : "Unassigned",
      teamId: row.team_id ?? "",
      locations: 0,
      status: row.is_active ? "active" : "inactive",
      description: (row.settings as any)?.description ?? "",
    }));

    const assignments = new Map<string, string[]>();
    for (const row of repTerritoriesRes.data ?? []) {
      const current = assignments.get(row.representative_id) ?? [];
      current.push(row.territory_id);
      assignments.set(row.representative_id, current);
    }

    const mappedReps: DemoRep[] = (repsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.full_name,
      email: row.email ?? "",
      team: row.team_id ? teamName.get(row.team_id) ?? "Unassigned" : "Unassigned",
      teamId: row.team_id ?? "",
      status: row.status === "active" ? "active" : "inactive",
      territoryIds: assignments.get(row.id) ?? [],
    }));

    const mappedDispositions: DemoDisposition[] = (dispositionsRes.data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: (row.settings as any)?.description ?? "",
      requiresNote: row.requires_note,
      requiresFollowUp: row.requires_follow_up,
      marksContact: row.marks_contact,
      marksSale: row.marks_sale,
      isTerminal: row.is_terminal,
      isActive: row.is_active,
      defaultFollowUpDays: row.default_follow_up_days ?? undefined,
    }));

    const territoryName = new Map(mappedTerritories.map((row) => [row.id, row.name]));
    const repName = new Map(mappedReps.map((row) => [row.id, row.name]));

    const mappedLocations: DemoLocation[] = (locationsRes.data ?? []).map((row) => ({
      id: row.id,
      externalId: row.external_location_id ?? "",
      address: row.address1,
      city: row.city ?? "",
      state: row.state_region ?? "",
      postalCode: row.postal_code ?? "",
      territory: row.territory_id ? territoryName.get(row.territory_id) ?? "Unassigned" : "Unassigned",
      territoryId: row.territory_id ?? "",
      team: row.team_id ? teamName.get(row.team_id) ?? "Unassigned" : "Unassigned",
      teamId: row.team_id ?? "",
      assignedRepId: row.current_representative_id ?? undefined,
      disposition: "Unvisited",
    }));

    const locationCounts = new Map<string, number>();
    for (const location of mappedLocations) {
      if (location.territoryId) {
        locationCounts.set(location.territoryId, (locationCounts.get(location.territoryId) ?? 0) + 1);
      }
    }
    for (const territory of mappedTerritories) {
      territory.locations = locationCounts.get(territory.id) ?? 0;
    }
    for (const team of mappedTeams) {
      team.reps = mappedReps.filter((rep) => rep.teamId === team.id).length;
    }

    setOrganization(mappedOrganization);
    setTeams(mappedTeams);
    setMarkets(mappedMarkets);
    setTerritories(mappedTerritories);
    setReps(mappedReps);
    setDispositions(mappedDispositions);
    setLocations(mappedLocations);

    hydrateConfigurationRef.current({
      organization: mappedOrganization,
      teams: mappedTeams,
      markets: mappedMarkets,
      territories: mappedTerritories,
      reps: mappedReps,
      dispositions: mappedDispositions,
      locations: mappedLocations,
    });

    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(action: () => Promise<{ error: any }>) {
    const result = await action();
    if (result.error) throw new Error(result.error.message);
    await refresh();
  }

  async function saveOrganization(item: OrganizationSettings) {
    if (!orgId) return;
    await run(async () => createClient().from("organizations").update({
      name: item.name,
      slug: item.slug,
      timezone: item.timezone,
      status: item.status === "active" ? "active" : "suspended",
    }).eq("id", orgId));
  }

  async function saveTeam(item: DemoTeam) {
    if (!orgId) return;
    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      name: item.name.trim(),
      slug: slugify(item.name),
      team_type: item.type === "internal" ? "internal" : "vendor",
      is_active: item.status === "active",
    };
    await run(async () => item.id
      ? supabase.from("teams").update(payload).eq("id", item.id)
      : supabase.from("teams").insert(payload));
  }

  async function deleteTeam(id: string) {
    await run(async () => createClient().from("teams").delete().eq("id", id));
  }

  async function saveMarket(item: DemoMarket) {
    if (!orgId) return;
    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      name: item.name.trim(),
      slug: item.slug.trim() || slugify(item.name),
      state_region: item.stateRegion || null,
      is_active: item.status === "active",
    };
    await run(async () => item.id
      ? supabase.from("markets").update(payload).eq("id", item.id)
      : supabase.from("markets").insert(payload));
  }

  async function deleteMarket(id: string) {
    await run(async () => createClient().from("markets").delete().eq("id", id));
  }

  async function saveTerritory(item: DemoTerritory) {
    if (!orgId) return;
    const market = markets.find((row) => row.name === item.market || row.id === (item as any).marketId);
    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      market_id: market?.id ?? null,
      team_id: item.teamId || null,
      name: item.name.trim(),
      slug: slugify(item.name),
      is_active: item.status === "active",
      settings: { description: item.description ?? "" },
    };
    await run(async () => item.id
      ? supabase.from("territories").update(payload).eq("id", item.id)
      : supabase.from("territories").insert(payload));
  }

  async function deleteTerritory(id: string) {
    await run(async () => createClient().from("territories").delete().eq("id", id));
  }

  async function saveRep(item: DemoRep) {
    if (!orgId) return;
    const supabase = createClient();
    let repId = item.id;

    const payload = {
      organization_id: orgId,
      full_name: item.name.trim(),
      email: item.email || null,
      team_id: item.teamId || null,
      status: item.status === "active" ? "active" : "inactive",
    };

    if (repId) {
      const { error } = await supabase.from("representatives").update(payload).eq("id", repId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase.from("representatives").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      repId = data.id;
    }

    const { error: deleteError } = await supabase
      .from("representative_territories")
      .delete()
      .eq("representative_id", repId);
    if (deleteError) throw new Error(deleteError.message);

    if (item.territoryIds.length) {
      const { error: assignmentError } = await supabase.from("representative_territories").insert(
        item.territoryIds.map((territoryId, index) => ({
          organization_id: orgId,
          representative_id: repId,
          territory_id: territoryId,
          is_primary: index === 0,
        }))
      );
      if (assignmentError) throw new Error(assignmentError.message);
    }

    await refresh();
  }

  async function deleteRep(id: string) {
    await run(async () => createClient().from("representatives").delete().eq("id", id));
  }

  async function saveDisposition(item: DemoDisposition) {
    if (!orgId) return;
    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      name: item.name.trim(),
      code: item.code.trim() || slugify(item.name).replaceAll("-", "_"),
      is_active: item.isActive !== false,
      is_terminal: item.isTerminal,
      requires_note: item.requiresNote,
      requires_follow_up: item.requiresFollowUp,
      marks_contact: item.marksContact,
      marks_sale: item.marksSale,
      default_follow_up_days: item.defaultFollowUpDays ?? null,
      settings: { description: item.description ?? "" },
    };
    await run(async () => item.id
      ? supabase.from("interaction_dispositions").update(payload).eq("id", item.id)
      : supabase.from("interaction_dispositions").insert(payload));
  }

  async function deleteDisposition(id: string) {
    await run(async () => createClient().from("interaction_dispositions").delete().eq("id", id));
  }

  async function saveLocation(item: DemoLocation) {
    if (!orgId) return;
    const territory = territories.find((row) => row.id === item.territoryId);
    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      external_location_id: item.externalId || null,
      address1: item.address.trim(),
      city: item.city || null,
      state_region: item.state || null,
      postal_code: item.postalCode || null,
      territory_id: item.territoryId || null,
      team_id: item.teamId || territory?.teamId || null,
      current_representative_id: item.assignedRepId || null,
    };
    await run(async () => item.id
      ? supabase.from("locations").update(payload).eq("id", item.id)
      : supabase.from("locations").insert(payload));
  }

  async function deleteLocation(id: string) {
    await run(async () => createClient().from("locations").delete().eq("id", id));
  }

  async function importLocations(items: DemoLocation[]) {
    if (!orgId || items.length === 0) return;
    const rows = items.map((item) => {
      const territory = territories.find((row) => row.id === item.territoryId);
      return {
        organization_id: orgId,
        external_location_id: item.externalId || null,
        address1: item.address,
        city: item.city || null,
        state_region: item.state || null,
        postal_code: item.postalCode || null,
        territory_id: item.territoryId || null,
        team_id: item.teamId || territory?.teamId || null,
        current_representative_id: item.assignedRepId || null,
      };
    });

    const { error } = await createClient().from("locations").insert(rows);
    if (error) throw new Error(error.message);
    await refresh();
  }

  const value = useMemo<ConfigContextValue>(() => ({
    loading, error, organization, teams, markets, territories, reps, dispositions, locations,
    refresh, saveOrganization, saveTeam, deleteTeam, saveMarket, deleteMarket,
    saveTerritory, deleteTerritory, saveRep, deleteRep, saveDisposition,
    deleteDisposition, saveLocation, deleteLocation, importLocations,
  }), [loading, error, organization, teams, markets, territories, reps, dispositions, locations, refresh]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useSupabaseConfig() {
  const value = useContext(ConfigContext);
  if (!value) throw new Error("useSupabaseConfig must be used within SupabaseConfigProvider.");
  return value;
}
