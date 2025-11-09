# i18n Validation Guide

## Nested Structure Policy

All i18n JSON files in `public/locales/{lang}/{namespace}.json` **must use nested object structure**. Flat dotted keys are not allowed and will be rejected by the pre-commit hook.

## Valid vs Invalid Examples

### ✅ Valid (Nested Structure)

```json
{
  "sectors": {
    "it": "IT / Software",
    "finance": "Finance",
    "health": "Healthcare"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

### ❌ Invalid (Flat Dotted Keys)

```json
{
  "sectors.it": "IT / Software",
  "sectors.finance": "Finance",
  "common.save": "Save",
  "common.cancel": "Cancel"
}
```

### ❌ Invalid (Mixed)

```json
{
  "sectors": {
    "it": "IT"
  },
  "sectors.finance": "Finance"
}
```

## Namespace Usage

Always specify the namespace when accessing translation keys in code:

```typescript
// ✅ Correct
t('common:verifying')
t('helpbot:sectors.it')
t('dashboard:welcome')

// ❌ Incorrect (ambiguous namespace)
t('verifying')
t('sectors.it')
```

## Pre-Commit Guard

The `.husky/pre-commit` hook automatically blocks commits containing flat dotted keys in locale JSON files:

```bash
# Example error output
❌ Commit blocked: Flat dotted keys detected in locale JSON. Use nested objects.
   Example: Use { "sectors": { "it": "IT" } } instead of { "sectors.it": "IT" }
```

## Configuration

i18next is configured with:
- `nsSeparator: ':'` - Separates namespace from key (e.g., `common:save`)
- `keySeparator: '.'` - Separates nested keys (e.g., `sectors.it`)
- `returnObjects: false` - Only return string values, not objects

## Troubleshooting

### "Converting flat keys to nested" Warning

**Cause:** JSON file contains flat dotted keys like `"sectors.it": "IT"`.

**Solution:** Convert to nested structure:
```json
{
  "sectors": {
    "it": "IT"
  }
}
```

### "[i18n missing]" Warning

**Cause:** Key doesn't exist in the loaded namespace or namespace not specified.

**Solution:** 
1. Check if key exists in JSON file
2. Ensure namespace is specified: `t('namespace:key')`
3. Verify namespace is loaded in `i18n/init.ts`

### BOM/Encoding Issues

**Symptoms:** JSON appears valid but parser fails or warnings persist.

**Solution:** 
1. Check file encoding is UTF-8 without BOM
2. Remove invisible characters at file start
3. Validate JSON with `jq` or online validators

## File Structure

```
public/
└── locales/
    ├── de/
    │   ├── common.json
    │   ├── helpbot.json
    │   └── dashboard.json
    ├── en/
    │   ├── common.json
    │   ├── helpbot.json
    │   └── dashboard.json
    └── sv/
        ├── common.json
        ├── helpbot.json
        └── dashboard.json
```

## Best Practices

1. **Keep namespaces focused** - One feature or domain per namespace
2. **Use semantic naming** - Keys should describe content, not location
3. **Maintain consistency** - Same structure across all languages
4. **Test all languages** - Don't assume structure works across locales
5. **Document custom keys** - Add comments for non-obvious translations

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [i18next Best Practices](https://www.i18next.com/principles/fallback)
- [React i18next Guide](https://react.i18next.com/)
