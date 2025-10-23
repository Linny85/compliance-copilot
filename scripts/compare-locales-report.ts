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
const fmt = (s: string[]) => (s && s.length ? s.join(', ') : '—')

function main() {
  const langs = fs.readdirSync(DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name)

  if (!langs.includes(BASE)) {
    console.error(`Baseline "${BASE}" nicht gefunden unter ${DIR}`)
    process.exit(2)
  }

  let md: string[] = []
  md.push(`# Locale Vergleichsreport`)
  md.push(`- Basis: \`${BASE}\``)
  md.push(`- Verzeichnis: \`${DIR}\``)
  md.push(`- Namespaces: \`${NAMESPACES.join(', ')}\``)
  md.push(`- Generiert: ${new Date().toISOString()}`)
  md.push('')

  for (const ns of NAMESPACES) {
    const basePath = path.join(DIR, BASE, `${ns}.json`)
    if (!fs.existsSync(basePath)) {
      md.push(`\n## Namespace \`${ns}\`\n❌ Basis-Datei fehlt: \`${basePath}\`\n`)
      continue
    }
    const baseMap = walk(readJSON(basePath))
    md.push(`\n## Namespace \`${ns}\``)

    // Übersichtstabelle
    md.push(`\n| Sprache | Fehlende | Zusätzliche | Platzhalter-Mismatches |`)
    md.push(`|:--|--:|--:|--:|`)

    const details: string[] = []

    for (const lng of langs) {
      const file = path.join(DIR, lng, `${ns}.json`)
      if (!fs.existsSync(file)) {
        details.push(`\n### ${lng}/${ns}.json\n❌ Datei fehlt: \`${file}\``)
        md.push(`| ${lng} | — | — | — |`)
        continue
      }
      const targetMap = walk(readJSON(file))

      const missing: string[] = []
      const extra: string[] = []
      const phM: { key: string; base: string[]; target: string[] }[] = []

      for (const k of Object.keys(baseMap)) {
        if (!(k in targetMap)) { missing.push(k); continue }
        const b = Array.from(ph(baseMap[k])).sort()
        const t = Array.from(ph(targetMap[k])).sort()
        if (b.join('|') !== t.join('|')) phM.push({ key: k, base: b, target: t })
      }
      for (const k of Object.keys(targetMap)) {
        if (!(k in baseMap)) extra.push(k)
      }

      md.push(`| ${lng} | ${missing.length} | ${extra.length} | ${phM.length} |`)

      if (missing.length || extra.length || phM.length) {
        details.push(`\n### ${lng}/${ns}.json`)
        if (missing.length) {
          details.push(`**Fehlende Keys (${missing.length}):**\n\`\`\`\n${missing.join('\n')}\n\`\`\``)
        }
        if (extra.length) {
          details.push(`**Zusätzliche Keys (${extra.length}):**\n\`\`\`\n${extra.join('\n')}\n\`\`\``)
        }
        if (phM.length) {
          details.push(`**Platzhalter-Differenzen (${phM.length}):**`)
          for (const m of phM) {
            details.push(`- \`${m.key}\` → base: ${fmt(m.base)} | target: ${fmt(m.target)}`)
          }
        }
      }
    }
    md.push(...details)
  }

  const out = path.resolve('compare-locales-report.md')
  fs.writeFileSync(out, md.join('\n') + '\n', 'utf-8')
  console.log(`📄 Report geschrieben: ${out}`)
}
main()
