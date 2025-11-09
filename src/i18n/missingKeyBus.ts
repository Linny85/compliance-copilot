type MissingKey = { lng: string; ns: string; key: string };
type Listener = (e: MissingKey) => void;

const listeners = new Set<Listener>();

export function onMissingKey(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitMissingKey(e: MissingKey) {
  listeners.forEach(l => l(e));
}

// Optional: global insight in DEV
if (import.meta.env.DEV) {
  // @ts-ignore
  window.__I18N_MISSING__ ??= [];
  const orig = emitMissingKey;
  // @ts-ignore
  emitMissingKey = (e: MissingKey) => {
    // @ts-ignore
    window.__I18N_MISSING__.push(e);
    orig(e);
  };
}
