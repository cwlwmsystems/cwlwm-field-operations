"use client";
import { FormEvent,useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import type { DemoTeam } from "@/lib/mock/data";
const blank:DemoTeam={id:"",name:"",type:"internal",reps:0,status:"active"};
export default function Page(){
 const {teams,reps,saveTeam,deleteTeam,loading,error}=useSupabaseConfig();
 const [editing,setEditing]=useState<DemoTeam>(blank); const [message,setMessage]=useState("");
 async function submit(e:FormEvent){e.preventDefault();try{await saveTeam(editing);setEditing(blank);setMessage("Team saved to Supabase.");}catch(err){setMessage(err instanceof Error?err.message:"Save failed.");}}
 return <AppShell><div className="eyebrow">Admin · Supabase</div><h1>Teams</h1><AdminNav/>{error&&<div className="error-banner"><strong>Configuration error</strong><span>{error}</span></div>}<div className="admin-split"><form className="card admin-form single" onSubmit={submit}><h2>{editing.id?"Edit Team":"Create Team"}</h2><label>Name<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} required/></label><label>Type<select value={editing.type} onChange={e=>setEditing({...editing,type:e.target.value as DemoTeam["type"]})}><option value="internal">Internal</option><option value="vendor">Vendor / Partner</option></select></label><label>Status<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as DemoTeam["status"]})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>{message&&<div className="form-message">{message}</div>}<div className="form-actions"><button className="button">Save Team</button>{editing.id&&<button type="button" className="button secondary" onClick={()=>setEditing(blank)}>Cancel</button>}</div></form><div className="card table-card">{loading?<div className="empty-state">Loading teams…</div>:<table><thead><tr><th>Team</th><th>Type</th><th>Reps</th><th>Status</th><th></th></tr></thead><tbody>{teams.map(t=><tr key={t.id}><td><strong>{t.name}</strong></td><td><span className="badge">{t.type}</span></td><td>{reps.filter(r=>r.teamId===t.id).length}</td><td><span className="badge">{t.status}</span></td><td className="row-actions"><button onClick={()=>setEditing(t)}>Edit</button><button className="danger-link" onClick={async()=>{if(confirm(`Delete ${t.name}?`))await deleteTeam(t.id)}}>Delete</button></td></tr>)}</tbody></table>}</div></div></AppShell>
}
