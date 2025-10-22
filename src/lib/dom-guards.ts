export function installDomGuards() {
  // 1) Sichere removeChild-Implementierung für ALLE Nodes (DEV & PROD)
  try {
    const _remove = Node.prototype.removeChild as (this: Node, child: Node) => Node;
    if (!('_safeRemovePatched_' in Node.prototype)) {
      Object.defineProperty(Node.prototype, '_safeRemovePatched_', { value: true });
      Node.prototype.removeChild = function (child: Node) {
        try {
          // Wenn kein Child oder Parent-Beziehung schon weg → nicht crashen
          // @ts-ignore optional contains in manchen Node-Typen
          if (!child || !this || typeof (this as any).contains === 'function' && !(this as any).contains(child)) {
            return child;
          }
          return _remove.call(this, child);
        } catch (err) {
          // Letzte Rettung: NIE crashen – still zurückgeben
          return child;
        }
      } as any;
    }
  } catch { /* ignore */ }

  // 2) Globaler Fehlerfilter: diesen bekannten Portal-Cleanup-Fehler abfangen
  const isPortalRemoveChildError = (err: unknown) => {
    const msg = String((err as any)?.message || err || '');
    return msg.includes("Failed to execute 'removeChild' on 'Node'") &&
           msg.includes("The node to be removed is not a child of this node");
  };

  try {
    // window.onerror
    const onWinError = (ev: ErrorEvent) => {
      if (isPortalRemoveChildError(ev.error || ev.message)) {
        ev.preventDefault?.();
        // In DEV sichtbar loggen, PROD stillschweigend
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[guard] suppressed portal removeChild error', ev.error || ev.message);
        }
        return true;
      }
      return false;
    };
    window.addEventListener('error', onWinError, { capture: true });

    // Promise-Rejections
    const onRejection = (ev: PromiseRejectionEvent) => {
      if (isPortalRemoveChildError(ev.reason)) {
        ev.preventDefault?.();
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[guard] suppressed portal removeChild rejection', ev.reason);
        }
      }
    };
    window.addEventListener('unhandledrejection', onRejection, { capture: true });
  } catch { /* ignore */ }
}
