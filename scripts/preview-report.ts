#!/usr/bin/env ts-node
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawn } from 'node:child_process'

const REPORT = 'compare-locales-report.html'
const PORT_START = 5055

// 1) Falls Report fehlt → zuerst generieren
if (!fs.existsSync(REPORT)) {
  console.log(`ℹ  ${REPORT} nicht gefunden – generiere HTML-Report …`)
  try {
    execSync('npm run i18n:report:html', { stdio: 'inherit' })
  } catch (e) {
    console.error('❌ Report-Erstellung fehlgeschlagen. Prüfe dein Script i18n:report:html.')
    process.exit(1)
  }
}

// 2) Simple static server (Root = Projektverzeichnis)
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
}

function serve(port: number) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    // Standard: ohne Pfad direkt den Report
    const relPath = url.pathname === '/' ? `/${REPORT}` : url.pathname
    const filePath = path.join(process.cwd(), decodeURIComponent(relPath))

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not found')
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      const ctype = mime[ext] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': ctype })
      fs.createReadStream(filePath).pipe(res)
    })
  })

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      // Port belegt → nächster Port
      serve(port + 1)
    } else {
      console.error('❌ Serverfehler:', e.message)
      process.exit(1)
    }
  })

  server.listen(port, () => {
    const url = `http://localhost:${port}/${REPORT}`
    console.log(`✅ Report verfügbar: ${url}`)
    openInBrowser(url)
  })
}

function openInBrowser(url: string) {
  const platform = process.platform
  try {
    if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref()
    } else if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref()
    } else {
      // Linux / WSL / andere
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref()
    }
  } catch {
    console.log('ℹ  Konnte Browser nicht automatisch öffnen. Öffne die URL manuell.')
  }
}

// Start
serve(PORT_START)
