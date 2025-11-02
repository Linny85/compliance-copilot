# 🧩 Agent: `verify-and-fix-i18n-norrly`

**Datei:** `agents/i18n_norrly_fix.yaml`  
**Dokumentation:** `docs/agents/i18n-norrly-fix-guide.md`

---

## 🎯 Zweck

Der Agent überprüft die Konsistenz der **Norrly-Übersetzungen** (`norrly.json`) in allen Sprachen
und behebt automatisch fehlende oder fehlerhafte i18n-Keys (z. B. `nav.ok`, `errors.route_missing`).

Er schützt das System vor unvollständigen Sprachdateien, die sonst Platzhalter-Texte wie `nav.ok` im UI erzeugen.

---

## ⚙️ Unterstützte Sprachen

* 🇩🇪 Deutsch → `public/locales/de/norrly.json`
* 🇬🇧 Englisch → `public/locales/en/norrly.json`
* 🇸🇪 Schwedisch → `public/locales/sv/norrly.json`

---

## 🧱 Funktionsweise (3-Phasen-Prozess)

### **Phase 1 — Scan**

* Prüft jede Sprachdatei auf:
  * Syntaxfehler
  * Fehlende Pflicht-Keys (z. B. `cta.auditList`, `nav.ok`)
  * Überflüssige Kommas
* Gibt einen **JSON-Report** zurück (keine Änderungen).

### **Phase 2 — Dry-Run**

* Erzeugt einen **Vorschau-Patch (unified diff)**, der zeigt, welche Einträge ergänzt würden.
* Nimmt keine Änderungen vor, bis das manuelle Signal **`APPLY I18N FIX`** gesendet wird.

### **Phase 3 — Apply**

* Wendet die Änderungen exakt wie im Dry-Run an.
* Führt anschließend automatisch `pnpm lint` und `pnpm build` aus.
* Erstellt einen Abschluss-Report mit den korrigierten Dateien und Keys.

---

## 🔐 Sicherheitsregeln

* Keine Änderungen an TS/TSX-Dateien oder Hooks.
* Nur `norrly.json` (DE/EN/SV) darf verändert werden.
* Keys dürfen **nicht gelöscht**, nur ergänzt werden.
* Keine anderen i18n-Dateien mergen.
* Ausführung nur nach manuellem Signal **`APPLY I18N FIX`**.

---

## 🚀 Verwendung

1. **Start:**
   ```bash
   agent run verify-and-fix-i18n-norrly
   ```

2. **Ergebnis:**
   * JSON-Report mit `missingKeys` / `syntaxValid`

3. **Freigabe:**  
   Wenn alles korrekt →
   ```
   APPLY I18N FIX
   ```

4. **Test nach Fix:**
   * Browser-Reload (`Strg + Shift + R`)
   * Norrly öffnen → Klick auf „Audit-Übersicht"
   * Erwartet: „Navigiere zu Audit-Übersicht"  
     (kein `nav.ok` sichtbar)

---

## 🧪 Optionaler CI-Trigger

Der Agent kann regelmäßig (z. B. wöchentlich) ausgeführt werden:

```yaml
schedule:
  - "RRULE:FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0"
```

---

## ✅ Erfolgsmeldung (Beispielausgabe)

```json
{
  "fixedFiles": ["public/locales/de/norrly.json"],
  "addedKeys": ["nav.ok", "nav.error"],
  "syntaxValid": true,
  "buildPassed": true,
  "notes": "Norrly navigation texts restored – 404-free."
}
```

---

## 📋 Verwandte Dokumentation

* Agent-Workflow: `agents/i18n_norrly_fix.yaml`
* i18n-Architektur: `docs/i18n-architecture.md`
* CI-Setup: `.github/workflows/i18n-check.yml`
