-- DPIA Privacy Suite: Questionnaires, Questions, Records, Answers

-- a) Stammdaten
create table if not exists public.dpia_questionnaires (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  code text not null,
  title text not null,
  status text not null check (status in ('draft','published')) default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, code)
);

create table if not exists public.dpia_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  questionnaire_id uuid not null references public.dpia_questionnaires(id) on delete cascade,
  code text not null,
  text text not null,
  type text not null check (type in ('bool','number','single','multi','text','file')),
  weight numeric not null default 1,
  options jsonb,
  control_id uuid,
  required boolean default false,
  section text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, questionnaire_id, code)
);

create table if not exists public.dpia_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  title text not null,
  process_id uuid references public.processes(id),
  vendor_id uuid references public.vendors(id),
  owner_id uuid references auth.users(id),
  questionnaire_id uuid not null references public.dpia_questionnaires(id),
  status text not null check (status in ('open','submitted','in_review','scored','approved','rejected','archived')) default 'open',
  due_at timestamptz,
  submitted_at timestamptz,
  scored_at timestamptz,
  approved_at timestamptz,
  risk_level text check (risk_level in ('low','med','high','critical')),
  score jsonb,
  mitigation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dpia_answers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  record_id uuid not null references public.dpia_records(id) on delete cascade,
  question_id uuid not null references public.dpia_questions(id) on delete cascade,
  value jsonb,
  evidence_id uuid references public.evidences(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(record_id, question_id)
);

-- b) Views
create or replace view public.v_dpia_overview as
select r.*,
  p.name as process_name,
  v.name as vendor_name,
  (select count(*) from dpia_answers a where a.record_id=r.id) as answers_count
from dpia_records r
left join processes p on p.id=r.process_id
left join vendors v on v.id=r.vendor_id;

create or replace view public.v_dpia_answers_export as
select a.*, r.title as dpia_title, q.code as question_code, q.text as question_text,
       q.control_id, r.process_id, r.vendor_id
from dpia_answers a
join dpia_records r on r.id=a.record_id
join dpia_questions q on q.id=a.question_id;

-- c) Trigger/Indices
create trigger trg_dpia_questionnaires_u before update on dpia_questionnaires for each row execute function set_updated_at();
create trigger trg_dpia_questions_u before update on dpia_questions for each row execute function set_updated_at();
create trigger trg_dpia_records_u before update on dpia_records for each row execute function set_updated_at();
create trigger trg_dpia_answers_u before update on dpia_answers for each row execute function set_updated_at();

create index if not exists idx_dpia_records_tenant on dpia_records(tenant_id, status);
create index if not exists idx_dpia_records_scope on dpia_records(tenant_id, process_id, vendor_id);
create index if not exists idx_dpia_answers_record on dpia_answers(record_id);
create index if not exists idx_dpia_questions_questionnaire on dpia_questions(questionnaire_id);

-- d) RLS
alter table dpia_questionnaires enable row level security;
alter table dpia_questions enable row level security;
alter table dpia_records enable row level security;
alter table dpia_answers enable row level security;

-- READ
create policy dpia_qnnr_read on dpia_questionnaires
  for select using (tenant_id = get_user_company(auth.uid()));

create policy dpia_q_read on dpia_questions
  for select using (tenant_id = get_user_company(auth.uid()));

create policy dpia_rec_read on dpia_records
  for select using (tenant_id = get_user_company(auth.uid()));

create policy dpia_ans_read on dpia_answers
  for select using (tenant_id = get_user_company(auth.uid()));

-- WRITE (Admin/Master_Admin)
create policy dpia_qnnr_write on dpia_questionnaires
  for all using (tenant_id = get_user_company(auth.uid())
    and (has_role(auth.uid(), tenant_id, 'admin'::app_role) or has_role(auth.uid(), tenant_id, 'master_admin'::app_role)));

create policy dpia_q_write on dpia_questions
  for all using (tenant_id = get_user_company(auth.uid())
    and (has_role(auth.uid(), tenant_id, 'admin'::app_role) or has_role(auth.uid(), tenant_id, 'master_admin'::app_role)));

create policy dpia_rec_write on dpia_records
  for all using (tenant_id = get_user_company(auth.uid()));

create policy dpia_ans_write on dpia_answers
  for all using (tenant_id = get_user_company(auth.uid()));

-- Service role grants
grant select, insert, update, delete on dpia_questionnaires, dpia_questions, dpia_records, dpia_answers to service_role;
grant select on v_dpia_overview, v_dpia_answers_export to authenticated, service_role;

-- e) Seed BASE questionnaire with core DPIA questions
do $$
declare
  v_tenant uuid;
  v_qnnr uuid;
begin
  -- Get first tenant for seeding (or all if needed)
  select id into v_tenant from "Unternehmen" limit 1;
  
  if v_tenant is not null then
    -- Insert questionnaire
    insert into dpia_questionnaires (tenant_id, code, title, status)
    values (v_tenant, 'BASE', 'Base DPIA Questionnaire', 'published')
    on conflict (tenant_id, code) do nothing
    returning id into v_qnnr;

    if v_qnnr is null then
      select id into v_qnnr from dpia_questionnaires where tenant_id = v_tenant and code = 'BASE';
    end if;

    -- Insert core questions
    insert into dpia_questions (tenant_id, questionnaire_id, code, text, type, weight, required, section) values
    (v_tenant, v_qnnr, 'LEGAL_BASIS', 'What is the legal basis for processing?', 'single', 1.5, true, 'Legal'),
    (v_tenant, v_qnnr, 'PURPOSE', 'Is the purpose clearly defined and documented?', 'bool', 2, true, 'Legal'),
    (v_tenant, v_qnnr, 'DATA_CATEGORIES', 'Which data categories are processed?', 'multi', 1, true, 'Data'),
    (v_tenant, v_qnnr, 'SPECIAL_CATS', 'Are special categories of data processed (Art. 9)?', 'bool', 3, true, 'Data'),
    (v_tenant, v_qnnr, 'DATA_SUBJECTS', 'Who are the data subjects?', 'text', 1, true, 'Subjects'),
    (v_tenant, v_qnnr, 'TOM_IMPLEMENTED', 'Are technical and organizational measures documented?', 'bool', 2, true, 'Security'),
    (v_tenant, v_qnnr, 'THIRD_COUNTRIES', 'Is data transferred to third countries?', 'bool', 2.5, true, 'Transfer'),
    (v_tenant, v_qnnr, 'DPIA_TRIGGER', 'Does the processing trigger DPIA requirements (Art. 35)?', 'bool', 3, true, 'Assessment'),
    (v_tenant, v_qnnr, 'IMPACT', 'Rate the potential impact on data subjects (1-10)', 'number', 2, true, 'Risk'),
    (v_tenant, v_qnnr, 'LIKELIHOOD', 'Rate the likelihood of risks materializing (1-10)', 'number', 2, true, 'Risk'),
    (v_tenant, v_qnnr, 'MITIGATION', 'Are mitigation measures in place?', 'bool', 2, true, 'Risk'),
    (v_tenant, v_qnnr, 'RESIDUAL_RISK', 'Is residual risk acceptable?', 'bool', 2.5, true, 'Risk')
    on conflict (tenant_id, questionnaire_id, code) do nothing;
  end if;
end $$;