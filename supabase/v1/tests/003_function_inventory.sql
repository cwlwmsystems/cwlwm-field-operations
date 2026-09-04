select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'submit_order','book_appointment','get_slot_capacity',
    'create_invoice_batch','is_org_member','has_org_role'
  )
order by routine_name;
