# Sentry Error Tracking Setup

## Übersicht

Das Projekt nutzt Sentry für Production Error Tracking mit:
- ✅ Automatische Fehlererfassung via ErrorBoundary
- ✅ Performance Monitoring (10% Sample Rate)
- ✅ Session Replay bei Fehlern
- ✅ Source Maps für bessere Stack Traces

## Setup

### 1. Sentry-Projekt erstellen

1. Gehe zu [sentry.io](https://sentry.io)
2. Erstelle ein neues Projekt (Platform: React)
3. Kopiere den DSN (Data Source Name)

### 2. DSN konfigurieren

Füge in `.env.production` hinzu:

```env
VITE_SENTRY_DSN=https://your-key@o000000.ingest.sentry.io/0000000
```

### 3. Geschützte Routen

Folgende Routen sind mit ErrorBoundary geschützt:
- `/dashboard`
- `/nis2`
- `/ai-act`
- `/documents`
- `/controls`
- `/checks`
- `/company-profile`

## Testing

### DEV-Test (lokaler Fehler)

Temporär in einer geschützten Komponente hinzufügen:

```tsx
if (import.meta.env.DEV) {
  throw new Error('Test ErrorBoundary');
}
```

**Erwartetes Verhalten:**
- ErrorBoundary-Fallback wird angezeigt
- Fehler wird in Console geloggt
- **Kein** Sentry-Event (nur in PROD aktiv)

### Production-Test

1. App mit `npm run build` bauen
2. Mit Production-Server testen
3. Fehler provozieren
4. In Sentry Dashboard prüfen: Issues → Neues Event sichtbar

## Source Maps Upload (Optional)

Für bessere Stack Traces in Production:

### Via GitHub Action

```yaml
# .github/workflows/deploy.yml
- name: Upload Source Maps to Sentry
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: your-project
  run: |
    npm install -g @sentry/cli
    sentry-cli releases new "${{ github.sha }}"
    sentry-cli releases files "${{ github.sha }}" upload-sourcemaps ./dist
    sentry-cli releases finalize "${{ github.sha }}"
```

### Via Vite Plugin

```bash
npm i -D @sentry/vite-plugin
```

```ts
// vite.config.ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      org: 'your-org',
      project: 'your-project',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

## Konfiguration

### Sample Rates anpassen

In `src/lib/sentry.ts`:

```ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,          // 10% Performance Monitoring
  replaysSessionSampleRate: 0.1,  // 10% Session Replay
  replaysOnErrorSampleRate: 1.0,  // 100% bei Fehlern
});
```

### Eigene Fehler tracken

```tsx
import * as Sentry from '@sentry/react';

try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'documents' },
    extra: { userId: user.id },
  });
}
```

## Troubleshooting

### Sentry-Events erscheinen nicht

1. ✅ DSN korrekt in `.env.production`?
2. ✅ `import.meta.env.PROD === true`?
3. ✅ Netzwerk-Tab zeigt POST zu `sentry.io`?

### Source Maps fehlen

1. ✅ `build.sourcemap: true` in `vite.config.ts`?
2. ✅ Source Maps werden hochgeladen (CI oder manuell)?
3. ✅ Release-Version matcht (`sentry-cli releases list`)?

### Zu viele Events

Sample Rates reduzieren:

```ts
tracesSampleRate: 0.01,  // 1% statt 10%
```

Oder Filter hinzufügen:

```ts
Sentry.init({
  beforeSend(event, hint) {
    // Ignoriere bestimmte Fehler
    if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
      return null;
    }
    return event;
  },
});
```

## Best Practices

- ✅ Nur in Production aktivieren
- ✅ Sensitive Daten filtern (`beforeSend`)
- ✅ Sample Rates niedrig halten (Kosten!)
- ✅ Source Maps hochladen für Debugging
- ✅ Releases taggen mit Git SHA
- ✅ User Context setzen (nach Login)

```ts
Sentry.setUser({
  id: user.id,
  email: user.email,
});
```
