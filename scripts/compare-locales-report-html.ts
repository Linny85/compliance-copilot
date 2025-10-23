#!/usr/bin/env ts-node
import fs from 'node:fs'
import path from 'node:path'

type Dict = Record<string, any>

const DIR = process.env.LOCALES_DIR ?? 'public/locales'
const BASE = process.env.LOCALES_BASE ?? 'en'
const NAMESPACES = (process.env.LOCALES_NS ?? 'common')
  .split(',').map(s => s.trim()).filter(Boolean)

const IGNORE_KEYS = new Set<string>(['_meta'])
const PLACEHOLDER_RE = /(\{\{\s*[\w.-]+\s*\}\})|(\{[\w.-]+\})/g

function readJSON(p: string): Dict {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) }
  catch (e: any) { throw new Error(`JSON parse error in ${p}: ${e?.message}`) }
}
function walk(obj: any, prefix = ''): Record<string, string> {
  const res: Record<string, string> = {}
  if (obj == null) return res
  for (const [k, v] of Object.entries(obj)) {
    if (IGNORE_KEYS.has(k)) continue
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) Object.assign(res, walk(v, key))
    else res[key] = String(v ?? '')
  }
  return res
}
const ph = (s: string) => new Set(Array.from(s.matchAll(PLACEHOLDER_RE)).map(m => m[0]))
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] as string))

function main() {
  const langs = fs.readdirSync(DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  if (!langs.includes(BASE)) {
    console.error(`Baseline "${BASE}" nicht gefunden unter ${DIR}`)
    process.exit(2)
  }

  const now = new Date().toISOString()
  const rows: string[] = []
  const sections: string[] = []

  for (const ns of NAMESPACES) {
    const basePath = path.join(DIR, BASE, `${ns}.json`)
    if (!fs.existsSync(basePath)) {
      rows.push(`<tr><td colspan="5" class="warn">❌ Basis-Datei fehlt: ${esc(basePath)}</td></tr>`)
      continue
    }
    const baseMap = walk(readJSON(basePath))

    // Namespace Kopf
    rows.push(`<tr class="ns"><td colspan="5"><strong>Namespace:</strong> ${esc(ns)}</td></tr>`)
    rows.push(`<tr class="head"><th>Sprache</th><th>Fehlende</th><th>Zusätzliche</th><th>Placeholders</th><th>Status</th></tr>`)

    for (const lng of langs) {
      const file = path.join(DIR, lng, `${ns}.json`)
      let missing: string[] = []
      let extra: string[] = []
      let phM: { key: string; base: string[]; target: string[] }[] = []

      if (!fs.existsSync(file)) {
        rows.push(`<tr class="bad"><td>${esc(lng)}</td><td>—</td><td>—</td><td>—</td><td>❌ Datei fehlt</td></tr>`)
        sections.push(`<details open><summary>${esc(lng)}/${esc(ns)} — Datei fehlt</summary><p><code>${esc(file)}</code></p></details>`)
        continue
      }

      const targetMap = walk(readJSON(file))

      for (const k of Object.keys(baseMap)) {
        if (!(k in targetMap)) { missing.push(k); continue }
        const b = Array.from(ph(baseMap[k])).sort()
        const t = Array.from(ph(targetMap[k])).sort()
        if (b.join('|') !== t.join('|')) phM.push({ key: k, base: b, target: t })
      }
      for (const k of Object.keys(targetMap)) {
        if (!(k in baseMap)) extra.push(k)
      }

      const cls = missing.length === 0 && phM.length === 0 ? (extra.length ? 'warn' : 'ok') : 'bad'
      const badge =
        cls === 'ok'   ? '✅ OK' :
        cls === 'warn' ? '⚠ Extra Keys' :
                         '❌ Prüfen'

      rows.push(
        `<tr class="${cls}">
           <td>${esc(lng)}</td>
           <td>${missing.length}</td>
           <td>${extra.length}</td>
           <td>${phM.length}</td>
           <td>${badge}</td>
         </tr>`
      )

      if (missing.length || extra.length || phM.length) {
        let det = `<details><summary>${esc(lng)}/${esc(ns)} – Details</summary>`
        if (missing.length) {
          det += `<h4>Fehlende Keys (${missing.length})</h4><pre>${esc(missing.join('\n'))}</pre>`
        }
        if (extra.length) {
          det += `<h4>Zusätzliche Keys (${extra.length})</h4><pre>${esc(extra.join('\n'))}</pre>`
        }
        if (phM.length) {
          det += `<h4>Platzhalter-Differenzen (${phM.length})</h4><ul>`
          for (const m of phM) {
            det += `<li><code>${esc(m.key)}</code> → base: <em>${esc(m.base.join(', ') || '—')}</em> | target: <em>${esc(m.target.join(', ') || '—')}</em></li>`
          }
          det += `</ul>`
        }
        det += `</details>`
        sections.push(det)
      }
    }
  }

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Locale Vergleichsreport</title>
<style>
:root{--ok:#0a7d2b;--warn:#b8860b;--bad:#b00020;--fg:#1f2937;--bg:#fff;--muted:#6b7280;--tbl:#e5e7eb}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',Arial,'Noto Sans',sans-serif; color:var(--fg); background:var(--bg); margin:24px;}
h1{margin:0 0 8px 0}
.meta{color:var(--muted); margin-bottom:16px}
table{width:100%; border-collapse:collapse; margin:12px 0 24px 0; font-size:14px}
th,td{border:1px solid var(--tbl); padding:8px 10px; text-align:left}
tr.head th{background:#f9fafb}
tr.ns td{background:#eef2ff; font-weight:600}
tr.ok td{background:#ecfdf5}
tr.warn td{background:#fffbeb}
tr.bad td{background:#fef2f2}
details{margin:8px 0 16px 0}
summary{cursor:pointer; font-weight:600}
pre{background:#f9fafb; padding:8px; overflow:auto; border:1px solid var(--tbl)}
.small{font-size:12px; color:var(--muted)}
.footer{margin-top:24px; font-size:12px; color:var(--muted)}
code{background:#f3f4f6; padding:1px 4px; border-radius:3px}
</style>
</head>
<body>
  <h1>Locale Vergleichsreport</h1>
  <div class="meta">
    Basis: <code>${esc(BASE)}</code> · Verzeichnis: <code>${esc(DIR)}</code> · Namespaces: <code>${esc(NAMESPACES.join(', '))}</code><br/>
    Generiert: ${esc(now)}
  </div>

  <table>${rows.join('\n')}</table>

  ${sections.join('\n')}

  <div class="footer">
    Hinweis: Ampelfarben – <span style="color:var(--ok)">OK</span>, <span style="color:var(--warn)">Warnung</span> (nur Extras), <span style="color:var(--bad)">Prüfen</span> (fehlende Keys/Placeholders).
  </div>
</body>
</html>`

  const out = path.resolve('compare-locales-report.html')
  fs.writeFileSync(out, html, 'utf-8')
  console.log(`🌐 HTML-Report geschrieben: ${out}`)
}
main()
