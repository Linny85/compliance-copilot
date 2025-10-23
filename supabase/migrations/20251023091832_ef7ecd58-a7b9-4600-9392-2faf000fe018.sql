-- Erweitere app_role enum um 'editor' Rolle
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';