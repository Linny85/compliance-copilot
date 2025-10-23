#!/usr/bin/env ts-node

/**
 * verify-locales.ts
 * Prüft die Konsistenz aller Locale-Dateien gegenüber einer Basissprache (default: en).
 * Features:
 *  - JSON-Validität
 *  - Fehlende/zusätzliche Keys
 *  - Platzhalter-Konsistenz ({{foo}} / {count})
 *  - --fix: fehlende Keys automatisch mit EN auffüllen
 *
 * Usage:
 *   ts-node scripts/verify-locales.ts
 *   ts-node scripts/verify-locales.ts --base en --dir public/locales --ns common --fix
 */

import fs from 'node:fs'
import path from 'node:path'

type Dict = Record<string, any>

type Options = {
  dir: string
  base: string
  namespaces: string[]
  fix: boolean
}

const argv = process.argv.slice(2)
function getFlag(name: string, def?: string) {
  const i = argv.findIndex(a => a === `--${name}`)
  if (i >= 0) return argv[i + 1]
  return def
}
function hasFlag(name: string) {
  return argv.includes(`--${name}`)
}

const opts: Options = {
  dir: getFlag('dir', 'public/locales')!,
  base: getFlag('base', 'en')!,
  namespaces: (getFlag('ns', 'common')!).split(',').map(s => s.trim()).filter(Boolean),
  fix: hasFlag('fix'),
}

const IGNORE_KEYS = new Set<string>(['_meta']) // ggf. erweitern

function walk(obj: any, prefix = ''): Record<string, string> {
  const res: Record<string, string> = {}
  if (obj === null || obj === undefined) return res
  for (const [k, v] of Object.entries(obj)) {
    if (IGNORE_KEYS.has(k)) continue
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) {
      Object.assign(res, walk(v, key))
    } else {
      res[key] = String(v ?? '')
    }
  }
  return res
}

function unflatten(obj: Dict): Dict {
  const root: Dict = {}
  for (const [k, v] of Object.entries(obj)) {
    const parts = k.split('.')
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (i === parts.length - 1) {
        cur[p] = v
      } else {
        cur[p] = cur[p] ?? {}
        cur = cur[p]
      }
    }
  }
  return root
}

function readJSON(p: string): Dict {
  const raw = fs.readFileSync(p, 'utf-8')
  try {
    return JSON.parse(raw)
  } catch (e: any) {
    throw new Error(`JSON parse error in ${p}: ${e?.message}`)
  }
}

function writeJSON(p: string, data: Dict) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

const PLACEHOLDER_RE = /(\{\{\s*[\w.-]+\s*\}\})|(\{[\w.-]+\})/g

function extractPlaceholders(s: string): Set<string> {
  const set = new Set<string>()
  for (const m of s.matchAll(PLACEHOLDER_RE)) {
    set.add(m[0])
  }
  return set
}

function compare(nsPath: string, baseMap: Record<string, string>, targetMap: Record<string, string>) {
  const missing: string[] = []
  const extra: string[] = []
  const placeholderMismatches: { key: string; base: string[]; target: string[] }[] = []

  // fehlende + placeholder check
  for (const key of Object.keys(baseMap)) {
    if (!(key in targetMap)) {
      missing.push(key)
      continue
    }
    const basePH = Array.from(extractPlaceholders(baseMap[key])).sort()
    const tgtPH = Array.from(extractPlaceholders(targetMap[key])).sort()
    if (basePH.join('|') !== tgtPH.join('|')) {
      placeholderMismatches.push({ key, base: basePH, target: tgtPH })
    }
  }

  // zusätzliche
  for (const key of Object.keys(targetMap)) {
    if (!(key in baseMap)) extra.push(key)
  }

  return { missing, extra, placeholderMismatches }
}

function ensureFile(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    writeJSON(p, {})
  }
}

function run(): number {
  let exitCode = 0
  console.log(`🔎 Verifiziere Locales in "${opts.dir}" gegen Basis "${opts.base}" | Namespaces: ${opts.namespaces.join(', ')}${opts.fix ? ' | FIX-MODUS' : ''}`)

  const langs = fs.readdirSync(opts.dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  if (!langs.includes(opts.base)) {
    console.error(`❌ Basissprache "${opts.base}" nicht gefunden unter ${opts.dir}`)
    return 2
  }

  for (const ns of opts.namespaces) {
    const basePath = path.join(opts.dir, opts.base, `${ns}.json`)
    if (!fs.existsSync(basePath)) {
      console.error(`❌ Basis-Datei fehlt: ${basePath}`)
      exitCode = 2
      continue
    }

    const baseJSON = readJSON(basePath)
    const baseMap = walk(baseJSON)

    for (const lng of langs) {
      const file = path.join(opts.dir, lng, `${ns}.json`)
      ensureFile(file)
      const targetJSON = readJSON(file)
      const targetMap = walk(targetJSON)

      const { missing, extra, placeholderMismatches } = compare(file, baseMap, targetMap)

      if (missing.length === 0 && extra.length === 0 && placeholderMismatches.length === 0) {
        console.log(`✅ ${lng}/${ns}.json — OK`)
        continue
      }

      if (missing.length) {
        exitCode = 1
        console.warn(`⚠  ${lng}/${ns}.json — fehlende Keys (${missing.length}):`)
        for (const k of missing) console.warn(`   • ${k}`)
      }
      if (extra.length) {
        // extra ist nur Warnung, nicht zwingend Fehler
        console.warn(`ℹ  ${lng}/${ns}.json — zusätzliche Keys (${extra.length}):`)
        for (const k of extra) console.warn(`   • ${k}`)
      }
      if (placeholderMismatches.length) {
        exitCode = 1
        console.warn(`⚠  ${lng}/${ns}.json — Platzhalter-Unterschiede:`)
        for (const m of placeholderMismatches) {
          console.warn(`   • ${m.key} :: base=${m.base.join(', ') || '—'} | target=${m.target.join(', ') || '—'}`)
        }
      }

      if (opts.fix && missing.length) {
        // fehlende Keys mit EN auffüllen
        const patched = { ...targetMap }
        for (const k of missing) patched[k] = baseMap[k]
        const nested = unflatten(patched)
        writeJSON(file, nested)
        console.log(`🛠  ${lng}/${ns}.json — fehlende Keys ergänzt (aus ${opts.base})`)
      }
    }
  }

  if (exitCode === 0) {
    console.log('🎉 Alle Locales konsistent.')
  } else if (exitCode === 1) {
    console.log('⚠ Unterschiede gefunden. (CI: schlägt fehl). Verwende --fix zum Auffüllen.')
  } else {
    console.log('❌ Fehlerhafte Konfiguration oder Basis-Dateien fehlen.')
  }

  return exitCode
}

process.exit(run())
