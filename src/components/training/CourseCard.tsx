import { BookOpen, ShieldCheck, Brain } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type CourseKind = "nis2" | "lead" | "emp";

const ICONS: Record<CourseKind, JSX.Element> = {
  nis2: <ShieldCheck className="h-6 w-6" />,
  lead: <Brain className="h-6 w-6" />,
  emp:  <BookOpen className="h-6 w-6" />
};

function safeArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return [v];
  // falls versehentlich ein Objekt geliefert wird (z. B. {"0":"a","1":"b"})
  try {
    return Object.values(v as Record<string, unknown>).map(String);
  } catch {
    return [String(v)];
  }
}

export function CourseCard({ kind }: { kind: CourseKind }) {
  const { tx } = useI18n();
  const base = `training.courses.${kind}`;

  const title = tx(`${base}.title`);
  const url   = tx(`${base}.url`, { defaultValue: "" });
  const raw   = tx(`${base}.bullets`, { returnObjects: true });
  const bullets = safeArray(raw);

  // Optional: feste Codes anzeigen
  const code =
    kind === "nis2" ? "NIS2-CORE" :
    kind === "lead" ? "EU-AIACT-LEAD" :
                      "EU-AIACT-EMP";

  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-2">
        <div className="text-primary">{ICONS[kind]}</div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{code}</div>
      </div>

      <h3 className="mt-1 text-lg font-semibold">{title}</h3>

      <ul className="mt-2 space-y-1 text-sm">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span>•</span><span>{b}</span>
          </li>
        ))}
      </ul>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium underline text-primary hover:opacity-80 transition-opacity"
        >
          {tx("common.viewCourse", { defaultValue: "Kurs ansehen" })}
        </a>
      )}
    </div>
  );
}
