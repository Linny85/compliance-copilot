import { Snapshot } from "./types";
import { DemoAdapter } from "./adapters/DemoAdapter";

const uuid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

export async function seedDemo() {
  const repo = new DemoAdapter();
  const existing = await repo.getSnapshot();

  if (existing.companies.length + existing.vendors.length + existing.aiSystems.length > 0) return;

  const now = new Date().toISOString();
  const snapshot: Snapshot = {
    version: 1,
    companies: [
      { id: uuid(), name: "Norrland Innovate AB", createdAt: now },
      { id: uuid(), name: "AI Kids Academy", createdAt: now },
    ],
    vendors: [
      { id: uuid(), name: "Stripe", criticality: "high", createdAt: now },
      { id: uuid(), name: "Supabase", criticality: "med", createdAt: now },
    ],
    aiSystems: [
      { id: uuid(), name: "DPIA Co-Pilot", ownerCompanyId: "", risk: "limited", createdAt: now },
      { id: uuid(), name: "Vendor Risk Scorer", ownerCompanyId: "", risk: "minimal", createdAt: now },
    ],
  };

  // Link AI systems to first company
  const owner = snapshot.companies[0]?.id;
  snapshot.aiSystems = snapshot.aiSystems.map((a) => ({ ...a, ownerCompanyId: owner }));

  await repo.bulkImport(snapshot);
}
