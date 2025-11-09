# Master Password E2E Tests

This directory contains end-to-end tests for the master password verification flow.

## Running the tests

### Prerequisites

1. Create a `.env.e2e` file (copy from `.env.e2e.example`):
   ```bash
   cp .env.e2e.example .env.e2e
   ```

2. Set your test master password:
   ```env
   E2E_MASTER_PASSWORD=your-test-master-password
   ```

### Run tests

```bash
# Run all E2E tests
npx playwright test

# Run only master password tests
npx playwright test tests/e2e/master-password.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed
```

## Test coverage

The master password E2E tests verify:

- ✅ Dialog visibility on protected routes
- ✅ Rejection of incorrect passwords with error messages
- ✅ Acceptance of correct passwords and route access
- ✅ Attempt counter on multiple failures
- ✅ Session persistence across page reloads

## Security notes

- The test master password should be different from production
- Never commit `.env.e2e` to version control (it's in `.gitignore`)
- Use environment-specific passwords in CI/CD pipelines

## CI/CD integration

For GitHub Actions or similar:

```yaml
- name: Run E2E tests
  env:
    E2E_MASTER_PASSWORD: ${{ secrets.E2E_MASTER_PASSWORD }}
  run: npx playwright test
```
