import { Repository, Snapshot, Id } from "../types";

const KEY = "norrland_demo_snapshot_v1";

export class DemoAdapter implements Repository {
  private async get(): Promise<Snapshot> {
    if (typeof window === "undefined") {
      return { version: 1, companies: [], vendors: [], aiSystems: [] };
    }
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { version: 1, companies: [], vendors: [], aiSystems: [] };
  }

  private async save(s: Snapshot) {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(s));
  }

  async getSnapshot(): Promise<Snapshot> {
    return this.get();
  }

  async upsert(collection: keyof Snapshot, record: any): Promise<void> {
    const s = await this.get();
    const arr = s[collection] as any[];
    const i = arr.findIndex((r) => r.id === record.id);
    i >= 0 ? (arr[i] = record) : arr.push(record);
    await this.save(s);
  }

  async remove(collection: keyof Snapshot, id: Id): Promise<void> {
    const s = await this.get();
    (s[collection] as any[]) = (s[collection] as any[]).filter((r) => r.id !== id);
    await this.save(s);
  }

  async bulkImport(snapshot: Snapshot): Promise<void> {
    await this.save(snapshot);
  }
}
