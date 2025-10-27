import { z } from "zod";

export const scopeSchema = z.object({
  sector: z.enum(['health','pharmacy','dentistry','lab','hospital','ehealth_it','other']),
  is_ti_connected: z.boolean(),
  employees: z.number().int().min(0).default(0),
  turnover: z.number().min(0).default(0),
  balance: z.number().min(0).default(0),
  uses_ai_for_work: z.boolean(),
  ai_role: z.enum(['provider','deployer','none']).default('none')
});

export type ScopeInput = z.infer<typeof scopeSchema>;
