## 🧩 PR: i18n Sync – Checks Namespace

### 🎯 Summary
This PR syncs all missing translation keys for the `checks` namespace across **EN / DE / SV** and closes **BLOCKER [B-001]** from the QA report.

### 🧱 Changes
- Added complete `checks` namespace (form, labels, actions, errors, severities, etc.) to `src/lib/i18n.ts`
- Verified consistency with `public/locales/{lang}/checks.json`
- Cleaned invalid German quotes („…") in embedded strings
- No functional changes beyond translation sync

### 🧪 Verification
| Step | Result |
|------|---------|
| `/checks/new` renders labels & buttons correctly | ✅ PASS |
| Console shows no `missingKey` warnings | ✅ PASS |
| Cross-language check (EN/DE/SV) | ✅ PASS |
| TypeScript build | ✅ PASS |

### 📸 QA Artifacts
Attach screenshots before/after of `/checks/new` and `/ai-systems/register`.

### 🧰 Dependencies
None.

### 🧩 Linked Issues
- QA-Report [B-001] – i18n Keys Exposed on Checks Form

### ✅ Acceptance Criteria
- [ ] All i18n keys render correctly on `Checks → New Rule`
- [ ] No console warnings
- [ ] Translations available in EN/DE/SV
- [ ] CI passes `check-locales` step

---

> 🧠 **Note:**  
> All new translations must be added to `src/lib/i18n.ts` (embedded), not to JSON files.  
> Run `npm run check-locales` before merging to verify consistency.
