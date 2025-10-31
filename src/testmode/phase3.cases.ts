// Phase 3 – Test-Cases & Konfiguration (an deine App anpassen)

export type HttpMethod = 'GET' | 'POST' | 'HEAD';

export type FnCase = {
  label: string;
  path: string;           // z.B. /functions/v1/list-documents
  method?: HttpMethod;    // default: POST
  body?: any;             // optional: JSON
  expect: Array<200|401|403|404|500>; // erlaubte Statuscodes für "bestehend"
  minRole?: 'viewer'|'member'|'manager'|'admin'; // erwartete Mindestrolle
  notes?: string;
};

export const FN_CASES: FnCase[] = [
  {
    label: 'get-user-info',
    path:  '/functions/v1/get-user-info',
    method:'POST',
    expect:[200,401],
    minRole: 'viewer',
    notes: 'Jeder authentifizierte User kann seine eigenen Infos abrufen'
  },
  {
    label: 'list-checks',
    path:  '/functions/v1/list-checks',
    method:'POST',
    expect:[200,403,401],
    minRole: 'member',
    notes: 'Member darf Checks lesen; unauth → 401; unzureichende Rolle → 403'
  },
  {
    label: 'create-rule',
    path:  '/functions/v1/create-rule',
    method:'POST',
    expect:[200,403,401],
    minRole: 'manager',
    notes: 'Nur Manager/Admin können Rules erstellen'
  },
  {
    label: 'update-qa-monitor',
    path:  '/functions/v1/update-qa-monitor',
    method:'POST',
    expect:[200,403,401],
    minRole: 'admin',
    notes: 'Nur Admin kann QA Monitor aktualisieren'
  },
  // 👉 Füge hier weitere Functions ein …
];

// --- RLS-Spot-Checks -----------------------------

export type RlsTable = {
  table: string;               // public.documents
  tenantColumn: string;        // tenant_id
  selectCols?: string[];       // möglichst klein halten
  sampleLimit?: number;        // default 50
};

export const RLS_TABLES: RlsTable[] = [
  { 
    table: 'check_rules', 
    tenantColumn: 'tenant_id', 
    selectCols: ['id','tenant_id','code'], 
    sampleLimit: 50 
  },
  { 
    table: 'evidences', 
    tenantColumn: 'tenant_id', 
    selectCols: ['id','tenant_id'], 
    sampleLimit: 50 
  },
  { 
    table: 'audit_tasks', 
    tenantColumn: 'tenant_id', 
    selectCols: ['id','tenant_id','title'], 
    sampleLimit: 50 
  },
  // 👉 Füge hier weitere Tabellen ein …
];

// --- Rollen-Ranking (für RBAC-Validierung) -------

export const ROLE_ORDER = ['viewer','member','manager','admin'] as const;

// Optional: Falls dein JWT einen anderen Claim-Namen verwendet:
export const JWT_ROLE_CLAIM_PATH = 'app_metadata.roles'; // Array<string> erwartet
export const JWT_TENANT_CLAIM = 'tenant_id';             // String erwartet
