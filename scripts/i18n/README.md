# i18n Automation Scripts

Diese Scripts automatisieren die Verwaltung von i18n-Namespaces und Übersetzungen.

## Scripts

### scaffold-namespaces.ts
Erstellt und sortiert alle Namespace-Dateien für alle unterstützten Sprachen (DE/EN/SV).

**Verwendung:**
```bash
npx tsx scripts/i18n/scaffold-namespaces.ts
```

**Funktionen:**
- Erstellt fehlende Namespace-Dateien mit `{}`
- Sortiert Keys alphabetisch in existierenden Dateien
- Liest Namespaces aus `i18n.namespaces.json`

### validate-missing.ts
Validiert, dass alle Übersetzungen vollständig sind.

**Verwendung:**
```bash
npx tsx scripts/i18n/validate-missing.ts
```

**Funktionen:**
- Vergleicht DE/SV gegen EN (Referenz)
- Findet fehlende Keys
- Findet überflüssige Keys
- Exit Code 1 bei Fehlern

## Workflow

### Neuen Namespace hinzufügen

1. Namespace in `i18n.namespaces.json` eintragen:
```json
{
  "namespaces": [
    "common",
    "admin",
    "new-namespace"
  ]
}
```

2. Dateien generieren:
```bash
npx tsx scripts/i18n/scaffold-namespaces.ts
```

3. EN-Übersetzungen in `public/locales/en/new-namespace.json` hinzufügen

4. DE/SV-Übersetzungen hinzufügen

5. Validieren:
```bash
npx tsx scripts/i18n/validate-missing.ts
```

## CI/CD Integration

Der GitHub Workflow `.github/workflows/i18n-check.yml` läuft automatisch bei:
- Pull Requests mit Änderungen in `public/locales/`
- Pushes zu main

Er validiert, dass:
- Alle Namespaces vollständig übersetzt sind
- Keine uncommitted Änderungen nach Scaffolding existieren
