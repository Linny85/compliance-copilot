# 🌐 Internationalization (i18n) - README Snippet

> **Instructions:** Copy this section into your main `README.md` file at an appropriate location (e.g., after the project description or before the development section).

---

## 🌐 Internationalization (i18n)

This project uses a **fully automated i18n validation system** with CI enforcement to ensure translation consistency across all supported locales.

[![i18n Consistency](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/i18n-check.yml/badge.svg)](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/i18n-check.yml)

### Key Features

- ✅ **Structure validation** – All locales match EN reference structure
- ✅ **Placeholder parity** – Strict enforcement of `{placeholders}` consistency
- ✅ **EN drift detection** – Automatic snapshot guard for reference locale changes
- ✅ **Priority-2 coverage** – 18 European languages validated on every PR
- ✅ **GitHub Actions annotations** – Precise error markers in CI

### Quick Commands

```bash
# Validate all locales
node scripts/check-locales.js --ref en

# Check DPIA structure (Priority-2)
node scripts/check-dpia-keys.js

# Show differences
node scripts/check-locales.js --ref en --diff

# Auto-fix missing keys
node scripts/check-locales.js --ref en --fix

# Verify EN snapshot
node scripts/snapshot-dpia-keys.js

# Update EN snapshot (after schema changes)
node scripts/snapshot-dpia-keys.js --update
```

### Documentation

- 📖 **[i18n Developer Guide](docs/i18n-guide.md)** – Commands, best practices, error fixes
- 🏗️ **[i18n Architecture](docs/i18n-architecture.md)** – Technical overview, CI flow, diagrams

### CI Integration

The GitHub Actions workflow automatically:

1. Validates locale structure against EN reference
2. Checks DPIA keyset with placeholder enforcement
3. Detects EN schema drift via snapshot comparison
4. Provides detailed annotations for any issues

**Note:** Replace `YOUR_ORG/YOUR_REPO` in the badge URL with your actual GitHub organization and repository name.

---

**Supported Locales:** EN (reference), DE, SV, DA, NO, FI, IS, FR, IT, ES, PT, RO, CA, NL, PL, CS, SK, SL, HR, HU, BG, EL, ET, LV, LT, GA, MT
