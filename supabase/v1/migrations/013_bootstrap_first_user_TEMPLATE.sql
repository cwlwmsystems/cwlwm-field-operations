-- RUN THIS ONLY AFTER YOU CREATE YOUR FIRST AUTH USER.
-- Replace YOUR_AUTH_USER_UUID with the UUID from Authentication > Users.

insert into public.organization_memberships(
  organization_id,user_id,role,is_active
)
values(
  '10000000-0000-0000-0000-000000000001',
  'YOUR_AUTH_USER_UUID',
  'organization_owner',
  true
)
on conflict (organization_id,user_id)
do update set role='organization_owner',is_active=true;
