import * as React from 'react';
import i18n from 'i18next';
import { onMissingKey } from '@/i18n/missingKeyBus';

type Miss = { id: number; lng: string; ns: string; key: string };

export default function I18nDebugPanel() {
  const [open, setOpen] = React.useState(false);
  const [misses, setMisses] = React.useState<Miss[]>([]);
  const [counter, setCounter] = React.useState(0);
  const [status, setStatus] = React.useState<{lng: string; ns: string[]}>({
    lng: i18n.language,
    ns: Object.keys((i18n as any).services?.resourceStore?.data?.[i18n.language] || {}),
  });

  React.useEffect(() => {
    const off = onMissingKey(({ lng, ns, key }) => {
      setMisses(m => [{ id: Date.now() + Math.random(), lng, ns, key }, ...m].slice(0, 200));
    });
    const onLang = () => setStatus({
      lng: i18n.language,
      ns: Object.keys((i18n as any).services?.resourceStore?.data?.[i18n.language] || {}),
    });
    i18n.on('languageChanged', onLang);
    return () => { off(); i18n.off('languageChanged', onLang); };
  }, []);

  const changeLng = async (lng: string) => {
    await i18n.changeLanguage(lng);
  };

  const reload = async () => {
    await i18n.reloadResources();
    setCounter(c => c + 1);
  };

  if (!import.meta.env.DEV) return null;

  return (
    <div style={{
      position: 'fixed', right: 12, bottom: 12, zIndex: 9999,
      fontFamily: 'ui-sans-serif, system-ui, -apple-system', fontSize: 12
    }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', background: '#fff' }}
          title="Open i18n debug"
        >
          i18n ⚙️
        </button>
      ) : (
        <div style={{
          width: 360, maxHeight: 420, overflow: 'auto',
          padding: 12, borderRadius: 12, border: '1px solid #ccc', background: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>i18n Debug</strong>
            <button onClick={() => setOpen(false)} title="Close">✕</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <select value={status.lng} onChange={e => changeLng(e.target.value)}>
              <option value="de">de</option>
              <option value="en">en</option>
              <option value="sv">sv</option>
            </select>
            <button onClick={reload}>Reload resources</button>
            <span style={{ fontSize: 11, color: '#666' }}>ns: {status.ns.join(', ') || '–'}</span>
          </div>

          <div style={{ marginBottom: 6 }}>
            <strong>Missing keys</strong> ({misses.length})
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
            {misses.length === 0 ? (
              <li style={{ color: '#666' }}>no missing keys (yet)</li>
            ) : misses.map(m => (
              <li key={m.id} style={{ padding: 6, border: '1px solid #eee', borderRadius: 8 }}>
                <code style={{ fontSize: 11 }}>{m.lng}/{m.ns}:{m.key}</code>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 10, color: '#666', fontSize: 11 }}>
            reloads: {counter}
          </div>
        </div>
      )}
    </div>
  );
}
