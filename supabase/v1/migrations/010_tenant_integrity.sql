begin;

create or replace function public.assert_same_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  other_org uuid;
begin
  if tg_table_name = 'territories' then
    if new.market_id is not null then
      select organization_id into other_org from public.markets where id = new.market_id;
      if other_org is distinct from new.organization_id then raise exception 'market belongs to another organization'; end if;
    end if;
    if new.team_id is not null then
      select organization_id into other_org from public.teams where id = new.team_id;
      if other_org is distinct from new.organization_id then raise exception 'team belongs to another organization'; end if;
    end if;
  elsif tg_table_name = 'representatives' then
    if new.team_id is not null then
      select organization_id into other_org from public.teams where id = new.team_id;
      if other_org is distinct from new.organization_id then raise exception 'team belongs to another organization'; end if;
    end if;
  elsif tg_table_name = 'representative_territories' then
    select organization_id into other_org from public.representatives where id = new.representative_id;
    if other_org is distinct from new.organization_id then raise exception 'representative belongs to another organization'; end if;
    select organization_id into other_org from public.territories where id = new.territory_id;
    if other_org is distinct from new.organization_id then raise exception 'territory belongs to another organization'; end if;
  elsif tg_table_name = 'locations' then
    if new.territory_id is not null then
      select organization_id into other_org from public.territories where id = new.territory_id;
      if other_org is distinct from new.organization_id then raise exception 'territory belongs to another organization'; end if;
    end if;
  elsif tg_table_name = 'orders' then
    select organization_id into other_org from public.locations where id = new.location_id;
    if other_org is distinct from new.organization_id then raise exception 'location belongs to another organization'; end if;
  elsif tg_table_name = 'appointments' then
    select organization_id into other_org from public.locations where id = new.location_id;
    if other_org is distinct from new.organization_id then raise exception 'location belongs to another organization'; end if;
    select organization_id into other_org from public.territories where id = new.territory_id;
    if other_org is distinct from new.organization_id then raise exception 'territory belongs to another organization'; end if;
  end if;
  return new;
end;
$$;

create trigger tenant_integrity_territories before insert or update on public.territories
for each row execute function public.assert_same_org();

create trigger tenant_integrity_representatives before insert or update on public.representatives
for each row execute function public.assert_same_org();

create trigger tenant_integrity_rep_territories before insert or update on public.representative_territories
for each row execute function public.assert_same_org();

create trigger tenant_integrity_locations before insert or update on public.locations
for each row execute function public.assert_same_org();

create trigger tenant_integrity_orders before insert or update on public.orders
for each row execute function public.assert_same_org();

create trigger tenant_integrity_appointments before insert or update on public.appointments
for each row execute function public.assert_same_org();

commit;
