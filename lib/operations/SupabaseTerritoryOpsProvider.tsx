"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode
} from "react";
import { createClient } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import {
  usePlatformStore, type DemoInteraction
} from "@/lib/store/platformStore";

export type TerritoryInteractionInput = {
  locationId: string;
  representativeId?: string;
  territoryId?: string;
  teamId?: string;
  dispositionId?: string;
  note?: string;
  decisionMakerContacted?: boolean;
  followUpNeeded?: boolean;
  followUpAt?: string;
  occurredAt?: string;
};

type TerritoryOpsContextValue = {
  loading: boolean;
  error: string | null;
  interactions: DemoInteraction[];
  refresh: () => Promise<void>;
  addInteraction: (input: TerritoryInteractionInput) => Promise<void>;
};

const TerritoryOpsContext = createContext<TerritoryOpsContextValue | undefined>(undefined);

export function SupabaseTerritoryOpsProvider({ children }: { children: ReactNode }) {
  const { organization } = useAuth();
  const config = useSupabaseConfig();
  const { hydrateConfiguration } = usePlatformStore();
  const [interactions, setInteractions] = useState<DemoInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = organization?.id;

  const refresh = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("location_interactions")
      .select(`
        id,
        location_id,
        representative_id,
        territory_id,
        team_id,
        disposition_id,
        note,
        decision_maker_contacted,
        follow_up_needed,
        follow_up_at,
        occurred_at,
        source_system
      `)
      .eq("organization_id", orgId)
      .order("occurred_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const mapped: DemoInteraction[] = (data ?? []).map((row) => {
      const disposition = config.dispositions.find((d) => d.id === row.disposition_id);
      const rep = config.reps.find((r) => r.id === row.representative_id);
      return {
        id: row.id,
        locationId: row.location_id,
        disposition: disposition?.name ?? "Unknown",
        dispositionCode: disposition?.code ?? "unknown",
        representativeId: row.representative_id ?? "",
        representativeName: rep?.name ?? "Unknown",
        note: row.note ?? "",
        followUpNeeded: Boolean(row.follow_up_needed),
        followUpAt: row.follow_up_at ?? undefined,
        occurredAt: row.occurred_at,
        source: row.source_system ?? "app",
      };
    });

    setInteractions(mapped);
    setLoading(false);
  }, [orgId, config.dispositions, config.reps]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addInteraction(input: TerritoryInteractionInput) {
    if (!orgId) throw new Error("No active organization.");
    const supabase = createClient();

    const disposition = config.dispositions.find((d) => d.id === input.dispositionId);
    if (!disposition) throw new Error("Select a valid disposition.");

    const followUpNeeded = input.followUpNeeded ?? disposition.requiresFollowUp;
    let followUpAt = input.followUpAt ?? null;

    if (followUpNeeded && !followUpAt && disposition.defaultFollowUpDays) {
      const date = new Date();
      date.setDate(date.getDate() + disposition.defaultFollowUpDays);
      followUpAt = date.toISOString();
    }

    const clientSubmissionId = crypto.randomUUID();
    const occurredAt = input.occurredAt ?? new Date().toISOString();

    const { error: insertError } = await supabase.from("location_interactions").insert({
      organization_id: orgId,
      location_id: input.locationId,
      representative_id: input.representativeId || null,
      territory_id: input.territoryId || null,
      team_id: input.teamId || null,
      disposition_id: input.dispositionId || null,
      interaction_type: "field_visit",
      note: input.note || null,
      decision_maker_contacted: input.decisionMakerContacted ?? disposition.marksContact,
      follow_up_needed: followUpNeeded,
      follow_up_at: followUpAt,
      occurred_at: occurredAt,
      source_system: "app",
      client_submission_id: clientSubmissionId,
    });

    if (insertError) throw new Error(insertError.message);

    const { error: locationError } = await supabase
      .from("locations")
      .update({
        current_disposition_id: input.dispositionId || null,
        current_representative_id: input.representativeId || null,
      })
      .eq("organization_id", orgId)
      .eq("id", input.locationId);

    if (locationError) throw new Error(locationError.message);

    await config.refresh();
    await refresh();

    // Configuration refresh hydrates updated locations into the compatibility store.
    hydrateConfiguration({});
  }

  const value = useMemo<TerritoryOpsContextValue>(() => ({
    loading, error, interactions, refresh, addInteraction
  }), [loading, error, interactions, refresh]);

  return <TerritoryOpsContext.Provider value={value}>{children}</TerritoryOpsContext.Provider>;
}

export function useSupabaseTerritoryOps() {
  const value = useContext(TerritoryOpsContext);
  if (!value) throw new Error("useSupabaseTerritoryOps must be used within SupabaseTerritoryOpsProvider.");
  return value;
}
