import { create } from 'zustand';

interface TenantStore {
  tenantId: string | null;
  setTenant: (id: string | null) => void;
}

export const useTenantStore = create<TenantStore>((set) => ({
  tenantId: typeof localStorage !== 'undefined' ? localStorage.getItem('tenant_id') : null,
  setTenant: (id) => {
    try {
      if (id) {
        localStorage.setItem('tenant_id', id);
      } else {
        localStorage.removeItem('tenant_id');
      }
    } catch (e) {
      console.warn('Failed to persist tenant_id:', e);
    }
    set({ tenantId: id });
  },
}));
