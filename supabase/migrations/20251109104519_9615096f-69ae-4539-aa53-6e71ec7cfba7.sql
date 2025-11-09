-- Fix: Create the overview alias pointing to existing summary_overview
-- First verify summary_overview exists, if not recreate it

CREATE OR REPLACE VIEW public.overview AS 
SELECT 
  company_id,
  COALESCE(controls_pct, 0) AS controls_pct,
  COALESCE(evidence_pct, 0) AS evidence_pct,
  COALESCE(training_pct, 0) AS training_pct,
  COALESCE(nis2_pct, 0) AS nis2_pct,
  COALESCE(ai_act_pct, 0) AS ai_act_pct,
  COALESCE(dsgvo_pct, 0) AS dsgvo_pct,
  COALESCE(overall_pct, 0) AS overall_pct
FROM (
  SELECT
    COALESCE(co.company_id, ev.company_id, tr.company_id) AS company_id,
    COALESCE(co.controls_pct, 0) AS controls_pct,
    COALESCE(ev.evidence_pct, 0) AS evidence_pct,
    COALESCE(tr.training_pct, 0) AS training_pct,
    COALESCE(co.nis2_pct, 0) AS nis2_pct,
    COALESCE(co.ai_act_pct, 0) AS ai_act_pct,
    COALESCE(co.dsgvo_pct, 0) AS dsgvo_pct,
    ROUND(
      (COALESCE(co.controls_pct, 0) + COALESCE(ev.evidence_pct, 0) + COALESCE(tr.training_pct, 0)) / 3.0,
      1
    ) AS overall_pct
  FROM public.summary_controls co
  FULL OUTER JOIN public.summary_evidence ev ON ev.company_id = co.company_id
  FULL OUTER JOIN public.summary_training tr ON tr.company_id = co.company_id
) AS base;

GRANT SELECT ON public.overview TO authenticated;

COMMENT ON VIEW public.overview IS 'Compatibility view for dashboard - aggregates controls, evidence, and training metrics';
