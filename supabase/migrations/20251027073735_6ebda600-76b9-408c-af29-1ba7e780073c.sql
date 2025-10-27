-- Upsert-Funktion für Demo Scope Analysis
create or replace function public.upsert_demo_scope_analysis(
  in p_tenant_id uuid,
  in p_created_by uuid default null
) returns void
language plpgsql
security definer
as $$
declare
  v_input  jsonb;
  v_result jsonb;
begin
  v_input := jsonb_build_object(
    'sector','pharmacy',
    'is_ti_connected',true,
    'employees',8,
    'turnover',1200000,
    'balance',500000,
    'uses_ai_for_work',true,
    'ai_role','deployer'
  );

  v_result := jsonb_build_object(
    'ti_status','in_scope',
    'nis2_status','watch_designation',
    'ai_act_training','required',
    'ai_act_role','deployer',
    'obligations', jsonb_build_object(
      'ti_obligations', to_jsonb(ARRAY['gematik_ecc_2026','ti_ops_guideline','kim_messaging','ti_security_controls']),
      'ai_act_training', to_jsonb(ARRAY['ai_literacy_staff','document_training_records','role_based_curriculum'])
    )
  );

  if exists (
    select 1 from public.tenant_analysis
    where tenant_id = p_tenant_id and input = v_input
  ) then
    update public.tenant_analysis
       set updated_at = now()
     where tenant_id = p_tenant_id and input = v_input;
  else
    insert into public.tenant_analysis (tenant_id, created_by, input, result, rules_version)
    values (p_tenant_id, p_created_by, v_input, v_result, 1);
  end if;

  refresh materialized view public.mv_tenant_scope;
end;
$$;