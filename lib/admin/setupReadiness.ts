import type {
  DemoDisposition,
  DemoLocation,
  DemoMarket,
  DemoRep,
  DemoTeam,
  DemoTerritory,
  OrganizationSettings,
} from "@/lib/types/platform";
import type { DemoOffer, DemoProduct } from "@/lib/types/platform";
import type { DemoSchedulingPolicy } from "@/lib/types/platform";
import type { DemoLifecycleStage } from "@/lib/types/platform";

export type SetupStepStatus = "complete" | "recommended" | "blocked";

export type SetupStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  status: SetupStepStatus;
  count?: number;
  note: string;
};

export function buildSetupReadiness(input: {
  organization: OrganizationSettings | null;
  teams: DemoTeam[];
  markets: DemoMarket[];
  territories: DemoTerritory[];
  reps: DemoRep[];
  dispositions: DemoDisposition[];
  locations: DemoLocation[];
  products: DemoProduct[];
  offers: DemoOffer[];
  policies: DemoSchedulingPolicy[];
  lifecycleStages: DemoLifecycleStage[];
}) {
  const orgReady = Boolean(
    input.organization?.name?.trim() &&
    input.organization?.slug?.trim() &&
    input.organization?.timezone?.trim()
  );
  const activeTeams = input.teams.filter((item) => item.status === "active");
  const activeMarkets = input.markets.filter((item) => item.status === "active");
  const activeTerritories = input.territories.filter((item) => item.status === "active");
  const activeReps = input.reps.filter((item) => item.status === "active");
  const activeDispositions = input.dispositions.filter((item) => item.isActive !== false);
  const activeProducts = input.products.filter((item) => item.isActive);
  const activeOffers = input.offers.filter((item) => item.isActive);
  const activePolicies = input.policies.filter((item) => item.isActive);
  const activeStages = input.lifecycleStages.filter((item) => item.isActive);

  const steps: SetupStep[] = [
    {
      id: "organization",
      order: 1,
      title: "Organization profile",
      description: "Confirm the tenant name, slug, timezone, and active status.",
      href: "/admin/organization",
      actionLabel: "Configure organization",
      status: orgReady ? "complete" : "recommended",
      note: orgReady ? `${input.organization?.name} · ${input.organization?.timezone}` : "Required before day-to-day use.",
    },
    {
      id: "teams",
      order: 2,
      title: "Teams and partners",
      description: "Create internal sales teams, vendors, or partner groups.",
      href: "/admin/teams",
      actionLabel: "Manage teams",
      status: activeTeams.length ? "complete" : "recommended",
      count: activeTeams.length,
      note: activeTeams.length ? `${activeTeams.length} active team${activeTeams.length === 1 ? "" : "s"}` : "Create at least one active team.",
    },
    {
      id: "markets",
      order: 3,
      title: "Markets",
      description: "Define the geographic markets that contain your territories.",
      href: "/admin/markets",
      actionLabel: "Manage markets",
      status: activeMarkets.length ? "complete" : "recommended",
      count: activeMarkets.length,
      note: activeMarkets.length ? `${activeMarkets.length} active market${activeMarkets.length === 1 ? "" : "s"}` : "Create the first operating market.",
    },
    {
      id: "territories",
      order: 4,
      title: "Territories",
      description: "Create field territories and connect them to markets and teams.",
      href: "/admin/territories",
      actionLabel: "Manage territories",
      status: !activeMarkets.length ? "blocked" : activeTerritories.length ? "complete" : "recommended",
      count: activeTerritories.length,
      note: !activeMarkets.length ? "Create a market first." : activeTerritories.length ? `${activeTerritories.length} active territor${activeTerritories.length === 1 ? "y" : "ies"}` : "Create the first territory.",
    },
    {
      id: "dispositions",
      order: 5,
      title: "Field dispositions",
      description: "Define outcomes reps can record, including follow-up and sale behavior.",
      href: "/admin/dispositions",
      actionLabel: "Configure dispositions",
      status: activeDispositions.length >= 3 ? "complete" : "recommended",
      count: activeDispositions.length,
      note: activeDispositions.length >= 3 ? `${activeDispositions.length} active dispositions` : "Add a practical field outcome set before reps begin work.",
    },
    {
      id: "representatives",
      order: 6,
      title: "Representatives",
      description: "Add field reps and assign them to teams and territories.",
      href: "/admin/representatives",
      actionLabel: "Manage representatives",
      status: !activeTeams.length || !activeTerritories.length ? "blocked" : activeReps.length ? "complete" : "recommended",
      count: activeReps.length,
      note: !activeTeams.length || !activeTerritories.length ? "Create teams and territories first." : activeReps.length ? `${activeReps.length} active representative${activeReps.length === 1 ? "" : "s"}` : "Add the first field representative.",
    },
    {
      id: "locations",
      order: 7,
      title: "Locations and footprint",
      description: "Import serviceable addresses, current customers, exclusions, and coordinates.",
      href: "/admin/locations",
      actionLabel: "Import locations",
      status: !activeTerritories.length ? "blocked" : input.locations.length ? "complete" : "recommended",
      count: input.locations.length,
      note: !activeTerritories.length ? "Create territories before importing locations." : input.locations.length ? `${input.locations.length.toLocaleString()} locations loaded` : "Load the first operating footprint.",
    },
    {
      id: "catalog",
      order: 8,
      title: "Products and offers",
      description: "Confirm the products and offers reps can select during a sale.",
      href: "/admin/sales-review",
      actionLabel: "Review sales configuration",
      status: activeProducts.length && activeOffers.length ? "complete" : "recommended",
      count: activeProducts.length + activeOffers.length,
      note: activeProducts.length && activeOffers.length ? `${activeProducts.length} products · ${activeOffers.length} offers` : "At least one active product and offer is recommended.",
    },
    {
      id: "scheduling",
      order: 9,
      title: "Scheduling policy",
      description: "Configure appointment days, times, capacity, and lead-time rules.",
      href: "/admin/scheduling",
      actionLabel: "Configure scheduling",
      status: activePolicies.length ? "complete" : "recommended",
      count: activePolicies.length,
      note: activePolicies.length ? `${activePolicies.length} active scheduling polic${activePolicies.length === 1 ? "y" : "ies"}` : "Recommended before reps submit install appointments.",
    },
    {
      id: "lifecycle",
      order: 10,
      title: "Lifecycle stages",
      description: "Verify the order lifecycle used to track fulfillment and completion.",
      href: "/admin/lifecycle",
      actionLabel: "Review lifecycle",
      status: activeStages.length >= 3 ? "complete" : "recommended",
      count: activeStages.length,
      note: activeStages.length >= 3 ? `${activeStages.length} active lifecycle stages` : "Configure the core submitted-to-complete flow.",
    },
  ];

  const complete = steps.filter((step) => step.status === "complete").length;
  const blocked = steps.filter((step) => step.status === "blocked").length;
  const readiness = Math.round((complete / steps.length) * 100);
  const nextStep = steps.find((step) => step.status === "recommended") ?? steps.find((step) => step.status === "blocked") ?? null;

  const assignmentCoverage = input.locations.length
    ? input.locations.filter((item) => item.assignedRepId).length / input.locations.length
    : 0;

  return {
    steps,
    complete,
    blocked,
    readiness,
    nextStep,
    assignmentCoverage,
    operationalReady:
      orgReady &&
      activeTeams.length > 0 &&
      activeMarkets.length > 0 &&
      activeTerritories.length > 0 &&
      activeReps.length > 0 &&
      input.locations.length > 0 &&
      activeDispositions.length >= 3,
  };
}
