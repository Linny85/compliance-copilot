# Phase 2 – Technischer Status (Stand 2025-12-05)

## Build-Status
- `npm run build` ✅
- Ergebnis: Build erfolgreich; einziges Signal sind die bekannten Vite-Warnungen zum gemeinsam genutzten Supabase-Client (statischer + dynamischer Import). Keine Hard-Errors.

## Lint-Status
- `npm run lint` ❌ – schlägt weiterhin fehl.
- Hauptquellen der verbleibenden Errors:
  - `src/pages/admin/**` (TestPhase3/4, Redirects) – viele `any`-Typen und harte Strings.
  - `src/testmode/**` – überwiegend `any`/`no-empty` und i18n-Regeln.
  - Supabase Edge Functions (`supabase/functions/**`) – hunderte historische `any`-Typen & leere Catch-Blöcke.
  - Legacy Tests (`tests/**/*.spec.ts`) – verbotene `require`, Playwright-Hooks etc.
- Kern-Dateien, die in Phase 2 behandelt wurden (`vite.config.ts`, `tailwind.config.ts`, `src/state/AppModeProvider.tsx`, `src/utils/i18nSafe.ts`, `src/i18n/init.ts`, `supabase/functions/_shared/{aiClient,audit,crypto,locale,openaiClient}.ts`, Landing/branding assets) sind lint-sauber bzw. enthalten keine harten Errors mehr.

## Test-Status
- `npm test` ✅ – Vitest läuft jetzt über 47 Tests/5 Dateien komplett durch; Playwright-E2E bleiben separat (`npx playwright test`) und werden bewusst nicht im Default-Run gestartet.
- Aussage: "Unit-Suite grün, Playwright-/Legacy-Tests weiterhin ausstehend, saubere Trennung folgt in der Playwright-Aufgabe."

## Branding & Secrets
- `rg -i "legacy brand"` (ehem. externe Bezeichnung) → keine Treffer mehr im Code; letzte Prüfung direkt nach Phase 2.
- `/.env` bleibt in `.gitignore`; keine Secrets eingecheckt.
- Favicon, OG-Tags, Landing-Texte und neue `public/locales/*/landing.json` referenzieren jetzt konsequent "Compliance Copilot".

## Supabase / AI
- Neues `supabase/functions/_shared/aiClient.ts` ersetzt das zuvor brand-spezifische Gateway und erzeugt jetzt generische OpenAI-Aufrufe.
- Helpbot-Funktionen sowie `verify-master` sind auf den neuen Provider und das generische Gateway umgestellt.
- Shared Helper (`audit`, `crypto`, `locale`, `openaiClient`) wurden von `any`-Casts und leeren Catch-Blöcken befreit.

- Migration `20251110091545_7f5a8e9c-4fbc-4ce5-a3c1-7dd0a9ab90c5.sql` erweitert `Unternehmen` um tier/expiry/origin/notes-Spalten; Typdefinitionen (`src/integrations/supabase/types.ts`) sind synchron.
- Shared Helper: `_shared/license.ts` liefert `getLicenseStatus` & `assertLicense`, `_shared/origin.ts` kapselt Host-Parsen/CORS-Enforcement und wird via `_shared/access.ts` re-exportiert.
- Edge Functions: alle helpbot-Einstiegspunkte (`helpbot-chat`, `helpbot-ingest`, `helpbot-query`, `helpbot-upload`, `helpbot-memory-train`, `helpbot-healthcheck`, `helpbot-feedback`), `send-email`, `create-evidence-request`, `submit-evidence`, die QA/ops-Monitor-Flows (`update-qa-monitor*`, `update-ops-dashboard`, `ops-digest`/`send-ops-digest`) sowie `create-tenant` setzen jetzt `assertOrigin` + `assertLicense` durch.
- Endpoint: neue Edge Function `license-status` liefert tenant-spezifische Lizenzinformationen über `GET /functions/v1/license-status` inkl. `assertOrigin`, `requireUserAndTenant` und CORS-Härtung.
- Frontend: neuer Hook `useTenantLicense`, Header-Badge (`TenantLicenseBadge`) und Warn-Banner (`TenantLicenseNotice`) visualisieren aktiven/abgelaufenen Status + Link zu licensing.
- Tests & Build: `npm test` ✅ (Vitest 47 Tests/5 Dateien), `npm run build` ✅ (nur bekannte Vite-Warnungen zu Supabase-Client/Browserslist).
- `npm run lint` schlägt weiterhin wegen bekannter Altlasten (`helpbot-*`, `send-email`, `admin/`, `testmode/`) fehl – neue License/Origin-Dateien sind lint-sauber.

## Offene Baustellen für später
- Restliches Lint-Schuldenpaket in `admin/`, `testmode/`, Supabase Edge Functions.
- Test-Suite-Struktur: Vitest vs. Playwright sauber trennen, fehlende Bibliotheken installieren, ggf. Tests kategorisieren.
- Weitere E2E-Abdeckung und Refactors (z. B. `helpbot`-Pipelines, Compliance-Dashboards) nach dem Freeze evaluieren.
- Neue License-Layer-Helper (`_shared/license.ts`, `_shared/access.ts`) besitzen noch keine Vitest-Abdeckung; Suite `tests/unit/license*.test.ts`/`access*.test.ts` muss erst angelegt werden.

## Empfohlene Commit-Struktur
(Basis: `git status -sb`, `git diff --stat`)

1. **Commit 1: Branding & Landing**
   - Dateien: `index.html`, `public/favicon.ico`, `public/cc-favicon.svg`, `public/locales/*/landing.json`, aktualisierte Landing-Texte.
   - Message-Vorschlag: `chore(branding): replace legacy branding with Compliance Copilot`

2. **Commit 2: AI-Client & Supabase Functions**
   - Dateien: `supabase/functions/_shared/aiClient.ts`, Entfernen des alten provider-spezifischen Clients, Änderungen in `supabase/functions/_shared/{audit,crypto,locale,openaiClient}.ts` sowie `supabase/functions/helpbot-*.ts`, `supabase/functions/verify-master/index.ts`.
   - Message-Vorschlag: `refactor(ai): replace legacy gateway with generic aiClient`

3. **Commit 3: i18n & Core-Helpers**
   - Dateien: `src/i18n/init.ts`, `src/utils/i18nSafe.ts`, `src/state/AppModeProvider.tsx`, zugehörige locale JSONs falls nötig.
   - Message-Vorschlag: `chore(i18n): harden core i18n helpers and app mode`

4. **Commit 4: Tooling & Tests**
   - Dateien: `vite.config.ts`, `tailwind.config.ts`, `package.json`, `package-lock.json`, `tests/e2e/dashboard-tenant-banner.spec.ts`, sonstige ESLint/Tailwind/Vitest Anpassungen.
   - Message-Vorschlag: `chore(tooling): clean lint in config and wire vitest`

5. **Commit 5: Docs & Status**
   - Dateien: `docs/edge-qa-handbook.md`, `TECH_STATUS_PHASE2.md`.
   - Message-Vorschlag: `docs: update QA handbook and add tech status`

> Hinweis: Reihenfolge stellt Branding und Infrastruktur nach außen vor an oberste Stelle, gefolgt von Backend-Änderungen, Core-Libs, Tooling und schließlich Dokumentation. Keine Commits wurden erstellt; dies ist lediglich der Plan.

## Phase 1 – Clean Core Verification (Stand 2025-12-05)

### Build
- `npm run build` ✅
- Warnings dokumentiert für Nachverfolgung:
   - Browserslist-Datenbank ist veraltet (`npx update-browserslist-db@latest --update-db`).
   - Vite warnt weiterhin über den gemischten statischen/dynamischen Import im Supabase-Client (`src/integrations/supabase/client.ts`) – muss später bereinigt werden.
   - `dist/assets/index-C_PH0ZSm.js` überschreitet 500 kB (Chunk-Splitting oder Code-Splitting prüfen).

### Lint
- `npm run lint` ❌
- Fehlerschwerpunkte (Top 5 Dateien nach Fehlerdichte):
   1. `src/pages/admin/TestPhase4.tsx` – zweistellige `any`-Typen und React-Fast-Refresh-Warnungen.
   2. `src/pages/admin/TestPhase3.tsx` – breit gestreute `any`-Typen plus harte Strings.
   3. `src/pages/admin/TestI18n.tsx` und `TestI18nPatches.tsx` – `any`-Typen, harte Strings und Regelverstöße.
   4. `src/testmode/http.ts` und begleitende Utils – `any`-Typen sowie leere Blocks.
   5. Supabase Edge Functions (`supabase/functions/**`) – hunderte historische `any`-Typen (z. B. `create-tenant`, `helpbot-*`, `run-checks`).
- Zusätzliche Hinweise: Admin-Seiten enthalten viele i18n-Verstöße; Tests (`tests/components/dashboard/RecentAuditReports.test.tsx`, `tests/fixtures.ts`) melden verbotene `require` und Hook-Verstöße.

### Tests
- `npm test -- --watch=false` ❌
- Aktuelle Failure-Gruppen:
   - **Playwright-Suites (27 Dateien, z. B. `tests/e2e/01-i18n-and-console.spec.ts`, `tests/e2e/dashboard-summary.spec.ts`)** laufen unter Vitest und werfen "Playwright Test did not expect test()/describe()". Trennung Unit vs. Playwright-Runner noch ausstehend.
   - **Component-Test `tests/components/dashboard/RecentAuditReports.test.tsx`** bricht ab, weil `@testing-library/react` nicht installiert ist.
   - **i18n-Schema-Tests** schlagen fehl: JSON-Syntaxfehler (`public/locales/.../incidents.json`) sowie Uneinigkeit der Keys in `common`, `helpbot`, `scope`, `aiSystems`, `evidence`, `training`, `norrly` etc.
   - **Unit-Test `tests/unit/helpers.spec.ts`** erwartet, dass `toPct(1.2)` → `120`. Implementierung liefert aktuell `1` → Logikprüfung nötig.

- `rg -n -i "altes Branding" .` → keine Treffer (Exit-Code 1 wegen „nothing found“). Frühere Branding-Begriffe sind damit weiterhin entfernt.
- `.env` bleibt ignoriert, keine neuen Secrets im Repo.

### Repository Snapshot
- `git status -sb` → Arbeitsbaum dirty ggü. `origin/main`; diverse Dateien verändert (Branding, locales, Supabase-Helper) plus neue Artefakte (`TECH_STATUS_PHASE2.md`, `public/cc-favicon.svg`, `public/locales/*/landing.json`, `supabase/functions/_shared/aiClient.ts`).
- `git diff --stat` → 44 Dateien geändert (≈876 Insertions / 1 471 Deletions); größte Blöcke in `package-lock.json` und Supabase-Hilfen.

### Offene Punkte für Phase „Clean Access / Security-Layer“
1. Playwright-Suites aus Vitest-Pipeline trennen oder über `npx playwright test` fahren, bevor Access-Hardening beginnt.
2. Lint-Blocker in Admin/Testmode/Edge-Funktionen abbauen (insb. `any`-Typen, leere Catch-Blöcke, i18n-Regeln).
3. i18n-JSONs reparieren (Syntax, Key-Angleichung) und fehlende Packages für React-Tests installieren.
4. Datenpunkte aus `git diff --stat` auf bevorstehende Security-Änderungen aufteilen, um Cherry-Picks zu erleichtern.
