// Lightweight Vite plugin: runs npm run i18n:verify on locale changes.
// - Non-blocking: zeigt nur Warnungen/Fehler im Terminal
// - Debounced: vermeidet Spam bei Save-Stürmen
// Opt-in via: I18N_VERIFY=1

import { spawn } from 'node:child_process';
import path from 'node:path';

export default function i18nVerifyPlugin(opts?: {
  localesDir?: string;  // default: 'public/locales'
  cmd?: string;         // default: 'npm run i18n:verify'
  debounceMs?: number;  // default: 300
}) {
  const localesDir = opts?.localesDir ?? 'public/locales';
  const cmd = opts?.cmd ?? 'npm run i18n:verify';
  const debounceMs = opts?.debounceMs ?? 300;
  const enabled = process.env.I18N_VERIFY === '1';

  let timer: NodeJS.Timeout | null = null;
  let running = false;
  let queued = false;

  const runVerify = () => {
    if (!enabled) return;
    if (running) { queued = true; return; }
    running = true;

    const [bin, ...args] = process.platform === 'win32'
      ? ['cmd', '/c', cmd]
      : ['/bin/sh', '-lc', cmd];

    const child = spawn(bin, args, { stdio: 'inherit', shell: false });
    child.on('close', () => {
      running = false;
      if (queued) {
        queued = false;
        runVerify();
      }
    });
  };

  const schedule = () => {
    if (!enabled) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(runVerify, debounceMs);
  };

  return {
    name: 'vite-i18n-verify',
    apply: 'serve' as const,
    configureServer(server: any) {
      if (!enabled) {
        console.log('[vite-i18n-verify] disabled (set I18N_VERIFY=1 to enable)');
        return;
      }
      const abs = path.resolve(process.cwd(), localesDir);
      server.watcher.add(abs);
      server.watcher.on('add',    (p: string) => p.includes(localesDir) && schedule());
      server.watcher.on('change', (p: string) => p.includes(localesDir) && schedule());
      server.watcher.on('unlink', (p: string) => p.includes(localesDir) && schedule());
      console.log(`[vite-i18n-verify] watching: ${abs}`);
      // initial run
      runVerify();
    },
  };
}
