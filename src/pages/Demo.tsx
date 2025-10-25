import { Building2, ShieldCheck, FileText } from "lucide-react";
import { Link } from "react-router-dom";

export default function Demo() {
  const features = [
    {
      icon: <Building2 className="h-8 w-8" />,
      title: "NIS2 Risk Assessment",
      bullets: [
        "Comprehensive asset overview and inventory management",
        "Automated duty mapping to regulatory requirements",
        "Export compliance reports in multiple formats",
      ],
    },
    {
      icon: <ShieldCheck className="h-8 w-8" />,
      title: "AI Act Register",
      bullets: [
        "Complete AI system registry with version control",
        "Automated risk classification and scoring",
        "Generate conformity documentation and evidence",
      ],
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Policy Generator",
      bullets: [
        "Pre-built templates for NIS2 and AI Act policies",
        "Token-driven design system for consistent branding",
        "Export to PDF and editable formats",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-surface-2">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-text-primary">
            Norrland Compliance Platform Demo
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Experience our token-driven design system with semantic utilities
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border-muted bg-surface-1 p-6 shadow-sm backdrop-blur-sm transition hover:bg-surface-3 hover:shadow-md"
            >
              <div className="mb-4 text-primary">{f.icon}</div>
              <h3 className="text-xl font-semibold text-text-primary">
                {f.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-text-secondary">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div
                className="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                aria-hidden
              >
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-glow/15" />
                <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-accent/10" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row">
          <Link
            to="/billing"
            className="inline-flex items-center justify-center rounded-2xl border border-border-muted bg-surface-1 px-6 py-3 font-medium text-text-primary shadow-sm transition hover:bg-surface-3 hover:shadow"
          >
            View Pricing & Subscription
          </Link>
          <button
            type="button"
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-105"
          >
            Toggle Dark Mode
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl border border-border-muted bg-surface-1 px-6 py-3 font-medium text-text-primary shadow-sm transition hover:bg-surface-3"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-16 rounded-2xl border border-border-muted bg-surface-1 p-8">
          <h2 className="text-2xl font-semibold text-text-primary">
            Design System Features
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-medium text-text-primary">
                Semantic Color Tokens
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                <li>• <code className="rounded bg-surface-3 px-2 py-1">bg-surface-1/2/3</code></li>
                <li>• <code className="rounded bg-surface-3 px-2 py-1">text-text-primary/secondary</code></li>
                <li>• <code className="rounded bg-surface-3 px-2 py-1">border-border-muted</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">
                Automatic Dark Mode
              </h3>
              <p className="mt-3 text-sm text-text-secondary">
                All components automatically adapt to light and dark themes using
                HSL-based CSS variables defined in the design system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
