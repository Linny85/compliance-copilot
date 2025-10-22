export function installDomGuards() {
  // 1) Sichere removeChild-Implementierung für ALLE Nodes (DEV & PROD)
  try {
    const _remove = Node.prototype.removeChild as (this: Node, child: Node) => Node;
    if (!('_patchedRemoveChild' in (Node.prototype as any))) {
      (Node.prototype as any)._patchedRemoveChild = true;
      Node.prototype.removeChild = function (child: Node) {
        try {
          // @ts-ignore optional contains
          if (!child || !this || (this as any).contains && !(this as any).contains(child)) {
            return child;
          }
          return _remove.call(this, child);
        } catch {
          return child;
        }
      } as any;
    }
  } catch { /* ignore */ }

  // 2) Sichere insertBefore-Implementierung
  try {
    const _insert = Node.prototype.insertBefore as (this: Node, newNode: Node, referenceNode: Node | null) => Node;
    if (!('_patchedInsertBefore' in (Node.prototype as any))) {
      (Node.prototype as any)._patchedInsertBefore = true;
      Node.prototype.insertBefore = function (newNode: Node, ref: Node | null) {
        try {
          // Wenn ref angegeben ist, muss sie Kind des Parents sein – sonst still ignorieren
          if (ref && ref.parentNode !== this) {
            // Fallback: ans Ende einfügen statt crashen
            return _insert.call(this, newNode, null);
          }
          return _insert.call(this, newNode, ref);
        } catch {
          // Letzte Rettung: hinten anhängen, wenn möglich
          try {
            return _insert.call(this, newNode, null);
          } catch {
            return newNode;
          }
        }
      } as any;
    }
  } catch { /* ignore */ }

  // 3) Globaler Fehlerfilter: Portal-DOM-Fehler abfangen
  const isPortalDomError = (err: unknown) => {
    const msg = String((err as any)?.message || err || '');
    return msg.includes("Failed to execute 'removeChild'") || msg.includes("Failed to execute 'insertBefore'");
  };

  if (typeof window !== 'undefined' && !(window as any).__domGuardHooks) {
    (window as any).__domGuardHooks = true;
    
    try {
      // window.onerror
      const onWinError = (ev: ErrorEvent) => {
        if (isPortalDomError(ev.error || ev.message)) {
          ev.preventDefault?.();
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[dom-guard suppressed]', ev.error || ev.message);
          }
          return true;
        }
        return false;
      };
      window.addEventListener('error', onWinError, { capture: true });

      // Promise-Rejections
      const onRejection = (ev: PromiseRejectionEvent) => {
        if (isPortalDomError(ev.reason)) {
          ev.preventDefault?.();
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[dom-guard suppressed]', ev.reason);
          }
        }
      };
      window.addEventListener('unhandledrejection', onRejection, { capture: true });
    } catch { /* ignore */ }
  }
}
