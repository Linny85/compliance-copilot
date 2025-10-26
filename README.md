# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/332bd2a0-5379-4f3a-9f2f-6f83c17c9a6e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/332bd2a0-5379-4f3a-9f2f-6f83c17c9a6e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/332bd2a0-5379-4f3a-9f2f-6f83c17c9a6e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 🌐 Internationalization (i18n)

This project uses a **fully automated i18n validation system** with CI enforcement to ensure translation consistency across all supported locales.

[![i18n Consistency](https://github.com/Linny85/nis2-ai-guard/actions/workflows/i18n-check.yml/badge.svg)](https://github.com/Linny85/nis2-ai-guard/actions/workflows/i18n-check.yml)

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

- 📖 **[i18n Quick Start Guide](README_I18N.md)** – Essential workflow and usage guide
- 📖 **[i18n Developer Guide](docs/i18n-guide.md)** – Commands, best practices, error fixes
- 🏗️ **[i18n Architecture](docs/i18n-architecture.md)** – Technical overview, CI flow, diagrams
- 🔧 **[i18n Workflow](docs/i18n-workflow.md)** – Complete translation workflow and maintenance
- 🧪 **[i18n CI Setup](docs/i18n-ci-setup.md)** – GitHub Actions configuration and testing

### CI Integration

The GitHub Actions workflow automatically:

1. Validates locale structure against EN reference
2. Checks DPIA keyset with placeholder enforcement
3. Detects EN schema drift via snapshot comparison
4. Provides detailed annotations for any issues

---

**Supported Locales:** EN (reference), DE, SV, DA, NO, FI, IS, FR, IT, ES, PT, RO, CA, NL, PL, CS, SK, SL, HR, HU, BG, EL, ET, LV, LT, GA, MT
