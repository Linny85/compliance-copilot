import { EnvVarsStatusPanel } from './EnvVarsStatusPanel';
import EdgeTestPanel from './EdgeTestPanel';

export function DevToolsPage() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2 text-foreground">Dev Tools</h1>
      <p className="text-muted-foreground mb-6">
        Development utilities and environment status (only visible in DEV mode)
      </p>

      <section id="env" className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-foreground">Environment Variables</h2>
        <EnvVarsStatusPanel />
      </section>

      <section className="mb-8">
        <EdgeTestPanel />
      </section>

      <section id="docs" className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-foreground">Documentation Links</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="/docs/master-password.md#cors-configuration" className="text-primary hover:underline">
              → CORS Configuration
            </a>
          </li>
          <li>
            <a href="/docs/master-password.md#e2e-nightly-workflow" className="text-primary hover:underline">
              → Nightly Seeding & E2E Tests
            </a>
          </li>
          <li>
            <a href="/docs/dev-tools.md" className="text-primary hover:underline">
              → Dev Tools Documentation
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
