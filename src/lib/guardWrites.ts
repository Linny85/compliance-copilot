import { isDemo } from './isDemo';
import { toast } from 'sonner';

export function blockWrites<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    if (isDemo()) {
      toast.info('In der Demo sind Änderungen deaktiviert.');
      return { data: null, error: { message: 'DEMO_READ_ONLY' } };
    }
    return fn(...args);
  }) as T;
}

export function isWriteAllowed(): boolean {
  return !isDemo();
}
