"use client";
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from "react";
import {createClient} from "@/lib/supabase/browser";
import {useAuth} from "@/lib/auth/AuthProvider";
import {useSupabaseConfig} from "@/lib/config/SupabaseConfigProvider";
import {useSupabaseTerritoryOps} from "@/lib/operations/SupabaseTerritoryOpsProvider";
import type {DemoOffer,DemoOrder,DemoProduct,DemoSalesAttempt} from "@/lib/store/platformStore";

type AttemptInput=Omit<DemoSalesAttempt,"id"|"startedAt"|"updatedAt"> & {id?:string};
type OrderInput={
 clientSubmissionId:string;salesAttemptId?:string;locationId:string;representativeId:string;
 teamId?:string;territoryId?:string;firstName:string;lastName:string;email:string;phone:string;
 productId:string;offerId:string;notes?:string;installDate?:string;installTime?:string;
};
type Ctx={loading:boolean;error:string|null;products:DemoProduct[];offers:DemoOffer[];attempts:DemoSalesAttempt[];orders:DemoOrder[];
 refresh:()=>Promise<void>;saveAttempt:(x:AttemptInput)=>Promise<DemoSalesAttempt>;abandonAttempt:(id:string)=>Promise<void>;
 submitOrder:(x:OrderInput)=>Promise<DemoOrder>;reviewOrder:(id:string,status:"approved"|"flagged",note?:string)=>Promise<void>;
};
const Context=createContext<Ctx|undefined>(undefined);

export function SupabaseSalesProvider({children}:{children:ReactNode}){
 const {organization}=useAuth(); const config=useSupabaseConfig(); const territoryOps=useSupabaseTerritoryOps();
 const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 const [products,setProducts]=useState<DemoProduct[]>([]),[offers,setOffers]=useState<DemoOffer[]>([]);
 const [attempts,setAttempts]=useState<DemoSalesAttempt[]>([]),[orders,setOrders]=useState<DemoOrder[]>([]);
 const orgId=organization?.id;

 const refresh=useCallback(async()=>{
  if(!orgId){setLoading(false);return} setLoading(true);setError(null); const s=createClient();
  const [p,o,a,r]=await Promise.all([
   s.from("products").select("*").eq("organization_id",orgId).order("name"),
   s.from("offers").select("*").eq("organization_id",orgId).order("name"),
   s.from("sales_attempts").select("*").eq("organization_id",orgId).order("updated_at",{ascending:false}),
   s.from("orders").select("*").eq("organization_id",orgId).order("submitted_at",{ascending:false})
  ]);
  const e=[p.error,o.error,a.error,r.error].find(Boolean); if(e){setError(e.message);setLoading(false);return}
  setProducts((p.data??[]).map(x=>({id:x.id,code:x.code,name:x.name,category:x.category??"",serviceLevel:x.service_level??"",basePrice:Number(x.base_recurring_price??0),isActive:x.is_active})));
  setOffers((o.data??[]).map(x=>({id:x.id,code:x.code,name:x.name,productId:x.product_id,badge:(x.terms as any)?.badge??"",disclosure:(x.terms as any)?.disclosure??"",isActive:x.is_active,phases:(x.terms as any)?.phases??[{label:x.name,months:x.term_months?`${x.term_months} months`:"Ongoing",price:Number(x.recurring_price??0)}]})));
  setAttempts((a.data??[]).map(mapAttempt));
  setOrders((r.data??[]).map(x=>({id:x.id,clientSubmissionId:x.client_submission_id,locationId:x.location_id,representativeId:x.representative_id??"",salesAttemptId:x.sales_attempt_id??undefined,customerName:`${x.customer_first_name} ${x.customer_last_name}`.trim(),phone:x.customer_phone??"",email:x.customer_email??"",productId:x.product_id??"",offerId:x.offer_id??"",productNameSnapshot:(x.product_snapshot as any)?.name??"Product",offerNameSnapshot:(x.offer_snapshot as any)?.name??"Offer",pricingSnapshot:{phases:(x.offer_snapshot as any)?.terms?.phases??[{label:(x.offer_snapshot as any)?.name??"Offer",months:(x.offer_snapshot as any)?.term_months?`${(x.offer_snapshot as any).term_months} months`:"Ongoing",price:Number(x.recurring_price??0)}]},installDate:(x.metadata as any)?.installDate??"",installTime:(x.metadata as any)?.installTime??"",notes:(x.metadata as any)?.notes??"",orderStatus:x.status==="cancelled"?"cancelled":x.status==="submitted"?"submitted":"accepted",reviewStatus:x.review_status==="flagged"?"needs_attention":x.review_status,reviewNote:(x.metadata as any)?.reviewNote??undefined,createdAt:x.submitted_at,updatedAt:x.updated_at})));
  setLoading(false);
 },[orgId]);
 useEffect(()=>{refresh()},[refresh]);

 function mapAttempt(row:any):DemoSalesAttempt{
  return {
   id:row.id,clientAttemptId:row.client_attempt_id,locationId:row.location_id,
   representativeId:row.representative_id??"",firstName:row.customer_first_name??"",
   lastName:row.customer_last_name??"",phone:row.customer_phone??"",email:row.customer_email??"",
   notes:(row.metadata as any)?.notes??"",productId:row.product_id??undefined,offerId:row.offer_id??undefined,
   installDate:row.appointment_date??undefined,installTime:row.appointment_time?.slice(0,5)??undefined,
   progressStep:row.progress_step,progressStage:row.progress_stage??"",
   status:row.status==="cancelled"?"abandoned":row.status,
   startedAt:row.created_at,updatedAt:row.updated_at,convertedAt:row.converted_at??undefined
  };
 }


 async function syncLocationInteraction(input:{
  locationId:string;
  representativeId?:string;
  teamId?:string;
  territoryId?:string;
  dispositionId:string;
  clientSubmissionId:string;
  interactionType:"sales_attempt"|"sale";
  note?:string;
  followUpNeeded?:boolean;
  followUpAt?:string|null;
 }){
  if(!orgId) throw new Error("No active organization.");
  const sb=createClient();

  const existing=await sb.from("location_interactions")
   .select("id")
   .eq("organization_id",orgId)
   .eq("client_submission_id",input.clientSubmissionId)
   .maybeSingle();

  if(existing.error) throw new Error(existing.error.message);

  const payload={
   organization_id:orgId,
   location_id:input.locationId,
   representative_id:input.representativeId||null,
   territory_id:input.territoryId||null,
   team_id:input.teamId||null,
   disposition_id:input.dispositionId,
   interaction_type:input.interactionType,
   note:input.note||null,
   decision_maker_contacted:true,
   follow_up_needed:Boolean(input.followUpNeeded),
   follow_up_at:input.followUpAt||null,
   occurred_at:new Date().toISOString(),
   source_system:"sales",
   client_submission_id:input.clientSubmissionId,
   metadata:{source:"sales",interactionType:input.interactionType}
  };

  if(existing.data?.id){
   const updated=await sb.from("location_interactions")
    .update(payload)
    .eq("organization_id",orgId)
    .eq("id",existing.data.id)
    .select("id")
    .single();
   if(updated.error) throw new Error(updated.error.message);
  }else{
   const inserted=await sb.from("location_interactions").insert(payload).select("id").single();
   if(inserted.error) throw new Error(inserted.error.message);
  }

  const locationUpdate=await sb.from("locations")
   .update({
    current_disposition_id:input.dispositionId,
    current_representative_id:input.representativeId||null
   })
   .eq("organization_id",orgId)
   .eq("id",input.locationId)
   .select("id,current_disposition_id,current_representative_id")
   .single();

  if(locationUpdate.error) throw new Error(locationUpdate.error.message);

  if(
   locationUpdate.data.current_disposition_id!==input.dispositionId ||
   (input.representativeId && locationUpdate.data.current_representative_id!==input.representativeId)
  ){
   throw new Error("Location state did not match the sales interaction after save.");
  }
 }

 async function saveAttempt(x:AttemptInput){
  if(!orgId) throw new Error("No active organization.");
  const s=createClient();
  const loc=config.locations.find(l=>l.id===x.locationId);
  if(!loc) throw new Error("Location not found.");

  const savedAt=new Date().toISOString();
  const payload={
   organization_id:orgId,
   client_attempt_id:x.clientAttemptId,
   location_id:x.locationId,
   representative_id:x.representativeId||null,
   team_id:loc.teamId||null,
   territory_id:loc.territoryId||null,
   customer_first_name:x.firstName||null,
   customer_last_name:x.lastName||null,
   customer_email:x.email||null,
   customer_phone:x.phone||null,
   product_id:x.productId||null,
   offer_id:x.offerId||null,
   progress_step:x.progressStep,
   progress_stage:x.progressStage,
   status:x.status,
   appointment_date:x.installDate||null,
   appointment_time:x.installTime||null,
   last_saved_at:savedAt,
   metadata:{notes:x.notes??""}
  };

  let data:any;
  if(x.id){
   const result=await s.from("sales_attempts")
    .update(payload)
    .eq("organization_id",orgId)
    .eq("id",x.id)
    .select("*")
    .single();
   if(result.error) throw new Error(result.error.message);
   data=result.data;
  }else{
   const result=await s.from("sales_attempts")
    .upsert(payload,{onConflict:"organization_id,client_attempt_id"})
    .select("*")
    .single();
   if(result.error) throw new Error(result.error.message);
   data=result.data;
  }

  if(!data?.id) throw new Error("Supabase did not return the saved sales attempt.");

  const verify=await s.from("sales_attempts")
   .select("*")
   .eq("organization_id",orgId)
   .eq("id",data.id)
   .single();
  if(verify.error) throw new Error(`Save completed but verification failed: ${verify.error.message}`);

  const persisted=verify.data;
  const expectedNotes=x.notes??"";
  if(
   (persisted.customer_first_name??"")!==(x.firstName??"") ||
   (persisted.customer_last_name??"")!==(x.lastName??"") ||
   (persisted.customer_phone??"")!==(x.phone??"") ||
   (persisted.customer_email??"")!==(x.email??"") ||
   ((persisted.metadata as any)?.notes??"")!==expectedNotes ||
   persisted.progress_step!==x.progressStep
  ){
   throw new Error("Supabase returned the row, but the saved values did not match the form. The UI will not report this as synced.");
  }

  const mapped=mapAttempt(persisted);

  if(x.status==="in_progress"){
   const interested=config.dispositions.find(d=>d.code==="interested")
    ?? config.dispositions.find(d=>d.isActive!==false && d.marksContact && !d.marksSale);

   if(!interested) throw new Error("No active Interested/contact disposition is configured for sales attempts.");

   let followUpAt:string|null=null;
   if(interested.requiresFollowUp && interested.defaultFollowUpDays){
    const dt=new Date();
    dt.setDate(dt.getDate()+interested.defaultFollowUpDays);
    followUpAt=dt.toISOString();
   }

   await syncLocationInteraction({
    locationId:x.locationId,
    representativeId:x.representativeId||undefined,
    teamId:loc.teamId||undefined,
    territoryId:loc.territoryId||undefined,
    dispositionId:interested.id,
    clientSubmissionId:persisted.id,
    interactionType:"sales_attempt",
    note:x.notes?.trim() || "Sales attempt in progress.",
    followUpNeeded:interested.requiresFollowUp,
    followUpAt
   });
  }

  setAttempts(current=>{
   const exists=current.some(a=>a.id===mapped.id);
   const next=exists?current.map(a=>a.id===mapped.id?mapped:a):[mapped,...current];
   return next.sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  });

  await config.refresh();
  await territoryOps.refresh();
  return mapped;
 }
 async function abandonAttempt(id:string){const {error}=await createClient().from("sales_attempts").update({status:"abandoned",abandoned_at:new Date().toISOString()}).eq("id",id);if(error)throw new Error(error.message);await refresh()}
 async function submitOrder(x:OrderInput){
  if(!orgId)throw new Error("No active organization.");
  const sb=createClient();

  const {data,error}=await sb.rpc("submit_order",{
   p_organization_id:orgId,
   p_client_submission_id:x.clientSubmissionId,
   p_sales_attempt_id:x.salesAttemptId||null,
   p_location_id:x.locationId,
   p_representative_id:x.representativeId||null,
   p_team_id:x.teamId||null,
   p_territory_id:x.territoryId||null,
   p_customer_first_name:x.firstName,
   p_customer_last_name:x.lastName,
   p_customer_email:x.email||null,
   p_customer_phone:x.phone||null,
   p_product_id:x.productId,
   p_offer_id:x.offerId
  });
  if(error)throw new Error(error.message);

  const metaUpdate=await sb.from("orders")
   .update({metadata:{notes:x.notes??"",installDate:x.installDate??"",installTime:x.installTime??""}})
   .eq("organization_id",orgId)
   .eq("id",data.id)
   .select("id")
   .single();
  if(metaUpdate.error)throw new Error(metaUpdate.error.message);

  const saleDisposition=config.dispositions.find(d=>d.code==="sale")
   ?? config.dispositions.find(d=>d.isActive!==false && d.marksSale);

  if(!saleDisposition) throw new Error("No active Sale disposition is configured.");

  await syncLocationInteraction({
   locationId:x.locationId,
   representativeId:x.representativeId||undefined,
   teamId:x.teamId||undefined,
   territoryId:x.territoryId||undefined,
   dispositionId:saleDisposition.id,
   clientSubmissionId:data.id,
   interactionType:"sale",
   note:x.notes?.trim() || "Order submitted.",
   followUpNeeded:false,
   followUpAt:null
  });

  await config.refresh();
  await territoryOps.refresh();
  await refresh();

  const result=await sb.from("orders").select("*").eq("organization_id",orgId).eq("id",data.id).single();
  if(result.error)throw new Error(result.error.message);
  const row=result.data;

  return {
   id:row.id,
   clientSubmissionId:row.client_submission_id,
   locationId:row.location_id,
   representativeId:row.representative_id??"",
   salesAttemptId:row.sales_attempt_id??undefined,
   customerName:`${row.customer_first_name} ${row.customer_last_name}`.trim(),
   phone:row.customer_phone??"",
   email:row.customer_email??"",
   productId:row.product_id??"",
   offerId:row.offer_id??"",
   productNameSnapshot:row.product_snapshot?.name??"Product",
   offerNameSnapshot:row.offer_snapshot?.name??"Offer",
   pricingSnapshot:{phases:row.offer_snapshot?.terms?.phases??[{
    label:row.offer_snapshot?.name??"Offer",
    months:row.offer_snapshot?.term_months?`${row.offer_snapshot.term_months} months`:"Ongoing",
    price:Number(row.recurring_price??0)
   }]},
   installDate:x.installDate??"",
   installTime:x.installTime??"",
   notes:x.notes??"",
   orderStatus:"submitted",
   reviewStatus:"pending",
   createdAt:row.submitted_at,
   updatedAt:row.updated_at
  };
 }
 async function reviewOrder(id:string,status:"approved"|"flagged",note?:string){
  const s=createClient(); const current=orders.find(o=>o.id===id); const {error}=await s.from("orders").update({review_status:status,status:status==="approved"?"approved":"flagged",metadata:{notes:current?.notes??"",installDate:current?.installDate??"",installTime:current?.installTime??"",reviewNote:note??""}}).eq("id",id);if(error)throw new Error(error.message);await refresh()
 }
 const value: Ctx = {
  loading,
  error,
  products,
  offers,
  attempts,
  orders,
  refresh,
  saveAttempt,
  abandonAttempt,
  submitOrder,
  reviewOrder,
 };
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useSupabaseSales(){const x=useContext(Context);if(!x)throw new Error("useSupabaseSales must be within SupabaseSalesProvider");return x}
