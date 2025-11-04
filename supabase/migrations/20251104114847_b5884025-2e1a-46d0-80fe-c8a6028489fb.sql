-- DB Hardening: tenant_id indexes and constraints
-- Phase 1: Add indexes for performance (idempotent)

create index if not exists idx_check_rules_tenant 
  on public.check_rules(tenant_id);

create index if not exists idx_check_runs_tenant 
  on public.check_runs(tenant_id);

create index if not exists idx_check_results_tenant 
  on public.check_results(tenant_id);

create index if not exists idx_evidences_tenant 
  on public.evidences(tenant_id);

create index if not exists idx_dpia_records_tenant 
  on public.dpia_records(tenant_id);

create index if not exists idx_dpia_answers_tenant 
  on public.dpia_answers(tenant_id);

create index if not exists idx_dpia_questions_tenant 
  on public.dpia_questions(tenant_id);

create index if not exists idx_dpia_questionnaires_tenant 
  on public.dpia_questionnaires(tenant_id);

create index if not exists idx_evidence_requests_tenant 
  on public.evidence_requests(tenant_id);

-- Phase 2: Enforce NOT NULL on tenant_id (core compliance tables)
-- Note: These will fail if any rows have NULL tenant_id. 
-- Run precondition check first if uncertain.

alter table public.check_rules 
  alter column tenant_id set not null;

alter table public.check_runs 
  alter column tenant_id set not null;

alter table public.check_results 
  alter column tenant_id set not null;

alter table public.evidences 
  alter column tenant_id set not null;

alter table public.evidence_requests 
  alter column tenant_id set not null;

alter table public.dpia_records 
  alter column tenant_id set not null;

alter table public.dpia_answers 
  alter column tenant_id set not null;

alter table public.dpia_questions 
  alter column tenant_id set not null;

alter table public.dpia_questionnaires 
  alter column tenant_id set not null;

-- Verification queries (run manually after migration):
-- select count(*) from check_results where tenant_id = 'YOUR_TENANT_ID';
-- select count(*) from evidences where tenant_id = 'YOUR_TENANT_ID';
-- select count(*) from dpia_records where tenant_id = 'YOUR_TENANT_ID';