import { supabase } from "@/integrations/supabase/client";

export async function invoke<T = any>(fn: string, opts?: { body?: any }) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const { data, error } = await supabase.functions.invoke(fn, {
    body: opts?.body ?? null,
    headers,
  });
  
  if (error) throw error;
  return data as T;
}
