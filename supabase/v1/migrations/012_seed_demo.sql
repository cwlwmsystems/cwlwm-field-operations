begin;

-- Synthetic organization and operational configuration only.
-- No employer data, customer data, credentials, or proprietary identifiers.

insert into public.organizations(id,name,slug,timezone)
values('10000000-0000-0000-0000-000000000001','Northstar Field Services','northstar-field-services','America/New_York')
on conflict (id) do nothing;

insert into public.teams(id,organization_id,name,slug,team_type)
values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Internal Sales','internal-sales','internal'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Summit Partners','summit-partners','partner')
on conflict (id) do nothing;

insert into public.markets(id,organization_id,name,slug,state_region)
values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Central Market','central-market','PA')
on conflict (id) do nothing;

insert into public.territories(id,organization_id,market_id,team_id,name,slug,state_region)
values
('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','North District','north-district','PA'),
('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','South District','south-district','PA')
on conflict (id) do nothing;

insert into public.interaction_dispositions(id,organization_id,name,code,is_terminal,requires_note,requires_follow_up,marks_contact,marks_sale,sort_order)
values
('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Not Home','not_home',false,false,true,false,false,10),
('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Interested','interested',false,true,true,true,false,20),
('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Not Interested','not_interested',true,true,false,true,false,30),
('50000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Sale','sale',true,false,false,true,true,40)
on conflict (id) do nothing;

insert into public.products(id,organization_id,code,name,category,service_level,base_recurring_price)
values
('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','HOME-GIG','Home Gig','internet','1 Gbps',79.00),
('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','HOME-500','Home 500','internet','500 Mbps',59.00)
on conflict (id) do nothing;

insert into public.offers(id,organization_id,product_id,code,name,recurring_price,term_months)
values
('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','GIG-LAUNCH','Gig Launch Offer',49.00,24),
('70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','500-STANDARD','500 Standard',59.00,12)
on conflict (id) do nothing;

insert into public.lifecycle_stages(id,organization_id,code,name,category,sort_order,is_terminal)
values
('80000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','submitted','Submitted','submitted',10,false),
('80000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','accepted','Accepted','accepted',20,false),
('80000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','scheduled','Scheduled','scheduled',30,false),
('80000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','installed','Installed','installed',40,false),
('80000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','activated','Activated','activated',50,true),
('80000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','cancelled','Cancelled','cancelled',90,true),
('80000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','exception','Exception','exception',95,false)
on conflict (id) do nothing;

insert into public.invoice_settings(organization_id,prefix,next_number,padding,include_year,currency)
values('10000000-0000-0000-0000-000000000001','INV',1,4,true,'USD')
on conflict (organization_id) do nothing;

insert into public.scheduling_policies(
  id,organization_id,territory_id,name,allowed_weekdays,slot_times,default_capacity,minimum_lead_minutes
)
values
('90000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','North District Standard',
 array[1,2,3,4,5]::smallint[],array['08:00'::time,'10:00'::time,'13:00'::time,'15:00'::time],2,0),
('90000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','South District Standard',
 array[1,2,3,4,5]::smallint[],array['08:00'::time,'10:00'::time,'13:00'::time,'15:00'::time],2,0)
on conflict (id) do nothing;

commit;
