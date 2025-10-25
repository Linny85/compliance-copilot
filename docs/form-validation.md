# Form Validation & Accessibility

This project includes automated tooling to ensure all form inputs meet accessibility and browser autofill requirements.

## Quick Start

```bash
# Check for form issues
npm run lint

# Auto-fix most issues (dry-run first)
npx jscodeshift -d -p -t codemods/add-form-attrs.js "src/**/*.{tsx,jsx}"

# Apply fixes
npx jscodeshift -t codemods/add-form-attrs.js "src/**/*.{tsx,jsx}"

# Runtime audit in browser console
auditForms()
```

## Tools

### 1. ESLint Plugin (`tools/eslint-plugin-norrland`)

Custom ESLint rules that check:
- **`norrland/input-has-name-or-id`** (error): Every input must have at least `id` or `name`
- **`norrland/input-has-autocomplete`** (warn): Input fields should have proper `autoComplete` attribute
- **`jsx-a11y/label-has-associated-control`** (error): Labels must be properly associated

### 2. Codemod (`codemods/add-form-attrs.js`)

Automatically adds:
- Missing `id` (derived from `name` or placeholder)
- Missing `name` (derived from `id`)
- Smart `autoComplete` values based on field name

**Exceptions:**
- Skips `type="hidden"` inputs
- Can be configured to ignore vendor/generated files

### 3. Runtime Audit (`src/lib/auditForms.ts`)

Browser-based validation:
```javascript
// In browser console or during development
auditForms()
```

Returns array of issues found in the current DOM.

## Using the Safe Input Component

Instead of raw `<input>` elements, use the provided component:

```tsx
import { Input } from "@/components/Form/Input";

// Automatically gets:
// - id="email" (from name)
// - autoComplete="email" (smart detection)
// - Proper label association
// - Error message handling
<Input 
  name="email"
  label="Email Address"
  type="email"
  required
  error={errors.email?.message}
/>
```

## Autocomplete Mapping

The system recognizes these field names and applies appropriate autocomplete values:

| Field Name Pattern | Autocomplete Value |
|-------------------|-------------------|
| email | email |
| username, user | username |
| password | current-password |
| newPassword | new-password |
| firstName, givenName | given-name |
| lastName, familyName | family-name |
| street, address | address-line1 |
| city | address-level2 |
| state | address-level1 |
| postalCode, zip | postal-code |
| country | country |
| phone, tel | tel |
| company, organization | organization |
| vat, vatId, taxId | tax-id |
| otp, oneTimeCode | one-time-code |
| birthday, bday | bday |
| ccName | cc-name |
| ccNumber | cc-number |

## CI/CD Integration

### GitHub Actions

The `.github/workflows/lint-forms.yml` workflow runs on:
- Pull requests touching form files
- Pushes to `main`

It will fail the build if form accessibility issues are found.

### Pre-commit Hook (Optional)

```bash
npm install -D husky
npx husky init
echo 'npm run lint' > .husky/pre-commit
```

## Exempting Files

To exclude vendor or generated files from linting:

```javascript
// eslint.config.js
export default tseslint.config(
  { 
    ignores: [
      "dist", 
      "codemods", 
      "tools",
      "src/vendor/**",      // Add vendor files
      "**/*.gen.tsx"        // Add generated files
    ] 
  },
  // ...
);
```

## Troubleshooting

### DevTools "Issues" Spam

Chrome's autofill warnings in DevTools don't affect functionality. To hide them:
1. Open DevTools → ⚙️ Settings
2. Under "Console" → uncheck "Autofill"

### Label Association Patterns

```tsx
// ✅ Good: for/id
<label htmlFor="company">Company</label>
<input id="company" name="company" autoComplete="organization" />

// ✅ Good: wrapping
<label>
  Email
  <input name="email" id="email" autoComplete="email" />
</label>

// ✅ Good: ARIA (when no visible label)
<input 
  id="search" 
  name="search" 
  aria-label="Search" 
  autoComplete="off" 
/>

// ❌ Bad: no association
<span>Email</span>
<input name="email" />
```

### Dynamic/Generated Inputs

For forms with dynamic fields (tables, modals):
```tsx
fields.map((field, index) => (
  <Input
    key={field.id}
    name={`field-${field.id}`}
    id={`field-${field.id}`}
    autoComplete="off"
  />
))
```

## Manual Override

When autocomplete detection is wrong:
```tsx
<Input
  name="employeeId"
  autoComplete="off"  // Explicit override
/>
```

## Resources

- [HTML autocomplete attribute](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)
- [WCAG 2.1 - Labels or Instructions](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html)
- [WebAIM - Creating Accessible Forms](https://webaim.org/techniques/forms/)
