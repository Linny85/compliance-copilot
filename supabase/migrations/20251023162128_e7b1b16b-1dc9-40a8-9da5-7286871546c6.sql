-- Fix security warnings: Recreate views without SECURITY DEFINER

-- Drop and recreate views as regular views (not security definer)
drop view if exists public.v_check_rules_active cascade;
drop view if exists public.v_check_results_join cascade;

create view public.v_check_rules_active as
select *
from public.check_rules
where deleted_at is null;

create view public.v_check_results_join as
select 
  r.id,
  r.run_id,
  r.outcome,
  r.message,
  r.details,
  r.created_at,
  r.tenant_id,
  ru.status as run_status,
  ru.window_start,
  ru.window_end,
  cr.id as rule_id,
  cr.code as rule_code,
  cr.title as rule_title,
  cr.severity,
  cr.control_id
from public.check_results r
join public.check_runs ru on ru.id = r.run_id
join public.v_check_rules_active cr on cr.id = r.rule_id;