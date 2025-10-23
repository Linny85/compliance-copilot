import { z } from "zod";

// Shared enums for type safety
export const OutcomeEnum = z.enum(['pass', 'fail', 'warn']);
export type Outcome = z.infer<typeof OutcomeEnum>;

export const RunStatusEnum = z.enum(['running', 'success', 'failed', 'partial']);
export type RunStatus = z.infer<typeof RunStatusEnum>;

export const SeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof SeverityEnum>;

export const RuleKindEnum = z.enum(['static', 'query', 'http', 'script']);
export type RuleKind = z.infer<typeof RuleKindEnum>;

export const AppRoleEnum = z.enum(['admin', 'master_admin', 'editor', 'member']);
export type AppRole = z.infer<typeof AppRoleEnum>;
