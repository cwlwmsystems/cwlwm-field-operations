"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode
} from "react";
import {createClient} from "@/lib/supabase/browser";
import {useAuth} from "@/lib/auth/AuthProvider";
import {useSupabaseSales} from "@/lib/sales/SupabaseSalesProvider";
import {useSupabaseLifecycle} from "@/lib/lifecycle/SupabaseLifecycleProvider";
import type {
  DemoInvoiceAdjustment, DemoInvoiceBatch, DemoInvoiceSettings
} from "@/lib/store/platformStore";

export type InvoiceItemRow = {
  id:string;
  batchId:string;
  orderId:string;
  description:string;
  quantity:number;
  unitAmount:number;
  lineAmount:number;
  metadata:Record<string,unknown>;
};

type Ctx = {
  loading:boolean;
  error:string|null;
  settings:DemoInvoiceSettings|null;
  batches:DemoInvoiceBatch[];
  items:InvoiceItemRow[];
  adjustments:DemoInvoiceAdjustment[];
  eligibleOrderIds:string[];
  refresh:()=>Promise<void>;
  createBatch:(orderIds:string[])=>Promise<DemoInvoiceBatch>;
  addAdjustment:(batchId:string,description:string,amount:number,type?:string)=>Promise<void>;
  removeAdjustment:(id:string)=>Promise<void>;
  setBatchStatus:(id:string,status:"draft"|"finalized"|"exported"|"void")=>Promise<void>;
  getBatchTotal:(batchId:string)=>number;
};

const Context=createContext<Ctx|undefined>(undefined);

export function SupabaseFinanceProvider({children}:{children:ReactNode}){
  const {organization}=useAuth();
  const sales=useSupabaseSales();
  const lifecycle=useSupabaseLifecycle();

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [settings,setSettings]=useState<DemoInvoiceSettings|null>(null);
  const [batches,setBatches]=useState<DemoInvoiceBatch[]>([]);
  const [items,setItems]=useState<InvoiceItemRow[]>([]);
  const [adjustments,setAdjustments]=useState<DemoInvoiceAdjustment[]>([]);

  const orgId=organization?.id;

  const refresh=useCallback(async()=>{
    if(!orgId){setLoading(false);return;}
    setLoading(true);setError(null);
    const s=createClient();

    const [settingsRes,batchRes,itemRes,adjRes,currentRes]=await Promise.all([
      s.from("invoice_settings").select("*").eq("organization_id",orgId).maybeSingle(),
      s.from("invoice_batches").select("*").eq("organization_id",orgId).order("created_at",{ascending:false}),
      s.from("invoice_items").select("*").eq("organization_id",orgId).order("created_at"),
      s.from("adjustments").select("*").eq("organization_id",orgId).order("created_at"),
      s.from("order_lifecycle_current").select("order_id,lifecycle_category").eq("organization_id",orgId)
    ]);

    const firstError=[settingsRes.error,batchRes.error,itemRes.error,adjRes.error,currentRes.error].find(Boolean);
    if(firstError){setError(firstError.message);setLoading(false);return;}

    if(settingsRes.data){
      const x=settingsRes.data;
      setSettings({
        id:x.id,
        prefix:x.prefix,
        nextNumber:x.next_number,
        numberPadding:x.padding,
        defaultCurrency:x.currency,
        defaultItemDescription:"Order",
        isActive:true
      });
    }else{
      setSettings(null);
    }

    setBatches((batchRes.data??[]).map(x=>({
      id:x.id,
      invoiceNumber:x.invoice_number,
      status:x.status,
      orderIds:[],
      subtotal:Number(x.subtotal??0),
      adjustmentsTotal:Number(x.adjustments_total??0),
      total:Number(x.total??0),
      currency:x.currency,
      generatedAt:x.finalized_at??undefined,
      sentAt:x.exported_at??undefined,
      createdAt:x.created_at,
      updatedAt:x.exported_at??x.finalized_at??x.created_at
    })));

    setItems((itemRes.data??[]).map(x=>({
      id:x.id,
      batchId:x.invoice_batch_id,
      orderId:x.order_id,
      description:x.description,
      quantity:1,
      unitAmount:Number(x.amount??0),
      lineAmount:Number(x.amount??0),
      metadata:x.metadata??{}
    })));

    setAdjustments((adjRes.data??[]).map(x=>({
      id:x.id,
      invoiceBatchId:x.invoice_batch_id??"",
      type:x.adjustment_type,
      description:x.reason??"",
      amount:(x.adjustment_type==="credit"||x.adjustment_type==="clawback"||x.adjustment_type==="void"?-1:1)*Number(x.amount??0),
      createdAt:x.created_at
    })));

    setLoading(false);
  },[orgId]);

  useEffect(()=>{refresh()},[refresh]);

  const eligibleOrderIds=useMemo(()=>{
    const alreadyInBatch=new Set(
      items.map(x=>x.orderId)
    );
    return sales.orders
      .filter(order=>{
        const stage=lifecycle.getCurrentStage(order.id);
        return stage && ["installed","activated"].includes(stage.category) && !alreadyInBatch.has(order.id);
      })
      .map(x=>x.id);
  },[sales.orders,lifecycle.events,lifecycle.stages,items]);

  async function createBatch(orderIds:string[]){
    if(!orgId)throw new Error("No active organization.");
    if(orderIds.length===0)throw new Error("Select at least one eligible order.");
    const {data,error}=await createClient().rpc("create_invoice_batch",{
      p_organization_id:orgId,
      p_order_ids:orderIds
    });
    if(error)throw new Error(error.message);
    await refresh();
    return {
      id:data.id,
      invoiceNumber:data.invoice_number,
      status:data.status,
      orderIds,
      subtotal:Number(data.subtotal??0),
      adjustmentsTotal:Number(data.adjustments_total??0),
      total:Number(data.total??0),
      currency:data.currency,
      generatedAt:data.generated_at??undefined,
      sentAt:data.sent_at??undefined,
      createdAt:data.created_at,
      updatedAt:data.updated_at
    };
  }

  async function addAdjustment(batchId:string,description:string,amount:number,type="other"){
    if(!orgId)throw new Error("No active organization.");
    const batchItems=items.filter(x=>x.batchId===batchId);
    const firstOrderId=batchItems[0]?.orderId;
    if(!firstOrderId)throw new Error("Invoice batch has no orders.");
    const normalizedType=amount<0?"credit":(type==="manual"?"other":type);
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

  async function setBatchStatus(id:string,status:"draft"|"finalized"|"exported"|"void"){
    if(!orgId)throw new Error("No active organization.");
    const {error}=await createClient().rpc("set_invoice_batch_status",{
      p_organization_id:orgId,
      p_invoice_batch_id:id,
      p_status:status
    });
    if(error)throw new Error(error.message);
    await refresh();
  }

  function getBatchTotal(batchId:string){
    const lineTotal=items.filter(x=>x.batchId===batchId).reduce((sum,x)=>sum+x.lineAmount,0);
    const adjustmentTotal=adjustments.filter(x=>x.invoiceBatchId===batchId).reduce((sum,x)=>sum+x.amount,0);
    return lineTotal+adjustmentTotal;
  }

  const value=useMemo<Ctx>(()=>({
    loading,error,settings,batches,items,adjustments,eligibleOrderIds,refresh,
    createBatch,addAdjustment,removeAdjustment,setBatchStatus,getBatchTotal
  }),[loading,error,settings,batches,items,adjustments,eligibleOrderIds,refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSupabaseFinance(){
  const value=useContext(Context);
  if(!value)throw new Error("useSupabaseFinance must be within SupabaseFinanceProvider");
  return value;
}
