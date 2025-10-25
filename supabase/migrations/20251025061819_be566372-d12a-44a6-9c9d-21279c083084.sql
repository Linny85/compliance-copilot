-- Add stripe_customer_id to profiles
alter table public.profiles add column if not exists stripe_customer_id text;
create unique index if not exists idx_profiles_stripe_customer on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

-- Extend existing subscriptions table for Stripe
alter table public.subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists stripe_sub_id text;
alter table public.subscriptions add column if not exists plan text default 'basic';
alter table public.subscriptions add column if not exists current_period_end timestamptz;

-- Create indexes for new columns
create index if not exists idx_subs_user_id on public.subscriptions (user_id);
create index if not exists idx_subs_stripe_customer on public.subscriptions (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists idx_subs_stripe_sub on public.subscriptions (stripe_sub_id) where stripe_sub_id is not null;

-- Add constraint for status values
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check 
  check (status in ('trial','trialing','active','past_due','canceled','incomplete','unpaid'));

-- Update timestamp function if not exists
create or replace function public.handle_subscription_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_subscription_updated on public.subscriptions;
create trigger on_subscription_updated
  before update on public.subscriptions
  for each row
  execute function public.handle_subscription_updated();