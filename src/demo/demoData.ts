export const demoOverview = {
  complianceProgress: 68,
  passRateLast30d: 74,
  openFindings: 12,
  evidence: { approved: 23, total: 40 },
  controlsCoverage: 61,
  aisystems: 4,
  highRisk: 1,
  lastAudit: '2025-10-02',
};

export const demoChecks = [
  { id: '1', code: 'NIS2-01', title: 'Asset Management', outcome: 'pass', lastRun: '2025-10-25' },
  { id: '2', code: 'NIS2-02', title: 'Incident Response', outcome: 'warn', lastRun: '2025-10-24' },
  { id: '3', code: 'GDPR-03', title: 'Records of Processing', outcome: 'fail', lastRun: '2025-10-23' },
  { id: '4', code: 'AI-01', title: 'Data Governance (AI)', outcome: 'pass', lastRun: '2025-10-26' },
];

export const demoReports = [
  { id: 'R-2410-001', title: 'Quarterly Compliance Report', status: 'ready', created_at: '2025-10-01', type: 'quarterly' },
  { id: 'R-2410-002', title: 'NIS2 Gap Analysis', status: 'in_progress', created_at: '2025-10-15', type: 'gap_analysis' },
];

export const demoTenant = {
  id: 'demo-tenant',
  name: 'Acme GmbH (Demo)',
  sector: 'Manufacturing',
  country: 'DE',
  contacts: [{ name: 'M. Muster', role: 'CISO', email: 'ciso@acme-demo.com' }],
};

export const demoUser = {
  id: 'demo-user',
  email: 'demo@norrland-innovate.com',
  user_metadata: { name: 'Demo User', full_name: 'Demo User' },
};

export const demoRisks = [
  { id: '1', title: 'Unverschlüsselte Datenübertragung', severity: 'high', status: 'open', category: 'NIS2' },
  { id: '2', title: 'Fehlende MFA für Admin-Accounts', severity: 'critical', status: 'in_progress', category: 'NIS2' },
  { id: '3', title: 'Veraltete Firewall-Regeln', severity: 'medium', status: 'open', category: 'NIS2' },
];

export const demoControls = [
  { id: '1', code: 'AC-01', title: 'Access Control Policy', status: 'implemented', coverage: 85 },
  { id: '2', code: 'AC-02', title: 'Account Management', status: 'in_progress', coverage: 60 },
  { id: '3', code: 'IR-01', title: 'Incident Response Policy', status: 'implemented', coverage: 90 },
];

export const demoAISystems = [
  { id: '1', name: 'Customer Sentiment Analyzer', risk_class: 'limited', status: 'registered', created_at: '2025-09-15' },
  { id: '2', name: 'Fraud Detection System', risk_class: 'high', status: 'under_review', created_at: '2025-08-20' },
  { id: '3', name: 'Chatbot Assistant', risk_class: 'minimal', status: 'approved', created_at: '2025-07-10' },
];
