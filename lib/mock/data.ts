export type DemoTeam = {
  id: string;
  name: string;
  type: "internal" | "vendor";
  reps: number;
  status: "active" | "inactive";
};

export type DemoTerritory = {
  id: string;
  name: string;
  market: string;
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

export type DemoLocation = {
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
  representativeId: string;
  representativeName: string;
  dispositionId: string;
  dispositionName: string;
  note: string;
  decisionMakerContacted: boolean;
  followUpNeeded: boolean;
  followUpAt?: string;
  occurredAt: string;
};

export const demoOrganization = {
  id: "org_demo",
  name: "Northstar Field Services",
  slug: "northstar",
};

export const demoTeams: DemoTeam[] = [
  { id: "team_internal", name: "Internal Sales", type: "internal", reps: 6, status: "active" },
  { id: "team_vendor", name: "Summit Partners", type: "vendor", reps: 4, status: "active" },
];

export const demoTerritories: DemoTerritory[] = [
  {
    id: "terr_north",
    name: "North District",
    market: "Central Market",
    team: "Internal Sales",
    teamId: "team_internal",
    locations: 612,
    status: "active",
    description: "Primary internal-sales territory for the northern portion of the demo market.",
  },
  {
    id: "terr_south",
    name: "South District",
    market: "Central Market",
    team: "Summit Partners",
    teamId: "team_vendor",
    locations: 487,
    status: "active",
    description: "Partner-managed territory covering the southern portion of the demo market.",
  },
];

export const demoReps: DemoRep[] = [
  {
    id: "rep_1",
    name: "Morgan Reed",
    email: "morgan.reed@example.test",
    team: "Internal Sales",
    teamId: "team_internal",
    status: "active",
    territoryIds: ["terr_north"],
  },
  {
    id: "rep_2",
    name: "Taylor Brooks",
    email: "taylor.brooks@example.test",
    team: "Summit Partners",
    teamId: "team_vendor",
    status: "active",
    territoryIds: ["terr_south"],
  },
  {
    id: "rep_3",
    name: "Avery Stone",
    email: "avery.stone@example.test",
    team: "Internal Sales",
    teamId: "team_internal",
    status: "active",
    territoryIds: ["terr_north"],
  },
];

export const demoLocations: DemoLocation[] = [
  {
    id: "loc_1",
    externalId: "DEMO-10001",
    address: "101 Demo Street",
    city: "Exampleton",
    state: "PA",
    postalCode: "16901",
    territory: "North District",
    territoryId: "terr_north",
    team: "Internal Sales",
    teamId: "team_internal",
    disposition: "Follow Up",
    assignedRepId: "rep_1",
  },
  {
    id: "loc_2",
    externalId: "DEMO-10002",
    address: "205 Example Avenue",
    city: "Sample City",
    state: "PA",
    postalCode: "16902",
    territory: "South District",
    territoryId: "terr_south",
    team: "Summit Partners",
    teamId: "team_vendor",
    disposition: "Not Home",
    assignedRepId: "rep_2",
  },
  {
    id: "loc_3",
    externalId: "DEMO-10003",
    address: "88 Sample Road",
    city: "Exampleton",
    state: "PA",
    postalCode: "16901",
    territory: "North District",
    territoryId: "terr_north",
    team: "Internal Sales",
    teamId: "team_internal",
    disposition: "Interested",
    assignedRepId: "rep_3",
  },
  {
    id: "loc_4",
    externalId: "DEMO-10004",
    address: "412 Prototype Lane",
    city: "Exampleton",
    state: "PA",
    postalCode: "16901",
    territory: "North District",
    territoryId: "terr_north",
    team: "Internal Sales",
    teamId: "team_internal",
    disposition: "Unvisited",
  },
  {
    id: "loc_5",
    externalId: "DEMO-10005",
    address: "76 Placeholder Drive",
    city: "Sample City",
    state: "PA",
    postalCode: "16902",
    territory: "South District",
    territoryId: "terr_south",
    team: "Summit Partners",
    teamId: "team_vendor",
    disposition: "Unvisited",
  },
];

export const demoDispositions: DemoDisposition[] = [
  {
    id: "disp_not_home",
    code: "not_home",
    name: "Not Home",
    description: "No one answered at the location.",
    requiresNote: false,
    requiresFollowUp: true,
    marksContact: false,
    marksSale: false,
    isTerminal: false,
    defaultFollowUpDays: 2,
    isActive: true,
  },
  {
    id: "disp_interested",
    code: "interested",
    name: "Interested",
    description: "Decision maker expressed interest and may need follow-up.",
    requiresNote: true,
    requiresFollowUp: true,
    marksContact: true,
    marksSale: false,
    isTerminal: false,
    defaultFollowUpDays: 1,
    isActive: true,
  },
  {
    id: "disp_follow_up",
    code: "follow_up",
    name: "Follow Up",
    description: "A specific follow-up is needed.",
    requiresNote: true,
    requiresFollowUp: true,
    marksContact: true,
    marksSale: false,
    isTerminal: false,
    defaultFollowUpDays: 3,
    isActive: true,
  },
  {
    id: "disp_not_interested",
    code: "not_interested",
    name: "Not Interested",
    description: "Decision maker declined the offer.",
    requiresNote: true,
    requiresFollowUp: false,
    marksContact: true,
    marksSale: false,
    isTerminal: true,
    isActive: true,
  },
  {
    id: "disp_sale",
    code: "sale",
    name: "Sale",
    description: "Interaction resulted in a completed sale.",
    requiresNote: false,
    requiresFollowUp: false,
    marksContact: true,
    marksSale: true,
    isTerminal: true,
    isActive: true,
  },
];

export const demoInteractions: DemoInteraction[] = [
  {
    id: "int_1",
    locationId: "loc_1",
    representativeId: "rep_1",
    representativeName: "Morgan Reed",
    dispositionId: "disp_not_home",
    dispositionName: "Not Home",
    note: "No answer at the door. Try again in the early evening.",
    decisionMakerContacted: false,
    followUpNeeded: true,
    followUpAt: "2026-09-05T17:00:00-04:00",
    occurredAt: "2026-09-03T16:14:00-04:00",
  },
  {
    id: "int_2",
    locationId: "loc_1",
    representativeId: "rep_1",
    representativeName: "Morgan Reed",
    dispositionId: "disp_follow_up",
    dispositionName: "Follow Up",
    note: "Spoke with homeowner. Asked for a return visit after work.",
    decisionMakerContacted: true,
    followUpNeeded: true,
    followUpAt: "2026-09-06T18:00:00-04:00",
    occurredAt: "2026-09-04T10:22:00-04:00",
  },
  {
    id: "int_3",
    locationId: "loc_3",
    representativeId: "rep_3",
    representativeName: "Avery Stone",
    dispositionId: "disp_interested",
    dispositionName: "Interested",
    note: "Interested in reviewing service options with spouse.",
    decisionMakerContacted: true,
    followUpNeeded: true,
    followUpAt: "2026-09-05T15:00:00-04:00",
    occurredAt: "2026-09-04T09:05:00-04:00",
  },
];

export function getTerritory(id: string) {
  return demoTerritories.find((territory) => territory.id === id);
}

export function getLocation(id: string) {
  return demoLocations.find((location) => location.id === id);
}

export function getTerritoryReps(territoryId: string) {
  return demoReps.filter((rep) => rep.territoryIds.includes(territoryId));
}

export function getTerritoryLocations(territoryId: string) {
  return demoLocations.filter((location) => location.territoryId === territoryId);
}

export function getLocationInteractions(locationId: string) {
  return demoInteractions
    .filter((interaction) => interaction.locationId === locationId)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}
