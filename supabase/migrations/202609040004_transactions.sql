-- Foundation v0.2: transaction-safe booking and order creation.

create or replace function public.book_appointment(
  p_org uuid, p_slot uuid, p_location uuid, p_order uuid default null,
  p_rep uuid default null, p_customer_name text default null,
  p_phone text default null, p_email text default null, p_notes text default null,
  p_client_submission_id uuid default gen_random_uuid()
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_slot public.appointment_slots%rowtype; v_id uuid;
begin
  if not public.is_organization_member(p_org) then raise exception 'Not authorized.' using errcode='42501'; end if;

  select * into v_slot from public.appointment_slots where id=p_slot and organization_id=p_org for update;
  if not found then raise exception 'Appointment slot not found.' using errcode='P0002'; end if;
  if not v_slot.is_active then raise exception 'Appointment slot is inactive.'; end if;
  if v_slot.booked_count >= v_slot.capacity then raise exception 'Appointment slot is full.' using errcode='P0001'; end if;

  select id into v_id from public.appointments
   where organization_id=p_org and client_submission_id=p_client_submission_id limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.appointments(organization_id,appointment_slot_id,order_id,location_id,representative_id,customer_name,phone,email,notes,client_submission_id)
  values(p_org,p_slot,p_order,p_location,p_rep,p_customer_name,p_phone,p_email,p_notes,p_client_submission_id)
  returning id into v_id;

  update public.appointment_slots set booked_count=booked_count+1 where id=p_slot;
  return v_id;
end; $$;

create or replace function public.cancel_appointment(p_appointment uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v public.appointments%rowtype;
begin
  select * into v from public.appointments where id=p_appointment for update;
  if not found then raise exception 'Appointment not found.'; end if;
  if not public.is_organization_member(v.organization_id) then raise exception 'Not authorized.' using errcode='42501'; end if;
  if v.status='cancelled' then return; end if;
  update public.appointments set status='cancelled' where id=v.id;
  if v.appointment_slot_id is not null then
    update public.appointment_slots set booked_count=greatest(booked_count-1,0) where id=v.appointment_slot_id;
  end if;
end; $$;

create or replace function public.submit_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_org uuid := (p_payload->>'organization_id')::uuid;
  v_location uuid := (p_payload->>'location_id')::uuid;
  v_rep uuid := nullif(p_payload->>'representative_id','')::uuid;
  v_team uuid := nullif(p_payload->>'team_id','')::uuid;
  v_territory uuid := nullif(p_payload->>'territory_id','')::uuid;
  v_attempt uuid := nullif(p_payload->>'sales_attempt_id','')::uuid;
  v_product uuid := nullif(p_payload->>'product_id','')::uuid;
  v_offer uuid := nullif(p_payload->>'offer_id','')::uuid;
  v_submission uuid := coalesce(nullif(p_payload->>'client_submission_id','')::uuid,gen_random_uuid());
  v_existing uuid; v_order uuid;
begin
  if not public.is_organization_member(v_org) then raise exception 'Not authorized.' using errcode='42501'; end if;
  select id into v_existing from public.orders where organization_id=v_org and client_submission_id=v_submission limit 1;
  if v_existing is not null then return jsonb_build_object('ok',true,'already_processed',true,'order_id',v_existing,'client_submission_id',v_submission); end if;

  perform 1 from public.locations where id=v_location and organization_id=v_org for update;
  if not found then raise exception 'Location not found.' using errcode='P0002'; end if;

  insert into public.orders(
    organization_id,client_submission_id,location_id,representative_id,team_id,territory_id,sales_attempt_id,
    product_id,offer_id,customer_name,phone,email,product_name_snapshot,offer_snapshot,pricing_snapshot,notes
  ) values(
    v_org,v_submission,v_location,v_rep,v_team,v_territory,v_attempt,v_product,v_offer,
    nullif(p_payload->>'customer_name',''),nullif(p_payload->>'phone',''),nullif(p_payload->>'email',''),
    nullif(p_payload->>'product_name_snapshot',''),p_payload->'offer_snapshot',p_payload->'pricing_snapshot',nullif(p_payload->>'notes','')
  ) returning id into v_order;

  if v_attempt is not null then
    update public.sales_attempts set attempt_status='converted',converted_at=coalesce(converted_at,now()) where id=v_attempt and organization_id=v_org;
  end if;

  return jsonb_build_object('ok',true,'already_processed',false,'order_id',v_order,'client_submission_id',v_submission);
end; $$;
