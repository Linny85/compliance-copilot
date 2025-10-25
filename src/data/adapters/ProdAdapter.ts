import { Snapshot, StorageAdapter } from "../types";
import { supabase } from "@/integrations/supabase/client";

export class ProdAdapter implements StorageAdapter {
  constructor(private token: string) {}

  async getSnapshot(userId?: string): Promise<Snapshot> {
    const { data, error } = await supabase.functions.invoke('import-snapshot', {
      body: { action: 'get', userId }
    });
    
    if (error) throw new Error("Snapshot fetch failed");
    return data;
  }

  async upsert(collection: keyof Snapshot, record: any) {
    const { error } = await supabase.functions.invoke('import-snapshot', {
      body: { action: 'upsert', collection, record }
    });
    
    if (error) throw new Error("Upsert failed");
  }

  async remove(collection: keyof Snapshot, id: string) {
    const { error } = await supabase.functions.invoke('import-snapshot', {
      body: { action: 'remove', collection, id }
    });
    
    if (error) throw new Error("Delete failed");
  }

  async bulkImport(snapshot: Snapshot, userId?: string) {
    const { error } = await supabase.functions.invoke('import-snapshot', {
      body: { action: 'import', snapshot, userId }
    });
    
    if (error) throw new Error("Import failed");
  }
}
