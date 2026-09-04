select
  service_status,
  count(*)
from public.locations
group by service_status
order by service_status;

select count(*) as invalid_status_count
from public.locations
where service_status not in ('prospect','current_customer','do_not_knock','vacant','business');
