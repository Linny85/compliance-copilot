import { Repository, Snapshot, Id } from "../types";
import { supabase } from "@/integrations/supabase/client";

export class ProdAdapter implements Repository {
  private token: string;

  constructor(sessionToken: string) {
    this.token = sessionToken;
  }

  async getSnapshot(userId?: string): Promise<Snapshot> {
    const { data, error } = await supabase.functions.invoke("import-snapshot", {
      body: { action: "get", userId },
    });
    
    if (error) throw new Error(error.message || "Snapshot fetch failed");
    return data as Snapshot;
  }

  async upsert(collection: keyof Snapshot, record: any): Promise<void> {
    const { error } = await supabase.functions.invoke("import-snapshot", {
      body: { action: "upsert", collection, record },
    });
    
    if (error) throw new Error(error.message || "Upsert failed");
  }

  async remove(collection: keyof Snapshot, id: Id): Promise<void> {
    const { error } = await supabase.functions.invoke("import-snapshot", {
      body: { action: "remove", collection, id },
    });
    
    if (error) throw new Error(error.message || "Delete failed");
  }

  async bulkImport(snapshot: Snapshot, userId?: string): Promise<void> {
    const { error } = await supabase.functions.invoke("import-snapshot", {
      body: { action: "import", snapshot, userId },
    });
    
    if (error) throw new Error(error.message || "Import failed");
  }
}
