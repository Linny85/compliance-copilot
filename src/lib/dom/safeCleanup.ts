/**
 * Safe DOM cleanup utilities to prevent "Failed to execute 'removeChild'" errors
 * during React unmount/portal cleanup phases.
 */

/**
 * Safely removes a DOM node from its parent
 * @param node - The node to remove
 */
export function safeRemove(node: Node | null | undefined): void {
  try {
    if (!node) return;
    
    const parent = node.parentNode;
    if (parent && parent.contains(node)) {
      parent.removeChild(node);
    } else if ('remove' in (node as any) && typeof (node as any).remove === 'function') {
      // Fallback to native remove() if supported
      (node as any).remove();
    }
  } catch (error) {
    // Swallow errors during cleanup to prevent crashes
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[safeCleanup] Failed to remove node:', error);
    }
  }
}

/**
 * Safely removes an event listener
 * @param target - The event target (Document, Window, HTMLElement)
 * @param type - The event type
 * @param handler - The event handler function
 * @param options - Event listener options
 */
export function safeRemoveListener<T extends keyof DocumentEventMap>(
  target: Document | Window | HTMLElement | null | undefined,
  type: T | string,
  handler: any,
  options?: boolean | AddEventListenerOptions
): void {
  try {
    if (!target || !handler) return;
    target.removeEventListener(type as any, handler as any, options);
  } catch (error) {
    // Swallow errors during cleanup
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[safeCleanup] Failed to remove listener:', error);
    }
  }
}

/**
 * Creates a safe cleanup function for event listeners
 * Returns a cleanup function that can be safely called multiple times
 */
export function createSafeListenerCleanup<T extends keyof DocumentEventMap>(
  target: Document | Window | HTMLElement | null | undefined,
  type: T | string,
  handler: any,
  options?: boolean | AddEventListenerOptions
): () => void {
  let cleaned = false;
  
  return () => {
    if (cleaned) return;
    cleaned = true;
    safeRemoveListener(target, type, handler, options);
  };
}

/**
 * Safely cleans up MutationObserver
 */
export function safeDisconnectObserver(observer: MutationObserver | null | undefined): void {
  try {
    if (observer) {
      observer.disconnect();
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[safeCleanup] Failed to disconnect observer:', error);
    }
  }
}

/**
 * Safely removes a portal container element
 */
export function safeRemovePortalContainer(containerId: string): void {
  try {
    const container = document.getElementById(containerId);
    if (container) {
      safeRemove(container);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[safeCleanup] Failed to remove portal container:', error);
    }
  }
}
