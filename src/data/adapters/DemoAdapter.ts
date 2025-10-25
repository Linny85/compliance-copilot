import { Snapshot, StorageAdapter } from "../types";

const KEY = "norrland_demo_snapshot_v1";

export class DemoAdapter implements StorageAdapter {
  async getSnapshot(): Promise<Snapshot> {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { version: 1, companies: [], vendors: [], aiSystems: [] };
  }

  private async save(s: Snapshot) { 
    localStorage.setItem(KEY, JSON.stringify(s)); 
  }

  async upsert(collection: keyof Snapshot, record: any) {
    const s = await this.getSnapshot();
    const arr = s[collection] as any[];
    const i = arr.findIndex((r) => r.id === record.id);
    i >= 0 ? (arr[i] = record) : arr.push(record);
    await this.save(s);
  }

  async remove(collection: keyof Snapshot, id: string) {
    const s = await this.getSnapshot();
    (s[collection] as any[]) = (s[collection] as any[]).filter((r) => r.id !== id);
    await this.save(s);
  }

  async bulkImport(s: Snapshot) { 
    await this.save(s); 
  }
}
