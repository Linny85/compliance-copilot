import { isDemo } from './isDemo';
import { demoChecks, demoReports, demoRisks, demoControls, demoAISystems } from '@/demo/demoData';

type FnName = string;

const demoPayloads: Record<string, any> = {
  'list-checks': {
    data: demoChecks.map((c: any) => ({ ...c, id: c.id || Math.random().toString() })),
  },
  'list-results': {
    data: [
      { control: 'NIS2-01', passed: true, at: '2025-10-25', outcome: 'pass' },
      { control: 'NIS2-02', passed: false, at: '2025-10-26', outcome: 'warn' },
      { control: 'GDPR-03', passed: false, at: '2025-10-23', outcome: 'fail' },
      { control: 'AI-01', passed: true, at: '2025-10-26', outcome: 'pass' },
    ],
  },
  'list-controls': {
    data: demoControls,
  },
  'get-user-info': {
    userId: 'demo-user',
    email: 'demo@norrland-innovate.com',
    tenantId: 'demo-tenant',
    role: 'owner',
    subscriptionStatus: 'active',
  },
  'generate-audit-report': {
    data: { id: 'demo-report', url: '#', message: 'Demo report generation disabled' },
  },
  'generate-compliance-report': {
    data: { score: 68, status: 'good', message: 'Demo compliance report' },
  },
};

export async function callFunctionShim(supabase: any, name: FnName, args?: any) {
  if (isDemo()) {
    // Never call real edge functions in demo → return fake data
    await new Promise(r => setTimeout(r, 300)); // Simulate network delay
    if (demoPayloads[name]) {
      return { data: demoPayloads[name].data || demoPayloads[name], error: null };
    }
    return { data: null, error: null };
  }
  // Real function invocation
  const { data, error } = await supabase.functions.invoke(name, { body: args ?? {} });
  return { data, error };
}
