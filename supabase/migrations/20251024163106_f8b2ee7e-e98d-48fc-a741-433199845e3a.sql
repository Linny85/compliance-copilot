-- Fix FK constraint for dpia_answers.question_id to prevent deletion of published questions
ALTER TABLE public.dpia_answers
  DROP CONSTRAINT IF EXISTS fk_answers_question;

ALTER TABLE public.dpia_answers
  ADD CONSTRAINT fk_answers_question 
    FOREIGN KEY (question_id) 
    REFERENCES public.dpia_questions(id) 
    ON DELETE RESTRICT;