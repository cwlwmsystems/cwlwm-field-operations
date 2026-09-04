"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode
} from "react";
import { createClient } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import type {
  DemoAppointment, DemoSchedulingOverride, DemoSchedulingPolicy
} from "@/lib/store/platformStore";

export type SlotAvailability = {
  key:string;
  time:string;
  capacity:number;
  booked:number;
  remaining:number;
  available:boolean;
};

type PolicyInput = Omit<DemoSchedulingPolicy,"id"> & {id?:string};
type OverrideInput = Omit<DemoSchedulingOverride,"id"> & {id?:string};

type BookInput = {
  orderId?:string;
  salesAttemptId?:string;
  locationId:string;
  representativeId?:string;
  teamId?:string;
  territoryId:string;
  date:string;
  time:string;
  customerName:string;
  phone?:string;
  email?:string;
};

type Ctx = {
  loading:boolean;
  error:string|null;
  policies:DemoSchedulingPolicy[];
  overrides:DemoSchedulingOverride[];
  appointments:DemoAppointment[];
  refresh:()=>Promise<void>;
  getAvailability:(territoryId:string,date:string)=>Promise<SlotAvailability[]>;
  savePolicy:(item:PolicyInput)=>Promise<void>;
  deletePolicy:(id:string)=>Promise<void>;
  saveOverride:(item:OverrideInput)=>Promise<void>;
  deleteOverride:(id:string)=>Promise<void>;
  bookAppointment:(item:BookInput)=>Promise<DemoAppointment>;
  rescheduleAppointment:(id:string,date:string,time:string)=>Promise<void>;
  setAppointmentStatus:(id:string,status:"scheduled"|"completed"|"cancelled"|"no_show")=>Promise<void>;
};

const Context = createContext<Ctx|undefined>(undefined);

function to24(value:string){
  const m=value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if(!m) return value;
  let h=Number(m[1]); const min=m[2]; const ap=m[3]?.toUpperCase();
  if(ap==="PM" && h<12) h+=12;
  if(ap==="AM" && h===12) h=0;
  return `${String(h).padStart(2,"0")}:${min}:00`;
}
function displayTime(value:string){
  const [hh,mm]=value.slice(0,5).split(":").map(Number);
  const ap=hh>=12?"PM":"AM"; const h=hh%12||12;
  return `${h}:${String(mm).padStart(2,"0")} ${ap}`;
}
function mapAppointment(x:any):DemoAppointment{
  return {
    id:x.id,
    clientSubmissionId:x.id,
    orderId:x.order_id??undefined,
    locationId:x.location_id,
    representativeId:x.representative_id??"",
    territoryId:x.territory_id,
    teamId:x.team_id??"",
    date:x.service_date,
    time:displayTime(x.slot_time),
    status:x.status==="scheduled"?"booked":x.status,
    customerName:x.customer_name??"",
    phone:x.customer_phone??"",
    email:x.customer_email??"",
    notes:x.notes??"",
    createdAt:x.created_at,
    updatedAt:x.updated_at,
  };
}

export function SupabaseSchedulingProvider({children}:{children:ReactNode}){
  const {organization}=useAuth();
  const config=useSupabaseConfig();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [policies,setPolicies]=useState<DemoSchedulingPolicy[]>([]);
  const [overrides,setOverrides]=useState<DemoSchedulingOverride[]>([]);
  const [appointments,setAppointments]=useState<DemoAppointment[]>([]);
  const orgId=organization?.id;

  const refresh=useCallback(async()=>{
    if(!orgId){setLoading(false);return;}
    setLoading(true);setError(null);
    const s=createClient();
    const [p,o,a]=await Promise.all([
      s.from("scheduling_policies").select("*").eq("organization_id",orgId).order("created_at"),
      s.from("scheduling_overrides").select("*").eq("organization_id",orgId).order("service_date"),
      s.from("appointments").select("*").eq("organization_id",orgId).order("service_date").order("slot_time"),
    ]);
    const e=[p.error,o.error,a.error].find(Boolean);
    if(e){setError(e.message);setLoading(false);return;}

    setPolicies((p.data??[]).map(x=>({
      id:x.id,
      name:x.name,
      territoryId:x.territory_id,
      teamId:x.team_id??undefined,
      allowedWeekdays:x.allowed_weekdays??[],
      times:(x.slot_times??[]).map((t:string)=>displayTime(t)),
      defaultCapacity:x.default_capacity,
      minimumLeadHours:Number(x.minimum_lead_minutes??0)/60,
      isActive:x.is_active
    })));

    setOverrides((o.data??[]).map(x=>({
      id:x.id,
      territoryId:x.territory_id,
      date:x.service_date,
      time:x.slot_time?displayTime(x.slot_time):undefined,
      capacity:x.capacity??undefined,
      isBlackout:x.override_type==="blackout",
      note:x.reason??undefined
    })));

    setAppointments((a.data??[]).map(mapAppointment));
    setLoading(false);
  },[orgId]);

  useEffect(()=>{refresh()},[refresh]);

  async function getAvailability(territoryId:string,date:string){
    if(!orgId||!territoryId||!date)return [];
    const policy=policies.find(p=>p.territoryId===territoryId&&p.isActive);
    if(!policy)return [];
    const s=createClient();

    const rows=await Promise.all(policy.times.map(async(display)=>{
      const time24=to24(display);
      const [cap,booked]=await Promise.all([
        s.rpc("get_slot_capacity",{
          p_organization_id:orgId,
          p_territory_id:territoryId,
          p_service_date:date,
          p_slot_time:time24
        }),
        s.from("appointments")
          .select("id",{count:"exact",head:true})
          .eq("organization_id",orgId)
          .eq("territory_id",territoryId)
          .eq("service_date",date)
          .eq("slot_time",time24)
          .in("status",["scheduled","completed"])
      ]);
      if(cap.error)throw new Error(cap.error.message);
      if(booked.error)throw new Error(booked.error.message);
      const capacity=Number(cap.data??0), used=booked.count??0;
      return {
        key:`${territoryId}:${date}:${time24}`,
        time:display,
        capacity,
        booked:used,
        remaining:Math.max(0,capacity-used),
        available:capacity>used
      };
    }));
    return rows;
  }

  async function savePolicy(item:PolicyInput){
    if(!orgId)throw new Error("No active organization.");
    const s=createClient();
    const territory=config.territories.find(t=>t.id===item.territoryId);
    const payload={
      organization_id:orgId,
      territory_id:item.territoryId,
      team_id:item.teamId||territory?.teamId||null,
      name:item.name.trim(),
      timezone:organization?.timezone||"America/New_York",
      allowed_weekdays:item.allowedWeekdays,
      slot_times:item.times.map(to24),
      default_capacity:item.defaultCapacity,
      minimum_lead_minutes:Math.round(item.minimumLeadHours*60),
      is_active:item.isActive
    };
    const result=item.id
      ? await s.from("scheduling_policies").update(payload).eq("organization_id",orgId).eq("id",item.id)
      : await s.from("scheduling_policies").insert(payload);
    if(result.error)throw new Error(result.error.message);
    await refresh();
  }

  async function deletePolicy(id:string){
    if(!orgId)return;
    const {error}=await createClient().from("scheduling_policies").delete().eq("organization_id",orgId).eq("id",id);
    if(error)throw new Error(error.message); await refresh();
  }

  async function saveOverride(item:OverrideInput){
    if(!orgId)throw new Error("No active organization.");
    const s=createClient();
    const payload={
      organization_id:orgId,
      territory_id:item.territoryId,
      service_date:item.date,
      slot_time:item.time?to24(item.time):null,
      override_type:item.isBlackout?"blackout":"capacity",
      capacity:item.isBlackout?null:item.capacity??0,
      reason:item.note||null
    };
    const result=item.id
      ? await s.from("scheduling_overrides").update(payload).eq("organization_id",orgId).eq("id",item.id)
      : await s.from("scheduling_overrides").insert(payload);
    if(result.error)throw new Error(result.error.message);
    await refresh();
  }

  async function deleteOverride(id:string){
    if(!orgId)return;
    const {error}=await createClient().from("scheduling_overrides").delete().eq("organization_id",orgId).eq("id",id);
    if(error)throw new Error(error.message); await refresh();
  }

  async function bookAppointment(item:BookInput){
    if(!orgId)throw new Error("No active organization.");
    const s=createClient();
    const result=await s.rpc("book_appointment",{
      p_organization_id:orgId,
      p_order_id:item.orderId||null,
      p_sales_attempt_id:item.salesAttemptId||null,
      p_location_id:item.locationId,
      p_representative_id:item.representativeId||null,
      p_team_id:item.teamId||null,
      p_territory_id:item.territoryId,
      p_service_date:item.date,
      p_slot_time:to24(item.time),
      p_customer_name:item.customerName,
      p_customer_phone:item.phone||null,
      p_customer_email:item.email||null
    });
    if(result.error)throw new Error(result.error.message);
    await refresh();
    return mapAppointment(result.data);
  }

  async function rescheduleAppointment(id:string,date:string,time:string){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("reschedule_appointment",{
      p_organization_id:orgId,
      p_appointment_id:id,
      p_service_date:date,
      p_slot_time:to24(time)
    });
    if(error)throw new Error(error.message); await refresh();
  }

  async function setAppointmentStatus(id:string,status:"scheduled"|"completed"|"cancelled"|"no_show"){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("set_appointment_status",{
      p_organization_id:orgId,
      p_appointment_id:id,
      p_status:status
    });
    if(error)throw new Error(error.message); await refresh();
  }

  const value=useMemo<Ctx>(()=>({
    loading,error,policies,overrides,appointments,refresh,getAvailability,
    savePolicy,deletePolicy,saveOverride,deleteOverride,bookAppointment,
    rescheduleAppointment,setAppointmentStatus
  }),[loading,error,policies,overrides,appointments,refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSupabaseScheduling(){
  const value=useContext(Context);
  if(!value)throw new Error("useSupabaseScheduling must be within SupabaseSchedulingProvider");
  return value;
}
