import { isDemo } from '@/config/appMode';

export function assertWritable() {
  if (isDemo()) {
    throw new Error('Write operations are disabled in demo mode.');
  }
}
