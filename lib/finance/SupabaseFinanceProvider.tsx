"use client";

import {
  createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode
} from "react";
import {createClient} from "@/lib/supabase/browser";
import {useAuth} from "@/lib/auth/AuthProvider";
import {useSupabaseSales} from "@/lib/sales/SupabaseSalesProvider";
import {useSupabaseLifecycle} from "@/lib/lifecycle/SupabaseLifecycleProvider";

export type FinanceSettings = {
  prefix:string;
  nextNumber:number;
  padding:number;
  includeYear:boolean;
  currency:string;
};

export type FinanceBatch = {
  id:string;
  invoiceNumber:string;
  teamId?:string;
  status:"draft"|"finalized"|"exported"|"void";
  subtotal:number;
  adjustmentsTotal:number;
  total:number;
  notes?:string;
  createdAt:string;
  finalizedAt?:string;
  exportedAt?:string;
};

export type InvoiceItemRow = {
  id:string;
  batchId:string;
  orderId:string;
  description:string;
  amount:number;
  metadata:Record<string,unknown>;
};

export type FinanceAdjustment = {
  id:string;
  orderId:string;
  invoiceBatchId?:string;
  adjustmentType:"clawback"|"credit"|"debit"|"void"|"other";
  reason:string;
  amount:number;
  signedAmount:number;
  status:"open"|"applied"|"reversed";
  createdAt:string;
  appliedAt?:string;
  reversedAt?:string;
};

export type InvoiceExportRow = {
  id:string;
  batchId:string;
  format:"pdf"|"csv";
  filename:string;
  exportedBy?:string;
  exportedAt:string;
};

type Ctx = {
  loading:boolean;
  error:string|null;
  settings:FinanceSettings|null;
  batches:FinanceBatch[];
  items:InvoiceItemRow[];
  adjustments:FinanceAdjustment[];
  exports:InvoiceExportRow[];
  eligibleOrderIds:string[];
  refresh:()=>Promise<void>;
  saveSettings:(input:FinanceSettings)=>Promise<void>;
  createBatch:(orderIds:string[])=>Promise<FinanceBatch>;
  addAdjustment:(batchId:string,description:string,amount:number,type?:FinanceAdjustment["adjustmentType"])=>Promise<void>;
  removeAdjustment:(id:string)=>Promise<void>;
  setBatchStatus:(id:string,status:FinanceBatch["status"])=>Promise<void>;
  recordExport:(batchId:string,format:"pdf"|"csv",filename:string)=>Promise<void>;
  getBatchTotal:(batchId:string)=>number;
};

const Context=createContext<Ctx|undefined>(undefined);

export function SupabaseFinanceProvider({children}:{children:ReactNode}){
  const {organization}=useAuth();
  const sales=useSupabaseSales();
  const lifecycle=useSupabaseLifecycle();

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [settings,setSettings]=useState<FinanceSettings|null>(null);
  const [batches,setBatches]=useState<FinanceBatch[]>([]);
  const [items,setItems]=useState<InvoiceItemRow[]>([]);
  const [adjustments,setAdjustments]=useState<FinanceAdjustment[]>([]);
  const [exports,setExports]=useState<InvoiceExportRow[]>([]);

  const orgId=organization?.id;

  const refresh=useCallback(async()=>{
    if(!orgId){setLoading(false);return;}
    setLoading(true);setError(null);
    const s=createClient();

    const [settingsRes,batchRes,itemRes,adjRes,exportRes]=await Promise.all([
      s.from("invoice_settings").select("*").eq("organization_id",orgId).maybeSingle(),
      s.from("invoice_batches").select("*").eq("organization_id",orgId).order("created_at",{ascending:false}),
      s.from("invoice_items").select("*").eq("organization_id",orgId).order("created_at"),
      s.from("adjustments").select("*").eq("organization_id",orgId).order("created_at"),
      s.from("invoice_exports").select("*").eq("organization_id",orgId).order("exported_at",{ascending:false})
    ]);

    const firstError=[settingsRes.error,batchRes.error,itemRes.error,adjRes.error,exportRes.error].find(Boolean);
    if(firstError){setError(firstError.message);setLoading(false);return;}

    const x=settingsRes.data;
    setSettings(x?{
      prefix:x.prefix,
      nextNumber:Number(x.next_number),
      padding:Number(x.padding),
      includeYear:Boolean(x.include_year),
      currency:x.currency
    }:null);

    setBatches((batchRes.data??[]).map(x=>({
      id:x.id,
      invoiceNumber:x.invoice_number,
      teamId:x.team_id??undefined,
      status:x.status,
      subtotal:Number(x.subtotal??0),
      adjustmentsTotal:Number(x.adjustments_total??0),
      total:Number(x.total??0),
      notes:x.notes??undefined,
      createdAt:x.created_at,
      finalizedAt:x.finalized_at??undefined,
      exportedAt:x.exported_at??undefined
    })));

    setItems((itemRes.data??[]).map(x=>({
      id:x.id,
      batchId:x.invoice_batch_id,
      orderId:x.order_id,
      description:x.description,
      amount:Number(x.amount??0),
      metadata:x.metadata??{}
    })));

    setAdjustments((adjRes.data??[]).map(x=>{
      const amount=Number(x.amount??0);
      const negative=["credit","clawback","void"].includes(x.adjustment_type);
      return {
        id:x.id,
        orderId:x.order_id,
        invoiceBatchId:x.invoice_batch_id??undefined,
        adjustmentType:x.adjustment_type,
        reason:x.reason,
        amount,
        signedAmount:negative?-amount:amount,
        status:x.status,
        createdAt:x.created_at,
        appliedAt:x.applied_at??undefined,
        reversedAt:x.reversed_at??undefined
      };
    }));

    setExports((exportRes.data??[]).map(x=>({
      id:x.id,
      batchId:x.invoice_batch_id,
      format:x.export_format,
      filename:x.filename,
      exportedBy:x.exported_by??undefined,
      exportedAt:x.exported_at
    })));

    setLoading(false);
  },[orgId]);

  useEffect(()=>{refresh()},[refresh]);

  const eligibleOrderIds=useMemo(()=>{
    const invoiced=new Set(items.map(x=>x.orderId));
    return sales.orders
      .filter(order=>{
        const stage=lifecycle.getCurrentStage(order.id);
        return stage && ["installed","activated"].includes(stage.category) && !invoiced.has(order.id);
      })
      .map(x=>x.id);
  },[sales.orders,lifecycle.events,lifecycle.stages,items]);


  async function saveSettings(input:FinanceSettings){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().from("invoice_settings").upsert({
      organization_id:orgId,
      prefix:input.prefix.trim()||"INV",
      next_number:Math.max(1,Math.floor(input.nextNumber)),
      padding:Math.min(12,Math.max(1,Math.floor(input.padding))),
      include_year:input.includeYear,
      currency:input.currency.trim().toUpperCase()||"USD",
      updated_at:new Date().toISOString()
    },{onConflict:"organization_id"});
    if(error)throw new Error(error.message);
    await refresh();
  }

  async function createBatch(orderIds:string[]){
    if(!orgId)throw new Error("No active organization.");
    if(!orderIds.length)throw new Error("Select at least one eligible order.");
    const {data,error}=await createClient().rpc("create_invoice_batch",{
      p_organization_id:orgId,
      p_order_ids:orderIds,
      p_team_id:null,
      p_notes:null
    });
    if(error)throw new Error(error.message);
    await refresh();
    return {
      id:data.id,invoiceNumber:data.invoice_number,teamId:data.team_id??undefined,status:data.status,
      subtotal:Number(data.subtotal??0),adjustmentsTotal:Number(data.adjustments_total??0),
      total:Number(data.total??0),notes:data.notes??undefined,createdAt:data.created_at,
      finalizedAt:data.finalized_at??undefined,exportedAt:data.exported_at??undefined
    };
  }

  async function addAdjustment(
    batchId:string,
    description:string,
    amount:number,
    type:FinanceAdjustment["adjustmentType"]="other"
  ){
    if(!orgId)throw new Error("No active organization.");
    const firstOrderId=items.find(x=>x.batchId===batchId)?.orderId;
    if(!firstOrderId)throw new Error("Invoice batch has no orders.");
    const normalizedType=amount<0?"credit":type;
    const {error}=await createClient().rpc("add_invoice_adjustment",{
      p_organization_id:orgId,
      p_invoice_batch_id:batchId,
      p_order_id:firstOrderId,
      p_description:description,
      p_amount:Math.abs(amount),
      p_adjustment_type:normalizedType
    });
    if(error)throw new Error(error.message);
    await refresh();
  }

  async function removeAdjustment(id:string){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("remove_invoice_adjustment",{
      p_organization_id:orgId,
      p_adjustment_id:id
    });
    if(error)throw new Error(error.message);
    await refresh();
  }

  async function setBatchStatus(id:string,status:FinanceBatch["status"]){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("set_invoice_batch_status",{
      p_organization_id:orgId,
      p_invoice_batch_id:id,
      p_status:status
    });
    if(error)throw new Error(error.message);
    await refresh();
  }

  async function recordExport(batchId:string,format:"pdf"|"csv",filename:string){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("record_invoice_export",{
      p_organization_id:orgId,
      p_invoice_batch_id:batchId,
      p_export_format:format,
      p_filename:filename,
      p_metadata:{source:"finance_ui"}
    });
    if(error)throw new Error(error.message);
    await refresh();
  }

  function getBatchTotal(batchId:string){
    const lineTotal=items.filter(x=>x.batchId===batchId).reduce((s,x)=>s+x.amount,0);
    const adjustmentTotal=adjustments
      .filter(x=>x.invoiceBatchId===batchId&&x.status==="applied")
      .reduce((s,x)=>s+x.signedAmount,0);
    return lineTotal+adjustmentTotal;
  }

  const value=useMemo<Ctx>(()=>({
    loading,error,settings,batches,items,adjustments,exports,eligibleOrderIds,refresh,
    saveSettings,createBatch,addAdjustment,removeAdjustment,setBatchStatus,recordExport,getBatchTotal
  }),[loading,error,settings,batches,items,adjustments,exports,eligibleOrderIds,refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSupabaseFinance(){
  const value=useContext(Context);
  if(!value)throw new Error("useSupabaseFinance must be within SupabaseFinanceProvider");
  return value;
}
