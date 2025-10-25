import { motion } from "framer-motion";
import { Building2, ShieldCheck, MessageSquare } from "lucide-react";
import React from "react";

/**
 * FeatureSection – Drei Kacheln für Landingpage / Billing-Seite
 * Stil: modern, clean, TailwindCSS, mit sanfter Motion.
 * Geeignet für React + Vite. Icons via lucide-react.
 */

type Feature = {
  icon: React.ReactNode;
  title: string;
  bullets: string[];
};

const features: Feature[] = [
  {
    icon: <Building2 className="h-6 w-6" aria-hidden />,
    title: "Unternehmensverwaltung",
    bullets: [
      "Verwalten Sie Ihr gesamtes Unternehmen zentral in einer sicheren Umgebung.",
      "Ein Abonnement pro Organisation – alle Daten, Benutzer, Richtlinien und Nachweise unter einem Unternehmensprofil.",
      "Unterstützt die effiziente Erfüllung von NIS2- und EU-AI-Act-Anforderungen.",
    ],
  },
  {
    icon: <ShieldCheck className="h-6 w-6" aria-hidden />,
    title: "Daten- und Zugriffsschutz",
    bullets: [
      "Strikte Mandantentrennung – kein anderer Kunde kann Ihre Informationen einsehen oder bearbeiten.",
      "Rollen & Berechtigungen sorgen für präzise Zugriffskontrolle innerhalb Ihres Teams.",
      "Sichere Speicherung und klare Audit-Trails für Nachweispflichten.",
    ],
  },
  {
    icon: <MessageSquare className="h-6 w-6" aria-hidden />,
    title: "KI-gestützter Support rund um die Uhr",
    bullets: [
      "Integrierter Chatbot beantwortet Fragen zur App, Einrichtung und Nutzung – 24/7.",
      "Kompetente Unterstützung zu NIS2 und EU AI Act – schnell und verlässlich.",
      "Wenn nötig: automatische Ticket-Erstellung für unser Expertenteam.",
    ],
  },
];

export default function FeatureSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Wesentliche Funktionen
        </h2>
        <p className="mt-3 text-muted-foreground">
          Alles, was Sie für NIS2- und AI-Act-Compliance in einem Abonnement
          benötigen.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.article
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            viewport={{ once: true, margin: "-50px" }}
            className="group relative overflow-hidden rounded-2xl border border-border-muted bg-surface-1 p-6 shadow-sm backdrop-blur-sm transition hover:bg-surface-3 hover:shadow-md"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border-muted px-3 py-2 text-sm font-medium shadow-sm">
              <span className="text-primary">{f.icon}</span>
              <span className="text-text-primary">{f.title}</span>
            </div>

            <ul className="space-y-2 text-sm leading-relaxed text-text-secondary">
              {f.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                  <span className="text-text-secondary">{b}</span>
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
          </motion.article>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-center md:flex-row md:justify-center">
        <a
          href="#pricing"
          className="inline-flex items-center justify-center rounded-2xl border border-border-muted bg-surface-1 px-5 py-3 text-sm font-medium text-text-primary shadow-sm transition hover:bg-surface-3 hover:shadow md:text-base"
        >
          Preise & Abonnement ansehen
        </a>
        <a
          href="#demo"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 md:text-base"
        >
          Demo starten
        </a>
      </div>
    </section>
  );
}
