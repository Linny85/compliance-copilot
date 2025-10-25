import { DemoAdapter } from "./adapters/DemoAdapter";
import type { Snapshot } from "./types";

export async function seedDemo() {
  const demo = new DemoAdapter();
  const existing = await demo.getSnapshot();
  if (existing.companies.length) return; // already seeded

  const now = new Date().toISOString();
  const s: Snapshot = {
    version: 1,
    companies: [
      { id: crypto.randomUUID(), name: "Norrland Innovate AB", createdAt: now },
      { id: crypto.randomUUID(), name: "AI Kids Academy", createdAt: now },
    ],
    vendors: [],
    aiSystems: [],
  };

  // relate vendors & systems to first company
  const cid = s.companies[0].id;
  s.vendors.push(
    { id: crypto.randomUUID(), companyId: cid, name: "Kale & Me", criticality: "med" },
    { id: crypto.randomUUID(), companyId: cid, name: "Supabase Cloud", criticality: "high" },
  );
  s.aiSystems.push(
    { id: crypto.randomUUID(), companyId: cid, title: "Policy Assistant", riskClass: "limited" },
    { id: crypto.randomUUID(), companyId: cid, title: "Vendor Scoring", riskClass: "high" },
  );

  await demo.bulkImport(s);
}
