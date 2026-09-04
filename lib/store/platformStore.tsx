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

export type DemoProduct = {
  id: string;
  code: string;
  name: string;
  category: string;
  serviceLevel: string;
  basePrice: number;
  isActive: boolean;
};

export type DemoOffer = {
  id: string;
  code: string;
  name: string;
  productId: string;
  badge: string;
  disclosure: string;
  isActive: boolean;
  phases: { label: string; months: string; price: number }[];
};

export type DemoSalesAttempt = {
  id: string;
  clientAttemptId: string;
  locationId: string;
  representativeId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  productId?: string;
  offerId?: string;
  installDate?: string;
  installTime?: string;
  progressStep: number;
  progressStage: string;
  status: "in_progress" | "abandoned" | "converted";
  startedAt: string;
  updatedAt: string;
  convertedAt?: string;
};

export type DemoOrder = {
  id: string;
  clientSubmissionId: string;
  locationId: string;
  representativeId: string;
  salesAttemptId?: string;
  customerName: string;
  phone: string;
  email: string;
  productId: string;
  offerId: string;
  productNameSnapshot: string;
  offerNameSnapshot: string;
  pricingSnapshot: { phases: { label: string; months: string; price: number }[] };
  installDate: string;
  installTime: string;
  notes: string;
  orderStatus: "submitted" | "accepted" | "cancelled";
  reviewStatus: "pending" | "approved" | "needs_attention";
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformData = {
  organization: OrganizationSettings;
  teams: DemoTeam[];
  markets: DemoMarket[];
  territories: DemoTerritory[];
  reps: DemoRep[];
  locations: DemoLocation[];
  dispositions: DemoDisposition[];
  products: DemoProduct[];
  offers: DemoOffer[];
  salesAttempts: DemoSalesAttempt[];
  orders: DemoOrder[];
};

const STORAGE_KEY = "cwlwm-platform-data:v0.5";
const LEGACY_STORAGE_KEY = "cwlwm-platform-data:v0.4";

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
  products: [
    { id: "prod_100", code: "service_100", name: "Essential Service", category: "Residential", serviceLevel: "100", basePrice: 49.95, isActive: true },
    { id: "prod_500", code: "service_500", name: "Performance Service", category: "Residential", serviceLevel: "500", basePrice: 69.95, isActive: true },
    { id: "prod_1000", code: "service_1000", name: "Premium Service", category: "Residential", serviceLevel: "1000", basePrice: 89.95, isActive: true },
  ],
  offers: [
    {
      id: "offer_intro",
      code: "intro_3_month",
      name: "Introductory Offer",
      productId: "prod_1000",
      badge: "Featured",
      disclosure: "Demo promotional terms only. Client-specific pricing will be configured per organization.",
      isActive: true,
      phases: [
        { label: "Intro Period", months: "1-3", price: 0 },
        { label: "Promotional Period", months: "4-24", price: 54.95 },
        { label: "Standard Period", months: "25+", price: 95.95 },
      ],
    },
    {
      id: "offer_standard_500",
      code: "standard_500",
      name: "Standard Performance Offer",
      productId: "prod_500",
      badge: "Standard",
      disclosure: "Demo standard pricing. Taxes, fees, and equipment can be configured by organization.",
      isActive: true,
      phases: [{ label: "Standard", months: "Ongoing", price: 69.95 }],
    },
  ],
  salesAttempts: [],
  orders: [],
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
  saveProduct: (item: DemoProduct) => void;
  saveOffer: (item: DemoOffer) => void;
  saveSalesAttempt: (item: DemoSalesAttempt) => void;
  submitOrder: (order: DemoOrder) => DemoOrder;
  updateOrder: (id: string, patch: Partial<DemoOrder>) => void;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(rows: T[], item: T) {
  const index = rows.findIndex((row) => row.id === item.id);
  if (index === -1) return [...rows, item];
  return rows.map((row) => row.id === item.id ? item : row);
}

function migrateLegacy(raw: string): PlatformData {
  const legacy = JSON.parse(raw);
  return {
    ...seed,
    ...legacy,
    products: legacy.products ?? seed.products,
    offers: legacy.offers ?? seed.offers,
    salesAttempts: legacy.salesAttempts ?? [],
    orders: legacy.orders ?? [],
  };
}

export function PlatformStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PlatformData>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(migrateLegacy(raw));
      } else {
        const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) setData(migrateLegacy(legacy));
      }
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
    saveProduct: (item) => setData((current) => ({ ...current, products: upsert(current.products, item) })),
    saveOffer: (item) => setData((current) => ({ ...current, offers: upsert(current.offers, item) })),
    saveSalesAttempt: (item) => setData((current) => ({ ...current, salesAttempts: upsert(current.salesAttempts, item) })),
    submitOrder: (order) => {
      const existing = data.orders.find((row) => row.clientSubmissionId === order.clientSubmissionId);
      if (existing) return existing;
      setData((current) => {
        const duplicate = current.orders.find((row) => row.clientSubmissionId === order.clientSubmissionId);
        if (duplicate) return current;
        const attempts = order.salesAttemptId
          ? current.salesAttempts.map((attempt) => attempt.id === order.salesAttemptId
              ? { ...attempt, status: "converted" as const, convertedAt: order.createdAt, updatedAt: order.createdAt }
              : attempt)
          : current.salesAttempts;
        const locations = current.locations.map((location) => location.id === order.locationId
          ? { ...location, disposition: "Sale" }
          : location);
        return { ...current, orders: [...current.orders, order], salesAttempts: attempts, locations };
      });
      return order;
    },
    updateOrder: (id, patch) => setData((current) => ({ ...current, orders: current.orders.map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row) })),
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
