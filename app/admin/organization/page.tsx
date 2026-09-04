"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { usePlatformStore } from "@/lib/store/platformStore";

export default function Page() {
  const { data, updateOrganization } = usePlatformStore();
  const [message, setMessage] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    updateOrganization({ name: String(fd.get("name")), slug: String(fd.get("slug")), timezone: String(fd.get("timezone")), status: String(fd.get("status")) as "active"|"inactive" });
    setMessage("Organization settings saved locally.");
  }
  return <AppShell><div className="eyebrow">Admin</div><h1>Organization Settings</h1><AdminNav />
    <form className="card admin-form" onSubmit={submit}>
      <label>Name<input name="name" defaultValue={data.organization.name} required /></label>
      <label>Slug<input name="slug" defaultValue={data.organization.slug} required /></label>
      <label>Timezone<input name="timezone" defaultValue={data.organization.timezone} required /></label>
      <label>Status<select name="status" defaultValue={data.organization.status}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      {message && <div className="form-message full-width">{message}</div>}
      <div className="full-width"><button className="button">Save Organization</button></div>
    </form>
  </AppShell>;
}
