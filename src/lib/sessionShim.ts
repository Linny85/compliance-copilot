import { isDemo } from './isDemo';
import { demoUser } from '@/demo/demoData';

const DEMO_SESSION = {
  user: demoUser,
  access_token: 'demo-token',
  refresh_token: 'demo-refresh',
} as any;

export async function getSessionShim(supabase: any) {
  if (isDemo()) {
    return { data: { session: DEMO_SESSION }, error: null };
  }
  return supabase.auth.getSession();
}

export async function getUserShim(supabase: any) {
  if (isDemo()) {
    return { data: { user: DEMO_SESSION.user }, error: null };
  }
  return supabase.auth.getUser();
}
