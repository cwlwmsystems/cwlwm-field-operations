"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode
} from "react";
import { createClient } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import type { DemoInteraction } from "@/lib/types/platform";

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

    const { error } = await supabase.rpc("record_location_interaction", {
      p_organization_id: orgId,
      p_location_id: input.locationId,
      p_representative_id: input.representativeId || null,
      p_territory_id: input.territoryId || null,
      p_team_id: input.teamId || null,
      p_disposition_id: input.dispositionId || null,
      p_interaction_type: "field_visit",
      p_note: input.note || null,
      p_decision_maker_contacted: input.decisionMakerContacted ?? disposition.marksContact,
      p_follow_up_needed: followUpNeeded,
      p_follow_up_at: followUpAt,
      p_occurred_at: input.occurredAt ?? new Date().toISOString(),
      p_source_system: "app",
      p_client_submission_id: crypto.randomUUID(),
    });

    if (error) throw new Error(error.message);
    await Promise.all([config.refresh(), refresh()]);
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
