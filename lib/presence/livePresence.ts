import { createClient } from "@/lib/supabase/browser";

export type LivePresenceRow = {
  organization_id: string;
  user_id: string;
  representative_id: string | null;
  email: string | null;
  role: string | null;
  page_path: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  location_updated_at: string | null;
  last_seen_at: string;
};

export async function touchLivePresence(input: {
  organizationId: string;
  pagePath?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}) {
  const { error } = await createClient().rpc("touch_live_presence", {
    p_organization_id: input.organizationId,
    p_page_path: input.pagePath ?? null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
    p_accuracy_meters: input.accuracyMeters ?? null,
  });

  if (error) throw new Error(error.message);
}
