import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, CalendarDays, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalPageLayoutProps {
  eyebrow?: string;
  title: string;
  updatedAt: string;
  backTo?: string;
  backLabel?: string;
  intro?: ReactNode;
  sections: LegalSection[];
  footerSlot?: ReactNode;
}

export const LegalPageLayout = ({
  eyebrow = "Документ",
  title,
  updatedAt,
  backTo = "/",
  backLabel = "На главную",
  intro,
  sections,
  footerSlot,
}: LegalPageLayoutProps) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: [0, 1] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Назад</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Официальный документ
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground">
            <FileText className="w-3.5 h-3.5 text-primary" />
            {eyebrow}
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl">
            {title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Обновлено: {updatedAt}
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span>{sections.length} разделов</span>
          </div>
          {intro && (
            <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              {intro}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-12">
          {/* TOC desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Содержание
              </p>
              <nav className="space-y-0.5">
                {sections.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      activeId === s.id
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 text-xs tabular-nums font-mono",
                        activeId === s.id ? "text-primary" : "opacity-60"
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile TOC */}
          <div className="lg:hidden -mt-2 mb-2">
            <details className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
                <span>Содержание ({sections.length})</span>
                <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <nav className="border-t border-border px-2 py-2 space-y-0.5">
                {sections.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <span className="text-xs tabular-nums font-mono opacity-60 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </button>
                ))}
              </nav>
            </details>
          </div>

          {/* Sections */}
          <main className="min-w-0">
            <div className="space-y-4 sm:space-y-6">
              {sections.map((s, i) => (
                <article
                  key={s.id}
                  id={s.id}
                  className="group relative scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex items-start gap-4 mb-4 sm:mb-5">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-semibold text-sm tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold leading-tight pt-1.5">
                      {s.title}
                    </h2>
                  </div>
                  <div className="legal-prose space-y-3 text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                    {s.content}
                  </div>
                </article>
              ))}

              {footerSlot}
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export const LegalList = ({ items }: { items: ReactNode[] }) => (
  <ul className="space-y-2 pl-1">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
        <span className="flex-1">{item}</span>
      </li>
    ))}
  </ul>
);

export const LegalCallout = ({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-secondary/40 p-4 sm:p-5">
    {title && (
      <p className="font-semibold text-foreground text-sm mb-3">{title}</p>
    )}
    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
      {children}
    </div>
  </div>
);
