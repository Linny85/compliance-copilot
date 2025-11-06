# i18n JSON Validation

## Automatische Validierung

Das Projekt enthält ein Validierungsskript für alle i18n-JSON-Dateien.

### Script ausführen

```bash
node tools/validate-locales.mjs
```

### NPM Script hinzufügen

Da `package.json` schreibgeschützt ist, füge dieses Script manuell hinzu:

```json
{
  "scripts": {
    "validate:locales": "node tools/validate-locales.mjs"
  }
}
```

Dann kannst du es ausführen mit:

```bash
npm run validate:locales
```

## Was wird geprüft?

- ✅ JSON-Syntax-Validität
- ⚠️  Trailing Commas (Warnung)
- 🧹 Automatische Entfernung von Kommentaren beim Parsen

## Häufige Fehler

### 1. Trailing Comma

```json
{
  "key": "value",  ← Fehler: Komma vor }
}
```

**Fix:**
```json
{
  "key": "value"
}
```

### 2. Nicht-escapte Anführungszeichen

```json
{
  "text": "He said "hello""  ← Fehler
}
```

**Fix:**
```json
{
  "text": "He said \"hello\""
}
```

### 3. Kommentare (in JSON verboten)

```json
{
  // Dies ist ein Kommentar  ← Fehler
  "key": "value"
}
```

**Fix:**
```json
{
  "key": "value"
}
```

## Pre-commit Hook (Optional)

Füge zu `.husky/pre-commit` hinzu:

```bash
#!/bin/sh
node tools/validate-locales.mjs
```

Oder mit `lint-staged`:

```json
{
  "lint-staged": {
    "public/locales/**/*.json": "node tools/validate-locales.mjs"
  }
}
```

## CI/CD Integration

Das Script ist bereits in `.github/workflows/i18n-check.yml` integriert.
