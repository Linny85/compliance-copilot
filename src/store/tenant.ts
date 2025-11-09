import { create } from 'zustand';

interface TenantStore {
  tenantId: string | null;
  setTenant: (id: string | null) => void;
}

export const useTenantStore = create<TenantStore>((set) => {
  const initial = typeof localStorage !== 'undefined' ? localStorage.getItem('tenant_id') : null;
  console.log('[tenant.store] initial', { tenantId: initial, ls: localStorage.getItem('tenant_id') });
  
  return {
    tenantId: initial,
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
  };
});
