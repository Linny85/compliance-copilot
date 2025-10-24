-- Add constraints and indexes for DPIA production readiness

-- Unique constraint on answers (prevents duplicate answers per question)
ALTER TABLE public.dpia_answers
  ADD CONSTRAINT dpia_answers_record_question_uniq UNIQUE (record_id, question_id);

-- Foreign keys with appropriate cascade/restrict actions
ALTER TABLE public.dpia_records
  ADD CONSTRAINT fk_dpia_questionnaire
    FOREIGN KEY (questionnaire_id) 
    REFERENCES public.dpia_questionnaires(id) 
    ON DELETE RESTRICT;

ALTER TABLE public.dpia_answers
  ADD CONSTRAINT fk_answers_record 
    FOREIGN KEY (record_id) 
    REFERENCES public.dpia_records(id) 
    ON DELETE CASCADE;

ALTER TABLE public.dpia_answers
  ADD CONSTRAINT fk_answers_question 
    FOREIGN KEY (question_id) 
    REFERENCES public.dpia_questions(id) 
    ON DELETE CASCADE;

-- Performance indexes for list/status/scoring queries
CREATE INDEX IF NOT EXISTS idx_dpia_records_tenant_status_created
  ON public.dpia_records (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dpia_records_tenant_risk
  ON public.dpia_records (tenant_id, risk_level);

CREATE INDEX IF NOT EXISTS idx_dpia_questions_qid_required
  ON public.dpia_questions (questionnaire_id, required);