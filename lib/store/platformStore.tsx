"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  demoDispositions,
  demoLocations,
  demoOrganization,
  demoReps,
  demoTeams,
  demoTerritories,
  type DemoDisposition,
  type DemoLocation,
  type DemoRep,
  type DemoTeam,
  type DemoTerritory,
} from "@/lib/mock/data";

export type DemoMarket = {
  id: string;
  name: string;
  slug: string;
  stateRegion: string;
  status: "active" | "inactive";
};

export type OrganizationSettings = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: "active" | "inactive";
};

export type PlatformData = {
  organization: OrganizationSettings;
  teams: DemoTeam[];
  markets: DemoMarket[];
  territories: DemoTerritory[];
  reps: DemoRep[];
  locations: DemoLocation[];
  dispositions: DemoDisposition[];
};

const STORAGE_KEY = "cwlwm-platform-data:v0.4";

const seed: PlatformData = {
  organization: {
    ...demoOrganization,
    timezone: "America/New_York",
    status: "active",
  },
  teams: demoTeams,
  markets: [
    { id: "market_central", name: "Central Market", slug: "central-market", stateRegion: "PA", status: "active" },
  ],
  territories: demoTerritories,
  reps: demoReps,
  locations: demoLocations,
  dispositions: demoDispositions,
};

type Store = {
  data: PlatformData;
  hydrated: boolean;
  updateOrganization: (patch: Partial<OrganizationSettings>) => void;
  saveTeam: (item: DemoTeam) => void;
  deleteTeam: (id: string) => void;
  saveMarket: (item: DemoMarket) => void;
  deleteMarket: (id: string) => void;
  saveTerritory: (item: DemoTerritory) => void;
  deleteTerritory: (id: string) => void;
  saveRep: (item: DemoRep) => void;
  deleteRep: (id: string) => void;
  saveDisposition: (item: DemoDisposition) => void;
  deleteDisposition: (id: string) => void;
  saveLocation: (item: DemoLocation) => void;
  deleteLocation: (id: string) => void;
  importLocations: (items: DemoLocation[]) => void;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(rows: T[], item: T) {
  const index = rows.findIndex((row) => row.id === item.id);
  if (index === -1) return [...rows, item];
  return rows.map((row) => row.id === item.id ? item : row);
}

export function PlatformStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PlatformData>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  const value = useMemo<Store>(() => ({
    data,
    hydrated,
    updateOrganization: (patch) => setData((current) => ({ ...current, organization: { ...current.organization, ...patch } })),
    saveTeam: (item) => setData((current) => ({ ...current, teams: upsert(current.teams, item) })),
    deleteTeam: (id) => setData((current) => ({ ...current, teams: current.teams.filter((row) => row.id !== id) })),
    saveMarket: (item) => setData((current) => ({ ...current, markets: upsert(current.markets, item) })),
    deleteMarket: (id) => setData((current) => ({ ...current, markets: current.markets.filter((row) => row.id !== id) })),
    saveTerritory: (item) => setData((current) => ({ ...current, territories: upsert(current.territories, item) })),
    deleteTerritory: (id) => setData((current) => ({ ...current, territories: current.territories.filter((row) => row.id !== id) })),
    saveRep: (item) => setData((current) => ({ ...current, reps: upsert(current.reps, item) })),
    deleteRep: (id) => setData((current) => ({ ...current, reps: current.reps.filter((row) => row.id !== id) })),
    saveDisposition: (item) => setData((current) => ({ ...current, dispositions: upsert(current.dispositions, item) })),
    deleteDisposition: (id) => setData((current) => ({ ...current, dispositions: current.dispositions.filter((row) => row.id !== id) })),
    saveLocation: (item) => setData((current) => ({ ...current, locations: upsert(current.locations, item) })),
    deleteLocation: (id) => setData((current) => ({ ...current, locations: current.locations.filter((row) => row.id !== id) })),
    importLocations: (items) => setData((current) => ({ ...current, locations: [...current.locations, ...items] })),
    resetDemo: () => setData(seed),
  }), [data, hydrated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatformStore() {
  const value = useContext(Ctx);
  if (!value) throw new Error("usePlatformStore must be used inside PlatformStoreProvider");
  return value;
}

export function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
