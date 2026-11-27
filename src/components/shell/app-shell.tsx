"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { getExperience } from "@/experiences/registry";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./icons";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[22px] leading-none tracking-tight text-forest", className)}>
      K<span className="text-terracotta">’</span>s Experience
    </span>
  );
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

export function AppShell({ children, seedCount }: { children: React.ReactNode; seedCount: number | null }) {
  const path = usePathname() ?? "/";
  const { t, locale } = useT();
  const exp = getExperience(useUser((s) => s.experience));
  const setLocale = useUser((s) => s.setLocale);
  const showSamples = useUser((s) => s.showSamples);
  const fullBleed = path.startsWith("/explore") || path.startsWith("/nearby");

  return (
    <div className={cn("flex flex-col", fullBleed ? "h-dvh" : "min-h-dvh")}>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:h-16 md:px-6">
          <Link href="/" className="flex items-baseline gap-2" aria-label="K's Experience home">
            <Wordmark />
            <span className="hidden rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-forest sm:inline">
              {t(exp.labelKey)}
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
            {exp.nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  isActive(path, n.href) ? "bg-forest text-ivory" : "text-charcoal/80 hover:bg-ivory-deep",
                )}
              >
                {t(n.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "vi" : "en")}
              className="h-8 rounded-full border border-line px-3 text-xs font-semibold tracking-wide text-charcoal hover:bg-ivory-deep"
              aria-label="Switch language"
              data-testid="lang-toggle"
            >
              {locale === "en" ? "VI" : "EN"}
            </button>
            <Link href="/saved" className={cn("hidden rounded-full p-2 hover:bg-ivory-deep sm:block lg:hidden", isActive(path, "/saved") && "text-terracotta")} aria-label={t("nav.saved")}>
              <NAV_ICONS.bookmark className="size-5" />
            </Link>
            <Link href="/settings" className={cn("rounded-full p-2 hover:bg-ivory-deep", isActive(path, "/settings") && "text-terracotta")} aria-label={t("nav.settings")} data-testid="nav-settings">
              <Settings className="size-5" />
            </Link>
          </div>
        </div>
        {(seedCount !== null || showSamples) && (
          <div className="border-t border-[#e9d9a6] bg-[#fbf3d9] text-[11.5px] leading-snug text-[#5f4a0f]" data-testid="data-banner">
            <div className="mx-auto max-w-7xl px-4 py-1.5 md:px-6">
              {seedCount !== null && (
                <p>
                  <strong className="mr-1 rounded bg-[#f0d878] px-1 py-px text-[10px] uppercase tracking-wider">Seed data</strong>
                  {t("seed.banner", { n: seedCount })}
                </p>
              )}
              {showSamples && (
                <p className="mt-0.5">
                  <strong className="mr-1 rounded bg-[#f0d878] px-1 py-px text-[10px] uppercase tracking-wider">Sample</strong>
                  {t("sample.banner")}
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      <main className={cn("flex-1", fullBleed ? "min-h-0 pb-[calc(57px+env(safe-area-inset-bottom))] lg:pb-0" : "pb-24 lg:pb-12")}>{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main mobile"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {exp.nav.filter((n) => n.mobile).map((n) => {
            const Icon = NAV_ICONS[n.icon];
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10.5px]", active ? "text-terracotta" : "text-charcoal/70")}>
                <Icon className="size-5" />
                {t(n.shortKey ?? n.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
