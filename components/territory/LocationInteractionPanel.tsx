"use client";

import { FormEvent, useMemo, useState } from "react";
import type { DemoDisposition, DemoInteraction, DemoRep } from "@/lib/mock/data";

const storageKey = (locationId: string) => `cwlwm-demo-interactions:${locationId}`;

function loadStored(locationId: string): DemoInteraction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(locationId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  }).format(new Date(value));
}

export function LocationInteractionPanel({
  locationId,
  reps,
  dispositions,
  initialInteractions,
}: {
  locationId: string;
  reps: DemoRep[];
  dispositions: DemoDisposition[];
  initialInteractions: DemoInteraction[];
}) {
  const [storedInteractions, setStoredInteractions] = useState<DemoInteraction[]>(() => loadStored(locationId));
  const [repId, setRepId] = useState(reps[0]?.id ?? "");
  const [dispositionId, setDispositionId] = useState(dispositions[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [decisionMakerContacted, setDecisionMakerContacted] = useState(false);
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpAt, setFollowUpAt] = useState("");
  const [message, setMessage] = useState("");

  const selectedDisposition = dispositions.find((item) => item.id === dispositionId);
  const timeline = useMemo(
    () => [...storedInteractions, ...initialInteractions].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
    [storedInteractions, initialInteractions]
  );

  function onDispositionChange(nextId: string) {
    setDispositionId(nextId);
    const next = dispositions.find((item) => item.id === nextId);
    if (!next) return;
    setDecisionMakerContacted(next.marksContact);
    setFollowUpNeeded(next.requiresFollowUp);
    if (!next.requiresFollowUp) setFollowUpAt("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const rep = reps.find((item) => item.id === repId);
    const disposition = dispositions.find((item) => item.id === dispositionId);
    if (!rep || !disposition) return setMessage("Choose a representative and disposition.");
    if (disposition.requiresNote && !note.trim()) return setMessage("This disposition requires a note.");
    if ((followUpNeeded || disposition.requiresFollowUp) && !followUpAt) return setMessage("Choose a follow-up date and time.");

    const interaction: DemoInteraction = {
      id: `local_${Date.now()}`,
      locationId,
      representativeId: rep.id,
      representativeName: rep.name,
      dispositionId: disposition.id,
      dispositionName: disposition.name,
      note: note.trim(),
      decisionMakerContacted,
      followUpNeeded: followUpNeeded || disposition.requiresFollowUp,
      followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      occurredAt: new Date().toISOString(),
    };

    const next = [interaction, ...storedInteractions];
    setStoredInteractions(next);
    window.localStorage.setItem(storageKey(locationId), JSON.stringify(next));
    setNote("");
    setMessage("Interaction saved locally in mock mode.");
  }

  function clearMockHistory() {
    window.localStorage.removeItem(storageKey(locationId));
    setStoredInteractions([]);
    setMessage("Locally added mock interactions cleared.");
  }

  return <div className="interaction-layout">
    <section className="card interaction-form-card">
      <div className="eyebrow">New field activity</div>
      <h2>Record Interaction</h2>
      <form className="form-grid" onSubmit={submit}>
        <label><span>Representative</span><select value={repId} onChange={(e) => setRepId(e.target.value)}>{reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
        <label><span>Disposition</span><select value={dispositionId} onChange={(e) => onDispositionChange(e.target.value)}>{dispositions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {selectedDisposition && <div className="form-hint full-width">{selectedDisposition.description}{selectedDisposition.isTerminal ? " This is a terminal disposition." : ""}</div>}
        <label className="full-width"><span>Visit note {selectedDisposition?.requiresNote ? "*" : ""}</span><textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add useful context from the field visit…" /></label>
        <label className="check-row"><input type="checkbox" checked={decisionMakerContacted} onChange={(e) => setDecisionMakerContacted(e.target.checked)} /><span>Decision maker contacted</span></label>
        <label className="check-row"><input type="checkbox" checked={followUpNeeded} onChange={(e) => setFollowUpNeeded(e.target.checked)} /><span>Follow-up needed</span></label>
        {(followUpNeeded || selectedDisposition?.requiresFollowUp) && <label className="full-width"><span>Follow-up date & time *</span><input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} /></label>}
        {message && <div className="form-message full-width">{message}</div>}
        <div className="form-actions full-width"><button className="button" type="submit">Save Interaction</button><span className="muted small">Stored in this browser only while mock mode is active.</span></div>
      </form>
    </section>

    <section className="card timeline-card">
      <div className="section-heading compact"><div><div className="eyebrow">Location history</div><h2>Interaction Timeline</h2></div>{storedInteractions.length > 0 && <button className="link-button" type="button" onClick={clearMockHistory}>Clear local additions</button>}</div>
      <div className="timeline">
        {timeline.length === 0 ? <div className="empty-state">No interactions recorded yet.</div> : timeline.map((interaction) => <article className="timeline-item" key={interaction.id}>
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-title"><strong>{interaction.dispositionName}</strong><span className="muted small">{formatDate(interaction.occurredAt)}</span></div>
            <div className="muted small">{interaction.representativeName}</div>
            {interaction.note && <p>{interaction.note}</p>}
            <div className="timeline-flags">
              {interaction.decisionMakerContacted && <span className="badge">Decision maker contacted</span>}
              {interaction.followUpNeeded && <span className="badge warning">Follow up: {formatDate(interaction.followUpAt)}</span>}
            </div>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
