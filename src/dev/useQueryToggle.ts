export function useQueryToggle(param = 'dev'): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get(param) === '1';
  } catch {
    return false;
  }
}
