export type Id = string;
export type ISO = string;

export interface Company { 
  id: Id; 
  name: string; 
  createdAt: ISO; 
}

export interface Vendor { 
  id: Id; 
  companyId: Id; 
  name: string; 
  criticality: "low" | "med" | "high"; 
}

export interface AiSystem { 
  id: Id; 
  companyId: Id; 
  title: string; 
  riskClass: "minimal" | "limited" | "high" | "unacceptable"; 
}

export interface Snapshot {
  version: number;
  companies: Company[];
  vendors: Vendor[];
  aiSystems: AiSystem[];
}

export interface StorageAdapter {
  getSnapshot(userId?: string): Promise<Snapshot>;
  upsert<T extends { id: Id }>(collection: keyof Snapshot, record: T): Promise<void>;
  remove(collection: keyof Snapshot, id: Id): Promise<void>;
  bulkImport(s: Snapshot, userId?: string): Promise<void>;
}
