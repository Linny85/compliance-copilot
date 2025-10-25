-- Create view for subscription access without custom claims (using actual column names)
create or replace view public.v_me_subscription as
select 
  s.id,
  s.company_id,
  s.user_id,
  s.stripe_customer_id,
  s.stripe_sub_id,
  s.plan,
  s.status,
  s.current_period_end,
  s.created_at,
  s.updated_at
from public.subscriptions s
where s.user_id = auth.uid();

-- Grant access to authenticated users
grant select on public.v_me_subscription to authenticated;

-- Add helpful comment
comment on view public.v_me_subscription is 'User-scoped view of subscriptions without requiring custom JWT claims';