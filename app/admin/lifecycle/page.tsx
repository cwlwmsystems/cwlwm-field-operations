"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { makeId, usePlatformStore, type DemoIntegration, type DemoLifecycleStage, type DemoLifecycleMapping } from "@/lib/store/platformStore";

export default function AdminLifecyclePage() {
  const {
    data, saveIntegration, deleteIntegration, saveLifecycleStage, deleteLifecycleStage,
    saveLifecycleMapping, deleteLifecycleMapping
  } = usePlatformStore();

  const [integration, setIntegration] = useState<DemoIntegration>({
    id: "", name: "", integrationType: "crm", status: "inactive", externalSystemLabel: "", notes: ""
  });
  const [stage, setStage] = useState<DemoLifecycleStage>({
    id: "", code: "", name: "", category: "other", sortOrder: 60, isTerminal: false, isActive: true
  });
  const [mapping, setMapping] = useState<DemoLifecycleMapping>({
    id: "", integrationId: data.integrations[0]?.id ?? "", externalStatus: "", lifecycleStageId: data.lifecycleStages[0]?.id ?? "", isActive: true
  });

  function saveIntegrationForm() {
    if (!integration.name.trim()) return;
    saveIntegration({
      ...integration,
      id: integration.id || makeId("int"),
      externalSystemLabel: integration.externalSystemLabel || integration.name,
    });
    setIntegration({ id: "", name: "", integrationType: "crm", status: "inactive", externalSystemLabel: "", notes: "" });
  }

  function saveStageForm() {
    if (!stage.name.trim() || !stage.code.trim()) return;
    saveLifecycleStage({ ...stage, id: stage.id || makeId("stage"), code: stage.code.trim().toLowerCase().replace(/\s+/g,"_") });
    setStage({ id: "", code: "", name: "", category: "other", sortOrder: 60, isTerminal: false, isActive: true });
  }

  function saveMappingForm() {
    if (!mapping.integrationId || !mapping.lifecycleStageId || !mapping.externalStatus.trim()) return;
    saveLifecycleMapping({ ...mapping, id: mapping.id || makeId("map"), externalStatus: mapping.externalStatus.trim() });
    setMapping({ id: "", integrationId: data.integrations[0]?.id ?? "", externalStatus: "", lifecycleStageId: data.lifecycleStages[0]?.id ?? "", isActive: true });
  }

  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Administration</div><h1>Lifecycle & Integrations</h1><p className="muted">Configure external systems, lifecycle stages, and status mappings.</p></div></div>
    <AdminNav />

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Integrations</div><h2>{integration.id ? "Edit integration" : "Add integration"}</h2>
        <label>Name<input value={integration.name} onChange={(e)=>setIntegration({...integration,name:e.target.value})} placeholder="CRM / Billing Platform" /></label>
        <label>Type<select value={integration.integrationType} onChange={(e)=>setIntegration({...integration,integrationType:e.target.value as DemoIntegration["integrationType"]})}>
          <option value="crm">CRM</option><option value="order_system">Order system</option><option value="billing">Billing</option><option value="data_warehouse">Data warehouse</option><option value="webhook">Webhook</option><option value="other">Other</option>
        </select></label>
        <label>Display label<input value={integration.externalSystemLabel} onChange={(e)=>setIntegration({...integration,externalSystemLabel:e.target.value})} /></label>
        <label>Status<select value={integration.status} onChange={(e)=>setIntegration({...integration,status:e.target.value as DemoIntegration["status"]})}><option value="active">Active</option><option value="inactive">Inactive</option><option value="error">Error</option></select></label>
        <label>Notes<textarea value={integration.notes ?? ""} onChange={(e)=>setIntegration({...integration,notes:e.target.value})} /></label>
        <div className="row-actions"><button className="button" onClick={saveIntegrationForm}>Save integration</button>{integration.id&&<button className="button secondary" onClick={()=>setIntegration({id:"",name:"",integrationType:"crm",status:"inactive",externalSystemLabel:"",notes:""})}>Cancel</button>}</div>
      </section>

      <section className="card table-card">
        <div className="eyebrow">Configured systems</div><h2>Integrations</h2>
        <table><thead><tr><th>Name</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>
          {data.integrations.map((row)=><tr key={row.id}><td>{row.name}</td><td>{row.integrationType.replace("_"," ")}</td><td><span className={`badge ${row.status==="active"?"success":"neutral"}`}>{row.status}</span></td><td className="row-actions"><button className="button-link" onClick={()=>setIntegration(row)}>Edit</button><button className="button-link danger" onClick={()=>deleteIntegration(row.id)}>Delete</button></td></tr>)}
        </tbody></table>
      </section>
    </div>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Lifecycle Model</div><h2>{stage.id ? "Edit stage" : "Add stage"}</h2>
        <label>Name<input value={stage.name} onChange={(e)=>setStage({...stage,name:e.target.value})} /></label>
        <label>Code<input value={stage.code} onChange={(e)=>setStage({...stage,code:e.target.value})} placeholder="installed" /></label>
        <label>Category<select value={stage.category} onChange={(e)=>setStage({...stage,category:e.target.value as DemoLifecycleStage["category"]})}>
          {["submitted","accepted","scheduled","installed","activated","cancelled","exception","closed","other"].map((v)=><option key={v} value={v}>{v}</option>)}
        </select></label>
        <label>Sort order<input type="number" value={stage.sortOrder} onChange={(e)=>setStage({...stage,sortOrder:Number(e.target.value)})} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={stage.isTerminal} onChange={(e)=>setStage({...stage,isTerminal:e.target.checked})} />Terminal stage</label>
        <label className="checkbox-row"><input type="checkbox" checked={stage.isActive} onChange={(e)=>setStage({...stage,isActive:e.target.checked})} />Active</label>
        <div className="row-actions"><button className="button" onClick={saveStageForm}>Save stage</button>{stage.id&&<button className="button secondary" onClick={()=>setStage({id:"",code:"",name:"",category:"other",sortOrder:60,isTerminal:false,isActive:true})}>Cancel</button>}</div>
      </section>

      <section className="card table-card">
        <div className="eyebrow">Stages</div><h2>Lifecycle stages</h2>
        <table><thead><tr><th>Order</th><th>Name</th><th>Category</th><th>Terminal</th><th></th></tr></thead><tbody>
          {[...data.lifecycleStages].sort((a,b)=>a.sortOrder-b.sortOrder).map((row)=><tr key={row.id}><td>{row.sortOrder}</td><td>{row.name}<div className="muted small">{row.code}</div></td><td>{row.category}</td><td>{row.isTerminal?"Yes":"No"}</td><td className="row-actions"><button className="button-link" onClick={()=>setStage(row)}>Edit</button><button className="button-link danger" onClick={()=>deleteLifecycleStage(row.id)}>Delete</button></td></tr>)}
        </tbody></table>
      </section>
    </div>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Status Mapping</div><h2>{mapping.id ? "Edit mapping" : "Add mapping"}</h2>
        <label>Integration<select value={mapping.integrationId} onChange={(e)=>setMapping({...mapping,integrationId:e.target.value})}>{data.integrations.map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label>External status<input value={mapping.externalStatus} onChange={(e)=>setMapping({...mapping,externalStatus:e.target.value})} placeholder="INSTALLED" /></label>
        <label>Lifecycle stage<select value={mapping.lifecycleStageId} onChange={(e)=>setMapping({...mapping,lifecycleStageId:e.target.value})}>{[...data.lifecycleStages].sort((a,b)=>a.sortOrder-b.sortOrder).map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="checkbox-row"><input type="checkbox" checked={mapping.isActive} onChange={(e)=>setMapping({...mapping,isActive:e.target.checked})} />Active</label>
        <div className="row-actions"><button className="button" onClick={saveMappingForm}>Save mapping</button>{mapping.id&&<button className="button secondary" onClick={()=>setMapping({id:"",integrationId:data.integrations[0]?.id??"",externalStatus:"",lifecycleStageId:data.lifecycleStages[0]?.id??"",isActive:true})}>Cancel</button>}</div>
      </section>

      <section className="card table-card">
        <div className="eyebrow">Mappings</div><h2>External → lifecycle</h2>
        <table><thead><tr><th>Integration</th><th>External status</th><th>Maps to</th><th></th></tr></thead><tbody>
          {data.lifecycleMappings.map((row)=>{
            const integrationRow=data.integrations.find((item)=>item.id===row.integrationId);
            const stageRow=data.lifecycleStages.find((item)=>item.id===row.lifecycleStageId);
            return <tr key={row.id}><td>{integrationRow?.name??"Unknown"}</td><td><span className="mono small">{row.externalStatus}</span></td><td>{stageRow?.name??"Unknown"}</td><td className="row-actions"><button className="button-link" onClick={()=>setMapping(row)}>Edit</button><button className="button-link danger" onClick={()=>deleteLifecycleMapping(row.id)}>Delete</button></td></tr>;
          })}
        </tbody></table>
      </section>
    </div>
  </AppShell>;
}
