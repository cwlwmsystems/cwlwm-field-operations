"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { usePlatformStore, type DemoInvoiceSettings } from "@/lib/store/platformStore";

export default function AdminFinancePage() {
  const { data, saveInvoiceSettings } = usePlatformStore();
  const [settings, setSettings] = useState<DemoInvoiceSettings>(data.invoiceSettings);
  const [saved, setSaved] = useState(false);

  function save() {
    saveInvoiceSettings(settings);
    setSaved(true);
    setTimeout(()=>setSaved(false),1500);
  }

  const preview = `${settings.prefix}-${settings.includeYear ? `${new Date().getFullYear()}-` : ""}${String(settings.nextNumber).padStart(settings.padding,"0")}`;

  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Administration</div><h1>Finance Settings</h1><p className="muted">Configure generic invoice numbering and billing defaults.</p></div></div>
    <AdminNav />

    {saved && <div className="success-banner"><strong>Saved</strong><span>Finance settings updated.</span></div>}

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Invoice Numbering</div><h2>Number format</h2>
        <label>Prefix<input value={settings.prefix} onChange={(e)=>setSettings({...settings,prefix:e.target.value.toUpperCase()})} /></label>
        <label>Next number<input type="number" min="1" value={settings.nextNumber} onChange={(e)=>setSettings({...settings,nextNumber:Number(e.target.value)})} /></label>
        <label>Padding<input type="number" min="1" max="10" value={settings.padding} onChange={(e)=>setSettings({...settings,padding:Number(e.target.value)})} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={settings.includeYear} onChange={(e)=>setSettings({...settings,includeYear:e.target.checked})} />Include current year</label>
        <label>Currency<input value={settings.defaultCurrency} onChange={(e)=>setSettings({...settings,defaultCurrency:e.target.value.toUpperCase()})} /></label>
        <button className="button" onClick={save}>Save settings</button>
      </section>

      <section className="card">
        <div className="eyebrow">Preview</div><h2>{preview}</h2>
        <p className="muted">Invoice numbers are organization-configurable. No customer or prior-employer naming convention is hard-coded into the platform.</p>
        <div className="summary-list">
          <div><span>Prefix</span><strong>{settings.prefix}</strong></div>
          <div><span>Year</span><strong>{settings.includeYear ? "Included" : "Not included"}</strong></div>
          <div><span>Next sequence</span><strong>{settings.nextNumber}</strong></div>
          <div><span>Currency</span><strong>{settings.defaultCurrency}</strong></div>
        </div>
      </section>
    </div>
  </AppShell>;
}
