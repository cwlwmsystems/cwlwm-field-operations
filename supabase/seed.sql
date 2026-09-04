-- Synthetic/demo data only. No employer/customer data.
insert into public.organizations(id,name,slug,timezone) values
('10000000-0000-0000-0000-000000000001','Northstar Field Services','northstar','America/New_York'),
('20000000-0000-0000-0000-000000000001','Pine Ridge Services','pine-ridge','America/Chicago')
on conflict do nothing;

insert into public.teams(id,organization_id,name,slug,team_type) values
('10000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001','Internal Sales','internal-sales','internal'),
('10000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001','Summit Partners','summit-partners','vendor'),
('20000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000001','Field Team','field-team','internal')
on conflict do nothing;

insert into public.markets(id,organization_id,name,slug,state_region) values
('10000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000001','Central Market','central','PA'),
('20000000-0000-0000-0000-000000000201','20000000-0000-0000-0000-000000000001','West Market','west','IA')
on conflict do nothing;

insert into public.territories(id,organization_id,market_id,team_id,name,slug,state_region) values
('10000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000101','North District','north-district','PA'),
('20000000-0000-0000-0000-000000000301','20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000201','20000000-0000-0000-0000-000000000101','West District','west-district','IA')
on conflict do nothing;

insert into public.representatives(id,organization_id,team_id,external_id,full_name,email) values
('10000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000101','DEMO-REP-1','Morgan Reed','morgan@example.invalid'),
('20000000-0000-0000-0000-000000000401','20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000101','DEMO-REP-2','Avery Stone','avery@example.invalid')
on conflict do nothing;

insert into public.interaction_dispositions(id,organization_id,name,code,requires_follow_up,marks_contact,sort_order) values
('10000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000001','Not Home','not_home',true,false,10),
('10000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000001','Interested','interested',true,true,20),
('10000000-0000-0000-0000-000000000503','10000000-0000-0000-0000-000000000001','Sale','sale',false,true,30)
on conflict do nothing;

insert into public.locations(id,organization_id,territory_id,team_id,external_location_id,address1,city,state_region,postal_code) values
('10000000-0000-0000-0000-000000000601','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000101','DEMO-LOC-001','101 Demo Street','Exampletown','PA','17000'),
('20000000-0000-0000-0000-000000000601','20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000301','20000000-0000-0000-0000-000000000101','DEMO-LOC-101','88 Sample Road','Testville','IA','50000')
on conflict do nothing;
