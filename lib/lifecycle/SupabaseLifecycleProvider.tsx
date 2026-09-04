"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode
} from "react";
import { createClient } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import type {
  DemoExternalRecord,
  DemoIntegration,
  DemoLifecycleEvent,
  DemoLifecycleException,
  DemoLifecycleMapping,
  DemoLifecycleStage
} from "@/lib/store/platformStore";

type Ctx = {
  loading:boolean;
  error:string|null;
  stages:DemoLifecycleStage[];
  integrations:DemoIntegration[];
  mappings:DemoLifecycleMapping[];
  externalRecords:DemoExternalRecord[];
  events:DemoLifecycleEvent[];
  exceptions:DemoLifecycleException[];
  refresh:()=>Promise<void>;
  getCurrentStage:(orderId:string)=>DemoLifecycleStage|undefined;
  getOrderEvents:(orderId:string)=>DemoLifecycleEvent[];
  recordStage:(orderId:string,stageId:string,detail?:string)=>Promise<void>;
  resolveException:(id:string,status:"resolved"|"dismissed")=>Promise<void>;
};

const Context = createContext<Ctx|undefined>(undefined);

export function SupabaseLifecycleProvider({children}:{children:ReactNode}){
  const {organization}=useAuth();
  const sales=useSupabaseSales();
  const scheduling=useSupabaseScheduling();

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [stages,setStages]=useState<DemoLifecycleStage[]>([]);
  const [integrations,setIntegrations]=useState<DemoIntegration[]>([]);
  const [mappings,setMappings]=useState<DemoLifecycleMapping[]>([]);
  const [externalRecords,setExternalRecords]=useState<DemoExternalRecord[]>([]);
  const [events,setEvents]=useState<DemoLifecycleEvent[]>([]);
  const [exceptions,setExceptions]=useState<DemoLifecycleException[]>([]);

  const orgId=organization?.id;

  const refresh=useCallback(async()=>{
    if(!orgId){setLoading(false);return;}
    setLoading(true);setError(null);
    const s=createClient();

    const [st,integ,map,ext,ev,ex]=await Promise.all([
      s.from("lifecycle_stages").select("*").eq("organization_id",orgId).order("sort_order"),
      s.from("integrations").select("*").eq("organization_id",orgId).order("name"),
      s.from("lifecycle_mappings").select("*").eq("organization_id",orgId),
      s.from("external_records").select("*").eq("organization_id",orgId),
      s.from("lifecycle_events").select("*").eq("organization_id",orgId).order("occurred_at",{ascending:false}),
      s.from("lifecycle_exceptions").select("*").eq("organization_id",orgId).order("created_at",{ascending:false}),
    ]);

    const firstError=[st.error,integ.error,map.error,ext.error,ev.error,ex.error].find(Boolean);
    if(firstError){
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setStages((st.data??[]).map(x=>({
      id:x.id,
      code:x.code,
      name:x.name,
      category:x.category,
      sortOrder:x.sort_order,
      isTerminal:x.is_terminal,
      isActive:x.is_active
    })));

    setIntegrations((integ.data??[]).map(x=>({
      id:x.id,
      name:x.name,
      integrationType:x.integration_type,
      status:x.status,
      externalSystemLabel:x.name,
      notes:(x.config as any)?.notes??undefined
    })));

    setMappings((map.data??[]).map(x=>({
      id:x.id,
      integrationId:x.integration_id,
      externalStatus:x.external_status,
      lifecycleStageId:x.lifecycle_stage_id,
      isActive:x.is_active
    })));

    setExternalRecords((ext.data??[])
      .filter(x=>x.entity_type==="order")
      .map(x=>({
        id:x.id,
        integrationId:x.integration_id,
        entityType:"order" as const,
        internalEntityId:x.internal_entity_id,
        externalId:x.external_id,
        externalStatus:x.external_status??undefined,
        lastSyncedAt:x.last_synced_at??undefined
      })));

    setEvents((ev.data??[]).map(x=>({
      id:x.id,
      orderId:x.order_id,
      integrationId:x.integration_id??undefined,
      lifecycleStageId:x.lifecycle_stage_id,
      externalStatus:x.external_status??undefined,
      externalEventId:x.external_event_id??undefined,
      source:x.source,
      detail:x.detail??undefined,
      occurredAt:x.occurred_at,
      createdAt:x.created_at
    })));

    setExceptions((ex.data??[]).map(x=>({
      id:x.id,
      orderId:x.order_id,
      integrationId:x.integration_id??undefined,
      exceptionType:x.exception_type,
      message:x.message,
      externalStatus:x.external_status??undefined,
      status:x.status,
      createdAt:x.created_at,
      resolvedAt:x.resolved_at??undefined
    })));

    setLoading(false);
  },[orgId]);

  useEffect(()=>{refresh()},[refresh]);

  function getOrderEvents(orderId:string){
    return events
      .filter(x=>x.orderId===orderId)
      .sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
  }

  function getCurrentStage(orderId:string){
    const event=getOrderEvents(orderId)[0];
    return event?stages.find(x=>x.id===event.lifecycleStageId):undefined;
  }

  async function recordStage(orderId:string,stageId:string,detail?:string){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("record_lifecycle_stage",{
      p_organization_id:orgId,
      p_order_id:orderId,
      p_lifecycle_stage_id:stageId,
      p_detail:detail||null,
      p_occurred_at:new Date().toISOString()
    });
    if(error)throw new Error(error.message);

    // Lifecycle transitions can change appointment/order state.
    await Promise.all([refresh(),scheduling.refresh(),sales.refresh()]);
  }

  async function resolveException(id:string,status:"resolved"|"dismissed"){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("resolve_lifecycle_exception",{
      p_organization_id:orgId,
      p_exception_id:id,
      p_status:status
    });
    if(error)throw new Error(error.message);
    await refresh();
  }

  const value=useMemo<Ctx>(()=>({
    loading,error,stages,integrations,mappings,externalRecords,events,exceptions,
    refresh,getCurrentStage,getOrderEvents,recordStage,resolveException
  }),[loading,error,stages,integrations,mappings,externalRecords,events,exceptions,refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSupabaseLifecycle(){
  const value=useContext(Context);
  if(!value)throw new Error("useSupabaseLifecycle must be within SupabaseLifecycleProvider");
  return value;
}
