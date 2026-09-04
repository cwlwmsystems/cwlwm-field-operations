"use client";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import type { OrganizationSettings } from "@/lib/store/platformStore";

export default function Page() {
  const { organization, saveOrganization, loading, error } = useSupabaseConfig();
  const [editing, setEditing] = useState<OrganizationSettings | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { if (organization) setEditing(organization); }, [organization]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try { await saveOrganization(editing); setMessage("Organization settings saved to Supabase."); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Save failed."); }
  }

  return <AppShell>
    <div className="eyebrow">Admin · Supabase</div><h1>Organization Settings</h1><AdminNav />
    {error && <div className="error-banner"><strong>Configuration error</strong><span>{error}</span></div>}
    {!editing || loading ? <div className="card">Loading organization…</div> :
    <form className="card admin-form" onSubmit={submit}>
      <label>Name<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} required /></label>
      <label>Slug<input value={editing.slug} onChange={e=>setEditing({...editing,slug:e.target.value})} required /></label>
      <label>Timezone<input value={editing.timezone} onChange={e=>setEditing({...editing,timezone:e.target.value})} required /></label>
      <label>Status<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as "active"|"inactive"})}><option value="active">Active</option><option value="inactive">Inactive / Suspended</option></select></label>
      {message && <div className="form-message full-width">{message}</div>}
      <div className="full-width"><button className="button">Save Organization</button></div>
    </form>}
  </AppShell>;
}
