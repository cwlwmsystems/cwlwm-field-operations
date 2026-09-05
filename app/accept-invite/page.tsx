"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Opening your invitation…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        setEmail(data.session.user.email ?? "");
        setReady(true);
        setMessage("");
      } else {
        setMessage("The invitation session is not active. Re-open the invitation link from your email, or sign in if you already created your password.");
      }
    }
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email ?? "");
        setReady(true);
        setMessage("");
      }
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10) { setMessage("Use a password with at least 10 characters."); return; }
    if (password !== confirm) { setMessage("The passwords do not match."); return; }
    try {
      setSaving(true);
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password saved. Opening Cwlwm Field Operations…");
      window.setTimeout(() => router.replace("/dashboard"), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save password.");
    } finally { setSaving(false); }
  }

  return <main className="invite-accept-page"><section className="card invite-accept-card"><img src="/cwlwm-knot-logo.png" alt="Cwlwm" className="invite-logo" /><div className="eyebrow">Cwlwm Field Operations</div><h1>Accept your invitation</h1><p className="muted">{email ? `Set a password for ${email} to finish activating your organization access.` : "Finish activating your organization access."}</p>{message && <div className="form-message">{message}</div>}{ready && <form className="admin-form single" onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} /></label><label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={10} /></label><button className="button" disabled={saving}>{saving ? "Saving…" : "Activate Account"}</button></form>}<a href="/login" className="text-link">Already activated? Sign in</a></section></main>;
}
