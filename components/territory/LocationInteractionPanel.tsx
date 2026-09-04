"use client";

import { useMemo, useState } from "react";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";

export function LocationInteractionPanel({ locationId }: { locationId: string }) {
  const { locations, reps, dispositions } = useSupabaseConfig();
  const { interactions, addInteraction, loading } = useSupabaseTerritoryOps();

  const location = locations.find((row) => row.id === locationId);
  const eligibleReps = reps.filter((rep) => !location?.territoryId || rep.territoryIds.includes(location.territoryId));

  const [representativeId, setRepresentativeId] = useState(location?.assignedRepId ?? eligibleReps[0]?.id ?? "");
  const [dispositionId, setDispositionId] = useState(dispositions.find((d)=>d.isActive!==false)?.id ?? "");
  const [note, setNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedDisposition = dispositions.find((d) => d.id === dispositionId);
  const locationInteractions = useMemo(
    () => interactions.filter((row) => row.locationId === locationId),
    [interactions, locationId]
  );

  async function submit() {
    if (!location || !dispositionId) return;
    if (selectedDisposition?.requiresNote && !note.trim()) {
      setMessage("This disposition requires a note.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await addInteraction({
        locationId: location.id,
        representativeId: representativeId || undefined,
        territoryId: location.territoryId || undefined,
        teamId: location.teamId || undefined,
        dispositionId,
        note: note.trim() || undefined,
        followUpNeeded: selectedDisposition?.requiresFollowUp ?? false,
        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      });
      setNote("");
      setFollowUpAt("");
      setMessage("Interaction saved to Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save interaction.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="grid two-column">
    <section className="card">
      <div className="eyebrow">Field Interaction · Supabase</div>
      <h2>Record disposition</h2>

      <label>Representative
        <select value={representativeId} onChange={(e)=>setRepresentativeId(e.target.value)}>
          <option value="">Unassigned</option>
          {eligibleReps.map((rep)=><option key={rep.id} value={rep.id}>{rep.name}</option>)}
        </select>
      </label>

      <label>Disposition
        <select value={dispositionId} onChange={(e)=>setDispositionId(e.target.value)}>
          {dispositions.filter((d)=>d.isActive!==false).map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>

      <label>Note
        <textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder={selectedDisposition?.requiresNote ? "Required for this disposition" : "Optional note"} />
      </label>

      {selectedDisposition?.requiresFollowUp && <label>Follow-up date/time
        <input type="datetime-local" value={followUpAt} onChange={(e)=>setFollowUpAt(e.target.value)} />
      </label>}

      {message && <div className="form-message">{message}</div>}

      <button className="button" disabled={saving} onClick={submit}>
        {saving ? "Saving…" : "Save Interaction"}
      </button>
    </section>

    <section className="card">
      <div className="eyebrow">Interaction Timeline</div>
      <h2>History</h2>
      {loading ? <div className="empty-state">Loading interactions…</div> :
      locationInteractions.length === 0 ? <div className="empty-state">No interactions recorded yet.</div> :
      <div className="simple-timeline">
        {locationInteractions.map((row)=><div key={row.id}>
          <strong>{row.disposition}</strong>
          <span>{new Date(row.occurredAt).toLocaleString()} · {row.representativeName}</span>
          {row.note && <span>{row.note}</span>}
          {row.followUpNeeded && <span>Follow-up: {row.followUpAt ? new Date(row.followUpAt).toLocaleString() : "Required"}</span>}
        </div>)}
      </div>}
    </section>
  </div>;
}
