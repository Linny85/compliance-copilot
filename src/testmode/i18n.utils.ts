/**
 * Fetch i18n JSON file with cache busting
 */
export async function fetchI18n(lang: string, ns: string, baseUrl: string): Promise<any> {
  const res = await fetch(`${baseUrl}/${lang}/${ns}.json?ts=${Date.now()}`, { 
    cache: 'no-store' 
  });
  
  if (!res.ok) {
    throw new Error(`${lang}/${ns}: ${res.status}`);
  }
  
  return res.json();
}

/**
 * Flatten nested object into dot-notation keys
 */
export function flatKeys(obj: any, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  
  Object.keys(obj || {}).forEach(k => {
    const path = prefix ? `${prefix}.${k}` : k;
    
    if (obj[k] && typeof obj[k] === 'object') {
      Object.assign(out, flatKeys(obj[k], path));
    } else {
      out[path] = String(obj[k]);
    }
  });
  
  return out;
}

/**
 * Extract variable names from i18n string ({{varName}})
 */
const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function extractVars(s: string): string[] {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  
  while ((match = VAR_RE.exec(s)) !== null) {
    vars.add(match[1]);
  }
  
  return [...vars].sort();
}

/**
 * Compare variable sets between base and translation
 */
export function compareVarSets(baseVars: string[], transVars: string[]) {
  const missing = baseVars.filter(v => !transVars.includes(v));
  const extra = transVars.filter(v => !baseVars.includes(v));
  
  return { missing, extra };
}
