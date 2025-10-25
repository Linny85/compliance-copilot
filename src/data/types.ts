export type Id = string;

export type Company = { 
  id: Id; 
  name: string; 
  createdAt: string;
};

export type Vendor = { 
  id: Id; 
  name: string; 
  criticality?: "low" | "med" | "high"; 
  createdAt: string;
};

export type AiSystem = { 
  id: Id; 
  name: string; 
  ownerCompanyId?: Id; 
  risk?: "minimal" | "limited" | "high"; 
  createdAt: string;
};

export type Snapshot = {
  version: 1;
  companies: Company[];
  vendors: Vendor[];
  aiSystems: AiSystem[];
};

export interface Repository {
  getSnapshot(userId?: string): Promise<Snapshot>;
  upsert<T extends Company | Vendor | AiSystem>(collection: keyof Snapshot, record: T): Promise<void>;
  remove(collection: keyof Snapshot, id: Id): Promise<void>;
  bulkImport(s: Snapshot, userId?: string): Promise<void>;
}
