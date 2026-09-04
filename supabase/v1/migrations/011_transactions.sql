begin;

create or replace function public.get_slot_capacity(
  p_organization_id uuid,
  p_territory_id uuid,
  p_service_date date,
  p_slot_time time
)
returns integer
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  policy_row public.scheduling_policies%rowtype;
  override_capacity integer;
  is_blackout boolean;
begin
  select *
  into policy_row
  from public.scheduling_policies
  where organization_id = p_organization_id
    and territory_id = p_territory_id
    and is_active
  order by created_at desc
  limit 1;

  if not found then return 0; end if;

  select exists(
    select 1 from public.scheduling_overrides
    where organization_id = p_organization_id
      and territory_id = p_territory_id
      and service_date = p_service_date
      and override_type = 'blackout'
      and (slot_time is null or slot_time = p_slot_time)
  ) into is_blackout;

  if is_blackout then return 0; end if;

  select capacity
  into override_capacity
  from public.scheduling_overrides
  where organization_id = p_organization_id
    and territory_id = p_territory_id
    and service_date = p_service_date
    and slot_time = p_slot_time
    and override_type = 'capacity'
  limit 1;

  return coalesce(override_capacity, policy_row.default_capacity);
end;
$$;

create or replace function public.book_appointment(
  p_organization_id uuid,
  p_order_id uuid,
  p_sales_attempt_id uuid,
  p_location_id uuid,
  p_representative_id uuid,
  p_team_id uuid,
  p_territory_id uuid,
  p_service_date date,
  p_slot_time time,
  p_customer_name text,
  p_customer_phone text default null,
  p_customer_email text default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  capacity integer;
  booked integer;
  result public.appointments;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_territory_id::text || ':' || p_service_date::text || ':' || p_slot_time::text, 0
  ));

  capacity := public.get_slot_capacity(p_organization_id,p_territory_id,p_service_date,p_slot_time);
  if capacity <= 0 then raise exception 'slot unavailable'; end if;

  select count(*) into booked
  from public.appointments
  where organization_id = p_organization_id
    and territory_id = p_territory_id
    and service_date = p_service_date
    and slot_time = p_slot_time
    and status in ('scheduled','completed');

  if booked >= capacity then raise exception 'slot capacity reached'; end if;

  insert into public.appointments(
    organization_id,order_id,sales_attempt_id,location_id,representative_id,team_id,territory_id,
    service_date,slot_time,customer_name,customer_phone,customer_email
  )
  values(
    p_organization_id,p_order_id,p_sales_attempt_id,p_location_id,p_representative_id,p_team_id,p_territory_id,
    p_service_date,p_slot_time,p_customer_name,p_customer_phone,p_customer_email
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.submit_order(
  p_organization_id uuid,
  p_client_submission_id uuid,
  p_sales_attempt_id uuid,
  p_location_id uuid,
  p_representative_id uuid,
  p_team_id uuid,
  p_territory_id uuid,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_email text,
  p_customer_phone text,
  p_product_id uuid,
  p_offer_id uuid
)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing public.orders;
  result public.orders;
  product_row public.products;
  offer_row public.offers;
  submitted_stage uuid;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization';
  end if;

  select * into existing
  from public.orders
  where organization_id = p_organization_id
    and client_submission_id = p_client_submission_id;

  if found then return existing; end if;

  perform 1 from public.locations
  where id = p_location_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'location not found in organization'; end if;

  select * into product_row from public.products
  where id = p_product_id and organization_id = p_organization_id and is_active;
  if not found then raise exception 'active product not found'; end if;

  select * into offer_row from public.offers
  where id = p_offer_id and organization_id = p_organization_id and is_active;
  if not found then raise exception 'active offer not found'; end if;

  insert into public.orders(
    organization_id,client_submission_id,sales_attempt_id,location_id,representative_id,team_id,territory_id,
    customer_first_name,customer_last_name,customer_email,customer_phone,product_id,offer_id,
    product_snapshot,offer_snapshot,recurring_price,one_time_price
  )
  values(
    p_organization_id,p_client_submission_id,p_sales_attempt_id,p_location_id,p_representative_id,p_team_id,p_territory_id,
    p_customer_first_name,p_customer_last_name,p_customer_email,p_customer_phone,p_product_id,p_offer_id,
    jsonb_build_object('id',product_row.id,'code',product_row.code,'name',product_row.name,'category',product_row.category,'service_level',product_row.service_level),
    jsonb_build_object('id',offer_row.id,'code',offer_row.code,'name',offer_row.name,'recurring_price',offer_row.recurring_price,'one_time_price',offer_row.one_time_price,'term_months',offer_row.term_months,'terms',offer_row.terms),
    offer_row.recurring_price,offer_row.one_time_price
  )
  returning * into result;

  if p_sales_attempt_id is not null then
    update public.sales_attempts
    set status='converted', converted_order_id=result.id, converted_at=now(), updated_at=now()
    where id=p_sales_attempt_id and organization_id=p_organization_id;
  end if;

  select id into submitted_stage
  from public.lifecycle_stages
  where organization_id=p_organization_id and code='submitted' and is_active
  limit 1;

  if submitted_stage is not null then
    insert into public.lifecycle_events(organization_id,order_id,lifecycle_stage_id,source,detail)
    values(p_organization_id,result.id,submitted_stage,'system','Order created in Cwlwm Field Operations.');
  end if;

  return result;
exception
  when unique_violation then
    select * into existing
    from public.orders
    where organization_id = p_organization_id
      and client_submission_id = p_client_submission_id;
    if found then return existing; end if;
    raise;
end;
$$;

create or replace function public.create_invoice_batch(
  p_organization_id uuid,
  p_order_ids uuid[],
  p_team_id uuid default null,
  p_notes text default null
)
returns public.invoice_batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  settings public.invoice_settings;
  inv_number text;
  batch public.invoice_batches;
  order_row public.orders;
  amount numeric(12,2);
  subtotal_value numeric(12,2) := 0;
begin
  if not public.has_org_role(p_organization_id,array['organization_owner','organization_admin','operations_manager']) then
    raise exception 'not authorized for finance operation';
  end if;

  select * into settings
  from public.invoice_settings
  where organization_id=p_organization_id
  for update;

  if not found then
    insert into public.invoice_settings(organization_id)
    values(p_organization_id)
    returning * into settings;
  end if;

  inv_number := settings.prefix || '-' ||
    case when settings.include_year then extract(year from current_date)::int::text || '-' else '' end ||
    lpad(settings.next_number::text,settings.padding,'0');

  update public.invoice_settings
  set next_number=next_number+1,updated_at=now()
  where organization_id=p_organization_id;

  insert into public.invoice_batches(organization_id,invoice_number,team_id,notes)
  values(p_organization_id,inv_number,p_team_id,p_notes)
  returning * into batch;

  for order_row in
    select o.*
    from public.orders o
    join public.order_lifecycle_current lc on lc.order_id=o.id
    where o.organization_id=p_organization_id
      and o.id=any(p_order_ids)
      and lc.lifecycle_category in ('installed','activated')
      and not exists(select 1 from public.invoice_items ii where ii.order_id=o.id)
    for update of o
  loop
    amount := coalesce(order_row.recurring_price,0);
    insert into public.invoice_items(organization_id,invoice_batch_id,order_id,description,amount)
    values(p_organization_id,batch.id,order_row.id,
      coalesce(order_row.product_snapshot->>'name','Order '||order_row.id::text),amount);
    subtotal_value := subtotal_value + amount;
  end loop;

  if subtotal_value = 0 and not exists(select 1 from public.invoice_items where invoice_batch_id=batch.id) then
    delete from public.invoice_batches where id=batch.id;
    raise exception 'no eligible uninvoiced orders selected';
  end if;

  update public.invoice_batches
  set subtotal=subtotal_value,total=subtotal_value
  where id=batch.id
  returning * into batch;

  return batch;
end;
$$;

grant execute on function public.get_slot_capacity(uuid,uuid,date,time) to authenticated;
grant execute on function public.book_appointment(uuid,uuid,uuid,uuid,uuid,uuid,uuid,date,time,text,text,text) to authenticated;
grant execute on function public.submit_order(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,uuid,uuid) to authenticated;
grant execute on function public.create_invoice_batch(uuid,uuid[],uuid,text) to authenticated;

commit;
