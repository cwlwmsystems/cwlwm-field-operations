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
  appointmentSlotKey?: string;
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
  appointmentId?: string;
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

export type DemoSchedulingPolicy = {
  id: string;
  name: string;
  territoryId: string;
  teamId?: string;
  allowedWeekdays: number[];
  times: string[];
  defaultCapacity: number;
  minimumLeadHours: number;
  isActive: boolean;
};

export type DemoSchedulingOverride = {
  id: string;
  territoryId: string;
  date: string;
  time?: string;
  capacity?: number;
  isBlackout: boolean;
  note?: string;
};

export type DemoAppointment = {
  id: string;
  clientSubmissionId: string;
  orderId?: string;
  locationId: string;
  representativeId: string;
  territoryId: string;
  teamId: string;
  date: string;
  time: string;
  status: "booked" | "confirmed" | "rescheduled" | "completed" | "cancelled" | "no_show";
  customerName: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};



export type DemoInvoiceSettings = {
  prefix: string;
  nextNumber: number;
  padding: number;
  includeYear: boolean;
  defaultCurrency: string;
};

export type DemoInvoiceBatch = {
  id: string;
  invoiceNumber: string;
  teamId?: string;
  status: "draft" | "finalized" | "exported" | "void";
  orderIds: string[];
  subtotal: number;
  adjustmentsTotal: number;
  total: number;
  createdAt: string;
  finalizedAt?: string;
  exportedAt?: string;
  notes?: string;
};

export type DemoAdjustment = {
  id: string;
  orderId: string;
  invoiceBatchId?: string;
  adjustmentType: "clawback" | "credit" | "debit" | "void" | "other";
  reason: string;
  amount: number;
  status: "open" | "applied" | "reversed";
  createdAt: string;
  appliedAt?: string;
  notes?: string;
};

export type DemoIntegration = {
  id: string;
  name: string;
  integrationType: "crm" | "order_system" | "billing" | "data_warehouse" | "webhook" | "other";
  status: "active" | "inactive" | "error";
  externalSystemLabel: string;
  notes?: string;
};

export type DemoLifecycleStage = {
  id: string;
  code: string;
  name: string;
  category: "submitted" | "accepted" | "scheduled" | "installed" | "activated" | "cancelled" | "exception" | "closed" | "other";
  sortOrder: number;
  isTerminal: boolean;
  isActive: boolean;
};

export type DemoLifecycleMapping = {
  id: string;
  integrationId: string;
  externalStatus: string;
  lifecycleStageId: string;
  isActive: boolean;
};

export type DemoExternalRecord = {
  id: string;
  integrationId: string;
  entityType: "order";
  internalEntityId: string;
  externalId: string;
  externalStatus?: string;
  lastSyncedAt?: string;
};

export type DemoLifecycleEvent = {
  id: string;
  orderId: string;
  integrationId?: string;
  lifecycleStageId: string;
  externalStatus?: string;
  externalEventId?: string;
  source: "manual" | "integration" | "system";
  detail?: string;
  occurredAt: string;
  createdAt: string;
};

export type DemoLifecycleException = {
  id: string;
  orderId: string;
  integrationId?: string;
  exceptionType: "unmapped_status" | "missing_external_id" | "invalid_transition" | "sync_error" | "manual_review";
  message: string;
  externalStatus?: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
};

export type SlotAvailability = {
  key: string;
  territoryId: string;
  date: string;
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
  blackout: boolean;
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
  schedulingPolicies: DemoSchedulingPolicy[];
  schedulingOverrides: DemoSchedulingOverride[];
  appointments: DemoAppointment[];
  integrations: DemoIntegration[];
  lifecycleStages: DemoLifecycleStage[];
  lifecycleMappings: DemoLifecycleMapping[];
  externalRecords: DemoExternalRecord[];
  lifecycleEvents: DemoLifecycleEvent[];
  lifecycleExceptions: DemoLifecycleException[];
  invoiceSettings: DemoInvoiceSettings;
  invoiceBatches: DemoInvoiceBatch[];
  adjustments: DemoAdjustment[];
};

const STORAGE_KEY = "cwlwm-platform-data:v0.8";
const LEGACY_STORAGE_KEYS = ["cwlwm-platform-data:v0.7", "cwlwm-platform-data:v0.6", "cwlwm-platform-data:v0.5", "cwlwm-platform-data:v0.4"];

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
  schedulingPolicies: [
    {
      id: "sched_north",
      name: "North District Weekday Schedule",
      territoryId: "terr_north",
      teamId: "team_internal",
      allowedWeekdays: [1, 2, 3, 4, 5],
      times: ["8:00 AM", "10:00 AM", "1:00 PM", "3:00 PM"],
      defaultCapacity: 2,
      minimumLeadHours: 12,
      isActive: true,
    },
    {
      id: "sched_south",
      name: "South District Weekday Schedule",
      territoryId: "terr_south",
      teamId: "team_vendor",
      allowedWeekdays: [1, 2, 3, 4, 5],
      times: ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"],
      defaultCapacity: 1,
      minimumLeadHours: 12,
      isActive: true,
    },
  ],
  schedulingOverrides: [],
  appointments: [],

  integrations: [
    {
      id: "int_demo_crm",
      name: "Demo CRM",
      integrationType: "crm",
      status: "inactive",
      externalSystemLabel: "Demo CRM",
      notes: "Synthetic integration record for local lifecycle testing.",
    },
  ],
  lifecycleStages: [
    { id: "stage_submitted", code: "submitted", name: "Submitted", category: "submitted", sortOrder: 10, isTerminal: false, isActive: true },
    { id: "stage_accepted", code: "accepted", name: "Accepted", category: "accepted", sortOrder: 20, isTerminal: false, isActive: true },
    { id: "stage_scheduled", code: "scheduled", name: "Scheduled", category: "scheduled", sortOrder: 30, isTerminal: false, isActive: true },
    { id: "stage_installed", code: "installed", name: "Installed", category: "installed", sortOrder: 40, isTerminal: false, isActive: true },
    { id: "stage_activated", code: "activated", name: "Activated", category: "activated", sortOrder: 50, isTerminal: true, isActive: true },
    { id: "stage_cancelled", code: "cancelled", name: "Cancelled", category: "cancelled", sortOrder: 90, isTerminal: true, isActive: true },
    { id: "stage_exception", code: "exception", name: "Exception", category: "exception", sortOrder: 95, isTerminal: false, isActive: true },
  ],
  lifecycleMappings: [
    { id: "map_demo_accepted", integrationId: "int_demo_crm", externalStatus: "ACCEPTED", lifecycleStageId: "stage_accepted", isActive: true },
    { id: "map_demo_scheduled", integrationId: "int_demo_crm", externalStatus: "SCHEDULED", lifecycleStageId: "stage_scheduled", isActive: true },
    { id: "map_demo_installed", integrationId: "int_demo_crm", externalStatus: "INSTALLED", lifecycleStageId: "stage_installed", isActive: true },
    { id: "map_demo_active", integrationId: "int_demo_crm", externalStatus: "ACTIVE", lifecycleStageId: "stage_activated", isActive: true },
    { id: "map_demo_cancelled", integrationId: "int_demo_crm", externalStatus: "CANCELLED", lifecycleStageId: "stage_cancelled", isActive: true },
  ],
  externalRecords: [],
  lifecycleEvents: [],
  lifecycleExceptions: [],

  invoiceSettings: {
    prefix: "INV",
    nextNumber: 1,
    padding: 4,
    includeYear: true,
    defaultCurrency: "USD",
  },
  invoiceBatches: [],
  adjustments: [],
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
  saveSchedulingPolicy: (item: DemoSchedulingPolicy) => void;
  deleteSchedulingPolicy: (id: string) => void;
  saveSchedulingOverride: (item: DemoSchedulingOverride) => void;
  deleteSchedulingOverride: (id: string) => void;
  getAvailability: (territoryId: string, date: string) => SlotAvailability[];
  bookAppointment: (item: DemoAppointment) => DemoAppointment;
  updateAppointment: (id: string, patch: Partial<DemoAppointment>) => void;
  rescheduleAppointment: (id: string, date: string, time: string) => void;
  cancelAppointment: (id: string) => void;
  saveIntegration: (item: DemoIntegration) => void;
  deleteIntegration: (id: string) => void;
  saveLifecycleStage: (item: DemoLifecycleStage) => void;
  deleteLifecycleStage: (id: string) => void;
  saveLifecycleMapping: (item: DemoLifecycleMapping) => void;
  deleteLifecycleMapping: (id: string) => void;
  linkExternalRecord: (item: DemoExternalRecord) => void;
  addLifecycleEvent: (item: DemoLifecycleEvent) => void;
  ingestExternalStatus: (input: { orderId: string; integrationId: string; externalId?: string; externalStatus: string; externalEventId?: string; detail?: string }) => { event?: DemoLifecycleEvent; exception?: DemoLifecycleException };
  resolveLifecycleException: (id: string, status?: "resolved" | "dismissed") => void;
  getCurrentLifecycleStage: (orderId: string) => DemoLifecycleStage | undefined;
  saveInvoiceSettings: (settings: DemoInvoiceSettings) => void;
  createInvoiceBatch: (input: { orderIds: string[]; teamId?: string; notes?: string }) => DemoInvoiceBatch | undefined;
  finalizeInvoiceBatch: (id: string) => void;
  markInvoiceExported: (id: string) => void;
  voidInvoiceBatch: (id: string) => void;
  saveAdjustment: (item: DemoAdjustment) => void;
  applyAdjustment: (id: string) => void;
  reverseAdjustment: (id: string) => void;
  getOrderInvoiceBatch: (orderId: string) => DemoInvoiceBatch | undefined;
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
  const orders: DemoOrder[] = legacy.orders ?? [];
  const stages: DemoLifecycleStage[] = legacy.lifecycleStages ?? seed.lifecycleStages;
  const submittedStage = stages.find((stage) => stage.code === "submitted");
  const existingEvents: DemoLifecycleEvent[] = legacy.lifecycleEvents ?? [];
  const lifecycleEvents = submittedStage
    ? [
        ...existingEvents,
        ...orders
          .filter((order) => !existingEvents.some((event) => event.orderId === order.id))
          .map((order) => ({
            id: `life_migrated_${order.id}`,
            orderId: order.id,
            lifecycleStageId: submittedStage.id,
            source: "system" as const,
            detail: "Lifecycle initialized during v0.7 local-data upgrade.",
            occurredAt: order.createdAt,
            createdAt: order.createdAt,
          })),
      ]
    : existingEvents;

  return {
    ...seed,
    ...legacy,
    products: legacy.products ?? seed.products,
    offers: legacy.offers ?? seed.offers,
    salesAttempts: legacy.salesAttempts ?? [],
    orders,
    schedulingPolicies: legacy.schedulingPolicies ?? seed.schedulingPolicies,
    schedulingOverrides: legacy.schedulingOverrides ?? [],
    appointments: legacy.appointments ?? [],
    integrations: legacy.integrations ?? seed.integrations,
    lifecycleStages: stages,
    lifecycleMappings: legacy.lifecycleMappings ?? seed.lifecycleMappings,
    externalRecords: legacy.externalRecords ?? [],
    lifecycleEvents,
    lifecycleExceptions: legacy.lifecycleExceptions ?? [],
    invoiceSettings: legacy.invoiceSettings ?? seed.invoiceSettings,
    invoiceBatches: legacy.invoiceBatches ?? [],
    adjustments: legacy.adjustments ?? [],
  };
}

function timeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (hour === 12) hour = 0;
  if (meridiem === "PM") hour += 12;
  return hour * 60 + minute;
}

function localSlotDate(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const minutes = timeToMinutes(time);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function calculateAvailability(data: PlatformData, territoryId: string, date: string, ignoreAppointmentId?: string): SlotAvailability[] {
  if (!territoryId || !date) return [];
  const policy = data.schedulingPolicies.find((row) => row.territoryId === territoryId && row.isActive);
  if (!policy) return [];
  const weekday = new Date(`${date}T12:00:00`).getDay();
  if (!policy.allowedWeekdays.includes(weekday)) return [];

  const now = new Date();
  return policy.times.map((time) => {
    const matchingOverrides = data.schedulingOverrides.filter((row) => row.territoryId === territoryId && row.date === date && (!row.time || row.time === time));
    const blackout = matchingOverrides.some((row) => row.isBlackout);
    const capacityOverride = [...matchingOverrides].reverse().find((row) => typeof row.capacity === "number")?.capacity;
    const capacity = Math.max(0, capacityOverride ?? policy.defaultCapacity);
    const booked = data.appointments.filter((row) => row.id !== ignoreAppointmentId && row.territoryId === territoryId && row.date === date && row.time === time && !["cancelled", "rescheduled"].includes(row.status)).length;
    const leadMs = policy.minimumLeadHours * 60 * 60 * 1000;
    const leadSatisfied = localSlotDate(date, time).getTime() >= now.getTime() + leadMs;
    const remaining = Math.max(0, capacity - booked);
    return {
      key: `${territoryId}|${date}|${time}`,
      territoryId,
      date,
      time,
      capacity,
      booked,
      remaining,
      blackout,
      available: !blackout && leadSatisfied && remaining > 0,
    };
  });
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
        const legacy = LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
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
        const appointments = order.appointmentId
          ? current.appointments.map((appointment) => appointment.id === order.appointmentId ? { ...appointment, orderId: order.id, updatedAt: order.createdAt } : appointment)
          : current.appointments;
        const submittedStage = current.lifecycleStages.find((stage) => stage.code === "submitted");
        const alreadyHasSubmitted = current.lifecycleEvents.some((event) => event.orderId === order.id && event.lifecycleStageId === submittedStage?.id);
        const lifecycleEvents = submittedStage && !alreadyHasSubmitted
          ? [...current.lifecycleEvents, {
              id: makeId("life"),
              orderId: order.id,
              lifecycleStageId: submittedStage.id,
              source: "system" as const,
              detail: "Order created in Cwlwm Field Operations.",
              occurredAt: order.createdAt,
              createdAt: order.createdAt,
            }]
          : current.lifecycleEvents;
        return { ...current, orders: [...current.orders, order], salesAttempts: attempts, locations, appointments, lifecycleEvents };
      });
      return order;
    },
    updateOrder: (id, patch) => setData((current) => ({ ...current, orders: current.orders.map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row) })),
    saveSchedulingPolicy: (item) => setData((current) => ({ ...current, schedulingPolicies: upsert(current.schedulingPolicies, item) })),
    deleteSchedulingPolicy: (id) => setData((current) => ({ ...current, schedulingPolicies: current.schedulingPolicies.filter((row) => row.id !== id) })),
    saveSchedulingOverride: (item) => setData((current) => ({ ...current, schedulingOverrides: upsert(current.schedulingOverrides, item) })),
    deleteSchedulingOverride: (id) => setData((current) => ({ ...current, schedulingOverrides: current.schedulingOverrides.filter((row) => row.id !== id) })),
    getAvailability: (territoryId, date) => calculateAvailability(data, territoryId, date),
    bookAppointment: (item) => {
      const existing = data.appointments.find((row) => row.clientSubmissionId === item.clientSubmissionId);
      if (existing) return existing;
      const slot = calculateAvailability(data, item.territoryId, item.date).find((row) => row.time === item.time);
      if (!slot || !slot.available) throw new Error("That appointment slot is no longer available. Choose another time.");
      setData((current) => {
        const duplicate = current.appointments.find((row) => row.clientSubmissionId === item.clientSubmissionId);
        if (duplicate) return current;
        const currentSlot = calculateAvailability(current, item.territoryId, item.date).find((row) => row.time === item.time);
        if (!currentSlot || !currentSlot.available) return current;
        return { ...current, appointments: [...current.appointments, item] };
      });
      return item;
    },
    updateAppointment: (id, patch) => setData((current) => ({ ...current, appointments: current.appointments.map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row) })),
    rescheduleAppointment: (id, date, time) => {
      const appointment = data.appointments.find((row) => row.id === id);
      if (!appointment) throw new Error("Appointment not found.");
      const slot = calculateAvailability(data, appointment.territoryId, date, id).find((row) => row.time === time);
      if (!slot || !slot.available) throw new Error("That appointment slot is not available.");
      setData((current) => ({
        ...current,
        appointments: current.appointments.map((row) => row.id === id ? { ...row, date, time, status: "booked" as const, updatedAt: new Date().toISOString() } : row),
        orders: current.orders.map((row) => row.appointmentId === id ? { ...row, installDate: date, installTime: time, updatedAt: new Date().toISOString() } : row),
      }));
    },
    cancelAppointment: (id) => setData((current) => ({
      ...current,
      appointments: current.appointments.map((row) => row.id === id ? { ...row, status: "cancelled" as const, updatedAt: new Date().toISOString() } : row),
    })),
    saveIntegration: (item) => setData((current) => ({ ...current, integrations: upsert(current.integrations, item) })),
    deleteIntegration: (id) => setData((current) => ({
      ...current,
      integrations: current.integrations.filter((row) => row.id !== id),
      lifecycleMappings: current.lifecycleMappings.filter((row) => row.integrationId !== id),
      externalRecords: current.externalRecords.filter((row) => row.integrationId !== id),
    })),
    saveLifecycleStage: (item) => setData((current) => ({ ...current, lifecycleStages: upsert(current.lifecycleStages, item) })),
    deleteLifecycleStage: (id) => setData((current) => ({
      ...current,
      lifecycleStages: current.lifecycleStages.filter((row) => row.id !== id),
      lifecycleMappings: current.lifecycleMappings.filter((row) => row.lifecycleStageId !== id),
    })),
    saveLifecycleMapping: (item) => setData((current) => ({ ...current, lifecycleMappings: upsert(current.lifecycleMappings, item) })),
    deleteLifecycleMapping: (id) => setData((current) => ({ ...current, lifecycleMappings: current.lifecycleMappings.filter((row) => row.id !== id) })),
    linkExternalRecord: (item) => setData((current) => ({ ...current, externalRecords: upsert(current.externalRecords, item) })),
    addLifecycleEvent: (item) => setData((current) => ({ ...current, lifecycleEvents: [...current.lifecycleEvents, item] })),
    ingestExternalStatus: (input) => {
      const mapping = data.lifecycleMappings.find((row) =>
        row.integrationId === input.integrationId &&
        row.isActive &&
        row.externalStatus.trim().toLowerCase() === input.externalStatus.trim().toLowerCase()
      );
      if (!mapping) {
        const exception: DemoLifecycleException = {
          id: makeId("lex"),
          orderId: input.orderId,
          integrationId: input.integrationId,
          exceptionType: "unmapped_status",
          message: `No lifecycle mapping exists for external status "${input.externalStatus}".`,
          externalStatus: input.externalStatus,
          status: "open",
          createdAt: new Date().toISOString(),
        };
        setData((current) => ({ ...current, lifecycleExceptions: [...current.lifecycleExceptions, exception] }));
        return { exception };
      }

      const now = new Date().toISOString();
      const event: DemoLifecycleEvent = {
        id: makeId("life"),
        orderId: input.orderId,
        integrationId: input.integrationId,
        lifecycleStageId: mapping.lifecycleStageId,
        externalStatus: input.externalStatus,
        externalEventId: input.externalEventId,
        source: "integration",
        detail: input.detail,
        occurredAt: now,
        createdAt: now,
      };

      setData((current) => {
        const duplicate = input.externalEventId
          ? current.lifecycleEvents.find((row) => row.integrationId === input.integrationId && row.externalEventId === input.externalEventId)
          : undefined;
        if (duplicate) return current;

        let externalRecords = current.externalRecords;
        if (input.externalId) {
          const existing = current.externalRecords.find((row) =>
            row.integrationId === input.integrationId &&
            row.entityType === "order" &&
            row.internalEntityId === input.orderId
          );
          const record: DemoExternalRecord = {
            id: existing?.id ?? makeId("ext"),
            integrationId: input.integrationId,
            entityType: "order",
            internalEntityId: input.orderId,
            externalId: input.externalId,
            externalStatus: input.externalStatus,
            lastSyncedAt: now,
          };
          externalRecords = upsert(current.externalRecords, record);
        }

        return {
          ...current,
          lifecycleEvents: [...current.lifecycleEvents, event],
          externalRecords,
        };
      });
      return { event };
    },
    resolveLifecycleException: (id, status = "resolved") => setData((current) => ({
      ...current,
      lifecycleExceptions: current.lifecycleExceptions.map((row) => row.id === id ? {
        ...row,
        status,
        resolvedAt: new Date().toISOString(),
      } : row),
    })),
    getCurrentLifecycleStage: (orderId) => {
      const events = data.lifecycleEvents
        .filter((row) => row.orderId === orderId)
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
      const latest = events[0];
      return latest ? data.lifecycleStages.find((stage) => stage.id === latest.lifecycleStageId) : undefined;
    },
    saveInvoiceSettings: (settings) => setData((current) => ({ ...current, invoiceSettings: settings })),
    createInvoiceBatch: (input) => {
      const eligible = data.orders.filter((order) => input.orderIds.includes(order.id));
      if (eligible.length === 0) return undefined;

      const settings = data.invoiceSettings;
      const yearPart = settings.includeYear ? `${new Date().getFullYear()}-` : "";
      const numberPart = String(settings.nextNumber).padStart(settings.padding, "0");
      const invoiceNumber = `${settings.prefix}-${yearPart}${numberPart}`;

      const subtotal = eligible.reduce((sum, order) => {
        const numeric = Number(String(order.monthlyPriceSnapshot ?? "0").replace(/[^0-9.-]/g, ""));
        return sum + (Number.isFinite(numeric) ? numeric : 0);
      }, 0);

      const batch: DemoInvoiceBatch = {
        id: makeId("inv"),
        invoiceNumber,
        teamId: input.teamId,
        status: "draft",
        orderIds: eligible.map((row) => row.id),
        subtotal,
        adjustmentsTotal: 0,
        total: subtotal,
        createdAt: new Date().toISOString(),
        notes: input.notes,
      };

      setData((current) => ({
        ...current,
        invoiceSettings: { ...current.invoiceSettings, nextNumber: current.invoiceSettings.nextNumber + 1 },
        invoiceBatches: [...current.invoiceBatches, batch],
      }));
      return batch;
    },
    finalizeInvoiceBatch: (id) => setData((current) => ({
      ...current,
      invoiceBatches: current.invoiceBatches.map((batch) => batch.id === id ? {
        ...batch,
        status: "finalized" as const,
        finalizedAt: new Date().toISOString(),
      } : batch),
    })),
    markInvoiceExported: (id) => setData((current) => ({
      ...current,
      invoiceBatches: current.invoiceBatches.map((batch) => batch.id === id ? {
        ...batch,
        status: "exported" as const,
        exportedAt: new Date().toISOString(),
      } : batch),
    })),
    voidInvoiceBatch: (id) => setData((current) => ({
      ...current,
      invoiceBatches: current.invoiceBatches.map((batch) => batch.id === id ? {
        ...batch,
        status: "void" as const,
      } : batch),
    })),
    saveAdjustment: (item) => setData((current) => ({ ...current, adjustments: upsert(current.adjustments, item) })),
    applyAdjustment: (id) => setData((current) => {
      const nextAdjustments = current.adjustments.map((adj) => adj.id === id ? {
        ...adj,
        status: "applied" as const,
        appliedAt: new Date().toISOString(),
      } : adj);
      const applied = nextAdjustments.find((adj) => adj.id === id);
      if (!applied?.invoiceBatchId) return { ...current, adjustments: nextAdjustments };

      const invoiceBatches = current.invoiceBatches.map((batch) => {
        if (batch.id !== applied.invoiceBatchId) return batch;
        const signed = applied.adjustmentType === "debit" ? Math.abs(applied.amount) : -Math.abs(applied.amount);
        const nextAdjTotal = batch.adjustmentsTotal + signed;
        return { ...batch, adjustmentsTotal: nextAdjTotal, total: batch.subtotal + nextAdjTotal };
      });
      return { ...current, adjustments: nextAdjustments, invoiceBatches };
    }),
    reverseAdjustment: (id) => setData((current) => {
      const existing = current.adjustments.find((adj) => adj.id === id);
      if (!existing) return current;
      let invoiceBatches = current.invoiceBatches;
      if (existing.status === "applied" && existing.invoiceBatchId) {
        invoiceBatches = current.invoiceBatches.map((batch) => {
          if (batch.id !== existing.invoiceBatchId) return batch;
          const signed = existing.adjustmentType === "debit" ? Math.abs(existing.amount) : -Math.abs(existing.amount);
          const nextAdjTotal = batch.adjustmentsTotal - signed;
          return { ...batch, adjustmentsTotal: nextAdjTotal, total: batch.subtotal + nextAdjTotal };
        });
      }
      return {
        ...current,
        invoiceBatches,
        adjustments: current.adjustments.map((adj) => adj.id === id ? { ...adj, status: "reversed" as const } : adj),
      };
    }),
    getOrderInvoiceBatch: (orderId) => data.invoiceBatches.find((batch) => batch.orderIds.includes(orderId) && batch.status !== "void"),
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
