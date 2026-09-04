export type OrganizationSettings = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: "active" | "inactive";
};

export type DemoTeam = {
  id: string;
  name: string;
  type: "internal" | "vendor";
  reps: number;
  status: "active" | "inactive";
};

export type DemoMarket = {
  id: string;
  name: string;
  slug: string;
  stateRegion: string;
  status: "active" | "inactive";
};

export type DemoTerritory = {
  id: string;
  name: string;
  market: string;
  marketId?: string;
  team: string;
  teamId: string;
  locations: number;
  status: "active" | "inactive";
  description: string;
};

export type DemoRep = {
  id: string;
  name: string;
  email: string;
  team: string;
  teamId: string;
  status: "active" | "inactive";
  territoryIds: string[];
};

export type ServiceStatus =
  | "prospect"
  | "current_customer"
  | "do_not_knock"
  | "vacant"
  | "business";

export type DemoLocation = {
  serviceStatus?: ServiceStatus;
  id: string;
  externalId: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  territory: string;
  territoryId: string;
  team: string;
  teamId: string;
  disposition: string;
  assignedRepId?: string;
  latitude?: number;
  longitude?: number;
};

export type DemoDisposition = {
  id: string;
  code: string;
  name: string;
  description: string;
  requiresNote: boolean;
  requiresFollowUp: boolean;
  marksContact: boolean;
  marksSale: boolean;
  isTerminal: boolean;
  defaultFollowUpDays?: number;
  isActive?: boolean;
};

export type DemoInteraction = {
  id: string;
  locationId: string;
  disposition: string;
  dispositionCode: string;
  representativeId: string;
  representativeName: string;
  note: string;
  followUpNeeded: boolean;
  followUpAt?: string;
  occurredAt: string;
  source: string;
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
