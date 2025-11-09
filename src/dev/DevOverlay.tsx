import React, { useEffect, useRef, useState } from 'react';
import { useQueryToggle } from './useQueryToggle';

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 9999,
  background: 'rgba(18, 18, 18, 0.92)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 12,
  padding: '10px 12px',
  boxShadow: '0 6px 24px rgba(0,0,0,.25)',
  width: 280,
  fontSize: 13,
  lineHeight: 1.4,
};

export default function DevOverlay() {
  if (!import.meta.env.DEV) return null;
  const enabled = useQueryToggle('dev');
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!enabled) return null;

  return (
    <div ref={ref} style={panelStyle} role="complementary" aria-label="Dev Tools Overlay">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>Dev Tools</strong>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ background: 'transparent', color: '#fff', border: 0, cursor: 'pointer' }}
          aria-label="Toggle dev tools"
        >
          {open ? '–' : '+'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 6 }}>
            <a href="/dev" style={{ color: '#9ee6ff', textDecoration: 'underline' }}>
              → Dev Tools Page
            </a>
          </div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li><a href="/dev#env" style={{ color: '#9ee6ff' }}>Env Status</a></li>
            <li><a href="/dev#edge" style={{ color: '#9ee6ff' }}>Edge Tests</a></li>
            <li><a href="/dev#docs" style={{ color: '#9ee6ff' }}>Docs</a></li>
          </ul>
          <div style={{ opacity: .8, marginTop: 8 }}>
            Tipp: <kbd>Ctrl/Cmd</kbd> + <kbd>D</kbd> blendet ein/aus.
          </div>
        </div>
      )}
    </div>
  );
}
