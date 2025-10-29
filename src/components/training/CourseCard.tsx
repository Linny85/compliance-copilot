import { BookOpen, ShieldCheck, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation('training');
  const base = `courses.${kind}`;

  const title = t(`${base}.title`);
  const url = t(`${base}.url`, { defaultValue: "" });
  const raw = t(`${base}.bullets`, { returnObjects: true });
  const bullets = safeArray(raw);

  // Optional: feste Codes anzeigen
  const code =
    kind === "nis2" ? "NIS2-CORE" :
    kind === "lead" ? "EU-AIACT-LEAD" :
                      "EU-AIACT-EMP";

  return (
    <div className="relative flex flex-col rounded-2xl border bg-card/80 backdrop-blur shadow-sm p-4 sm:p-6 min-h-[220px] sm:min-h-[260px] min-w-0 transition md:hover:shadow-md md:hover:bg-accent/5">
      <div className="flex items-center gap-2">
        <div className="text-primary">{ICONS[kind]}</div>
        <div className="text-xs sm:text-sm font-medium uppercase tracking-wide text-muted-foreground">{code}</div>
      </div>

      <h3 className="mt-1 text-lg sm:text-xl font-semibold leading-snug text-balance line-clamp-2">{title}</h3>

      <ul className="mt-2 space-y-1.5 sm:space-y-2 text-sm sm:text-base text-pretty">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1.5 sm:size-2 shrink-0 rounded-full bg-primary/60" />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border px-3 py-2 text-sm sm:text-base font-medium hover:bg-accent transition-colors"
          >
            {t("training:viewCourse")}
          </a>
        )}
      </div>
    </div>
  );
}
