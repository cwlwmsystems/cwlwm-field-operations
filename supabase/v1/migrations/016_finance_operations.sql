begin;

create or replace function public.add_invoice_adjustment(
  p_organization_id uuid,
  p_invoice_batch_id uuid,
  p_order_id uuid,
  p_description text,
  p_amount numeric,
  p_adjustment_type text default 'other'
)
returns public.adjustments
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.adjustments;
begin
  if not public.has_org_role(
    p_organization_id,
    array['organization_owner','organization_admin','operations_manager']
  ) then
    raise exception 'not authorized for finance operation';
  end if;

  if p_adjustment_type not in ('clawback','credit','debit','void','other') then
    raise exception 'unsupported adjustment type';
  end if;

  if p_amount < 0 then
    raise exception 'adjustment amount must be non-negative';
  end if;

  if not exists (
    select 1
    from public.invoice_batches
    where id = p_invoice_batch_id
      and organization_id = p_organization_id
      and status in ('draft','finalized')
  ) then
    raise exception 'invoice batch not found or no longer adjustable';
  end if;

  if not exists (
    select 1
    from public.invoice_items
    where invoice_batch_id = p_invoice_batch_id
      and order_id = p_order_id
      and organization_id = p_organization_id
  ) then
    raise exception 'order is not part of invoice batch';
  end if;

  insert into public.adjustments(
    organization_id,
    order_id,
    invoice_batch_id,
    adjustment_type,
    reason,
    amount,
    status,
    notes
  )
  values(
    p_organization_id,
    p_order_id,
    p_invoice_batch_id,
    p_adjustment_type,
    coalesce(nullif(trim(p_description),''),'Manual adjustment'),
    p_amount,
    'applied',
    null
  )
  returning * into result;

  update public.invoice_batches b
  set
    adjustments_total = coalesce((
      select sum(
        case
          when a.adjustment_type in ('credit','clawback','void') then -a.amount
          else a.amount
        end
      )
      from public.adjustments a
      where a.invoice_batch_id = b.id
        and a.status = 'applied'
    ),0),
    total = b.subtotal + coalesce((
      select sum(
        case
          when a.adjustment_type in ('credit','clawback','void') then -a.amount
          else a.amount
        end
      )
      from public.adjustments a
      where a.invoice_batch_id = b.id
        and a.status = 'applied'
    ),0)
  where b.id = p_invoice_batch_id
    and b.organization_id = p_organization_id;

  return result;
end;
$$;

create or replace function public.remove_invoice_adjustment(
  p_organization_id uuid,
  p_adjustment_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  batch_id uuid;
begin
  if not public.has_org_role(
    p_organization_id,
    array['organization_owner','organization_admin','operations_manager']
  ) then
    raise exception 'not authorized for finance operation';
  end if;

  select a.invoice_batch_id
  into batch_id
  from public.adjustments a
  join public.invoice_batches b on b.id = a.invoice_batch_id
  where a.id = p_adjustment_id
    and a.organization_id = p_organization_id
    and b.organization_id = p_organization_id
    and b.status in ('draft','finalized');

  if batch_id is null then
    raise exception 'adjustment not found or invoice is locked';
  end if;

  update public.adjustments
  set status='reversed', reversed_at=now()
  where id = p_adjustment_id
    and organization_id = p_organization_id;

  update public.invoice_batches b
  set
    adjustments_total = coalesce((
      select sum(
        case
          when a.adjustment_type in ('credit','clawback','void') then -a.amount
          else a.amount
        end
      )
      from public.adjustments a
      where a.invoice_batch_id = b.id
        and a.status = 'applied'
    ),0),
    total = b.subtotal + coalesce((
      select sum(
        case
          when a.adjustment_type in ('credit','clawback','void') then -a.amount
          else a.amount
        end
      )
      from public.adjustments a
      where a.invoice_batch_id = b.id
        and a.status = 'applied'
    ),0)
  where b.id = batch_id
    and b.organization_id = p_organization_id;
end;
$$;

create or replace function public.set_invoice_batch_status(
  p_organization_id uuid,
  p_invoice_batch_id uuid,
  p_status text
)
returns public.invoice_batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.invoice_batches;
begin
  if not public.has_org_role(
    p_organization_id,
    array['organization_owner','organization_admin','operations_manager']
  ) then
    raise exception 'not authorized for finance operation';
  end if;

  if p_status not in ('draft','finalized','exported','void') then
    raise exception 'unsupported invoice batch status';
  end if;

  update public.invoice_batches
  set
    status = p_status,
    finalized_at = case
      when p_status in ('finalized','exported') then coalesce(finalized_at,now())
      else finalized_at
    end,
    exported_at = case
      when p_status = 'exported' then coalesce(exported_at,now())
      else exported_at
    end
  where id = p_invoice_batch_id
    and organization_id = p_organization_id
  returning * into result;

  if not found then
    raise exception 'invoice batch not found';
  end if;

  return result;
end;
$$;

grant execute on function public.add_invoice_adjustment(uuid,uuid,uuid,text,numeric,text) to authenticated;
grant execute on function public.remove_invoice_adjustment(uuid,uuid) to authenticated;
grant execute on function public.set_invoice_batch_status(uuid,uuid,text) to authenticated;

notify pgrst, 'reload schema';

commit;
