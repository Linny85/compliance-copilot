# Sentry Integration – Acceptance Checklist

## Setup-Phase

### GitHub Secrets ✓
- [ ] `SENTRY_AUTH_TOKEN` in GitHub Secrets gesetzt
- [ ] `SENTRY_ORG` in GitHub Secrets gesetzt
- [ ] `SENTRY_PROJECT` in GitHub Secrets gesetzt
- [ ] `VITE_SENTRY_DSN` in GitHub Secrets gesetzt

### Lokale Konfiguration (Optional)
- [ ] `.env.production` enthält `VITE_SENTRY_DSN`
- [ ] `.env.production` enthält `VITE_APP_VERSION` (oder wird durch CI gesetzt)

## Build-Phase ✓

### Source Maps
- [ ] `npm run build` erzeugt `.map`-Dateien in `dist/`
  ```bash
  ls dist/assets/*.js.map
  # Sollte Dateien zeigen
  ```

### CI/CD Workflow
- [ ] GitHub Action `.github/workflows/sentry-release.yml` existiert
- [ ] Action läuft durch bei Push zu `main`
- [ ] Workflow zeigt in Logs:
  - ✓ "Release created"
  - ✓ "Source maps uploaded"
  - ✓ "Release finalized"

**Check:**
```bash
# In GitHub: Actions Tab → Sentry Release Workflow → Latest Run
# Alle Steps grün?
```

## Runtime-Phase ✓

### Sentry Dashboard
- [ ] Gehe zu [sentry.io/issues](https://sentry.io/issues)
- [ ] Provoziere einen Fehler in Production
- [ ] Neues Event erscheint in Sentry Issues

### Release-Version
- [ ] Sentry-Event zeigt korrekte **Release-Version** (Git SHA)
  - In Sentry: Issue → Event Details → Release
  - Sollte `<git-sha>` sein (z.B. `abc123def456...`)

### Source Maps funktionieren
- [ ] Stack Trace in Sentry zeigt **ent-minifizierte** Dateinamen
  - ❌ **Falsch**: `main.abc123.js:1:2345`
  - ✅ **Richtig**: `Dashboard.tsx:42`
- [ ] Quellcode-Kontext sichtbar (Original TypeScript/JSX)

### User Context
- [ ] Event enthält **User ID**
  - In Sentry: Event → User → ID
- [ ] Email ist **maskiert** (z.B. `jo***@example.com`)
- [ ] Event enthält **Tenant Context**
  - In Sentry: Event → Contexts → tenant → tenant_id

**Test-Skript:**
```tsx
// Temporär in Dashboard.tsx
useEffect(() => {
  if (import.meta.env.PROD) {
    console.log('[Sentry Test] User:', user?.id, 'Tenant:', tenantId);
    throw new Error('Sentry Integration Test - User Context');
  }
}, []);
```

Nach Test: Code wieder entfernen!

### PII-Schutz
- [ ] Emails sind maskiert (`ab***@domain.com`)
- [ ] Keine `Authorization` Header in Events
- [ ] Keine `Cookie` Header in Events

**Check in Sentry:**
- Event → Request → Headers
- Sollte **keine** Authorization/Cookie zeigen

## Performance Monitoring ✓

### Navigation Tracking
- [ ] Sentry Dashboard → Performance
- [ ] Transactions für Routes sichtbar:
  - `/dashboard`
  - `/nis2`
  - `/documents`
  - etc.

**Erwartete Werte:**
- Page Load: < 2s (LCP)
- Navigation: < 500ms
- Sample Rate: ~10% der Requests

## Fehlerbehandlung ✓

### ErrorBoundary
- [ ] White-Screen wird durch ErrorBoundary-Fallback ersetzt
- [ ] Fallback zeigt freundliche Fehlermeldung
- [ ] In DEV: Stack Trace sichtbar
- [ ] In PROD: Fehler wird zu Sentry gesendet

### Chunk Load Errors gefiltert
- [ ] `ChunkLoadError` wird **nicht** zu Sentry gesendet
  - Check in `src/lib/sentry.ts` → `beforeSend`

## Dokumentation ✓

- [ ] `docs/sentry-setup.md` existiert
- [ ] `docs/sentry-acceptance-checklist.md` existiert (diese Datei)
- [ ] Team-Mitglieder wissen, wo Sentry Dashboard ist

## Rollback-Plan

Falls Probleme auftreten:

```bash
# 1. Sentry deaktivieren
# In .env.production:
# VITE_SENTRY_DSN=  # leer lassen

# 2. Workflow pausieren
# In GitHub: Settings → Actions → Disable workflow

# 3. Source Maps Upload rückgängig (optional)
sentry-cli releases delete <release-version>
```

## Kosten-Check

- [ ] Sentry Dashboard → Settings → Usage
- [ ] Überprüfe:
  - **Errors**: < Budget pro Monat
  - **Transactions**: ~10% Sampling aktiv?
  - **Replays**: Nur bei Fehlern (100%) + 10% normal

Falls zu teuer:
```ts
// In src/lib/sentry.ts
tracesSampleRate: 0.01,  // 1% statt 10%
replaysSessionSampleRate: 0.0,  // Aus
```

## Erfolgs-Kriterien

✅ **Muss erfüllt sein:**
- Source Maps in Sentry sichtbar (ent-minifiziert)
- User Context gesetzt (ID + Tenant)
- PII geschützt (Email maskiert)
- ErrorBoundary fängt Fehler ab

✅ **Nice-to-have:**
- Performance Monitoring aktiv
- Navigation Transactions sichtbar
- < 5% zusätzliche Bundle Size durch Sentry SDK

## Finale Smoke Tests

```bash
# 1. Production Build
npm run build

# 2. Preview Production Build lokal
npx vite preview

# 3. Browser öffnen → DevTools → Network
# - Sentry POST Requests sichtbar?

# 4. Provoziere Fehler (temporär)
# throw new Error('Production Test');

# 5. In Sentry Dashboard: Event erschienen?

# 6. Stack Trace zeigt Original-Code?
```

**Alles grün? → Integration erfolgreich! 🎉**
