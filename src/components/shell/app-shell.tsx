"use client";
import Link from "next/link";
import { useEffect } from "react";
import { recordPath } from "@/lib/nav-history";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { getExperience, loc, moduleForPath, navFor } from "@/experiences/registry";
import { useT } from "@/lib/i18n/use-t";
import { useShowSamples, useUser } from "@/lib/store/user";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./icons";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[22px] leading-none tracking-tight text-forest", className)}>
      K<span className="text-terracotta">’</span>s Experience
    </span>
  );
}

/** URLs that belong to the Food module (historical, unprefixed). */
const FOOD_PATHS = ["/", "/explore", "/discover", "/what-to-eat", "/catalogue", "/dishes", "/nearby", "/places", "/passport"];
const norm = (p: string) => (p.endsWith("/") ? p : p + "/");
/** A module's map slot is its base path, so it matches exactly; other slots match their subtree. */
const isActive = (path: string, href: string, base: string) =>
  href === "/" ? path === "/" || path.startsWith("/explore") : href === base ? norm(path) === href : norm(path).startsWith(norm(href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const { t, locale } = useT();
  const stored = useUser((s) => s.experience);
  const mod = moduleForPath(path);
  // A module's own URLs decide the module (deep links); Food's URLs mean Food; shared pages (Saved, Settings,
  // account) use the chosen mode.
  const foodPage = FOOD_PATHS.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(p + "/")));
  const exp = getExperience(mod?.id ?? (foodPage ? "food" : stored));
  const setExperience = useUser((s) => s.setExperience);
  const hydrated = useUser((s) => s.hydrated);
  useEffect(() => { if (hydrated && foodPage && stored !== "food") setExperience("food"); }, [hydrated, foodPage, stored, setExperience]);
  useEffect(() => { recordPath(path); }, [path]);
  const nav = navFor(exp);
  const setLocale = useUser((s) => s.setLocale);
  const showSamples = useShowSamples();
  const fullBleed = path === "/" || path.startsWith("/explore") || path.startsWith("/nearby") ||
    Boolean(mod && (norm(path) === mod.routes.map || norm(path).startsWith(mod.routes.nearby))); // module establishment maps

  return (
    <div className={cn("flex flex-col", fullBleed ? "h-dvh" : "min-h-dvh")}>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:h-16 md:px-6">
          <Link href={exp.routes.map} className="flex items-baseline gap-2" aria-label="K's Experience home">
            <Wordmark />
            <span className="hidden rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-forest sm:inline">
              {loc(exp.name, locale)}
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
            {nav.map((n) => (
              <Link
                key={n.slot}
                href={n.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  isActive(path, n.href, exp.basePath) ? "bg-forest text-ivory" : "text-charcoal/80 hover:bg-ivory-deep",
                )}
                data-testid={`nav-${n.slot}`}
              >
                {loc(n.label, locale)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <div className="flex h-8 items-center rounded-full border border-line p-0.5 text-xs font-semibold" role="group" aria-label="Language" data-testid="lang-toggle">
              {(["en", "vi"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  aria-pressed={locale === l}
                  className={cn("h-full rounded-full px-2.5 tracking-wide transition-colors", locale === l ? "bg-forest text-ivory" : "text-charcoal/60 hover:text-charcoal")}
                  data-testid={`lang-${l}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <Link href="/saved" className={cn("hidden rounded-full p-2 hover:bg-ivory-deep sm:block lg:hidden", isActive(path, "/saved", exp.basePath) && "text-terracotta")} aria-label={t("nav.saved")}>
              <NAV_ICONS.bookmark className="size-5" />
            </Link>
            <Link href="/settings" className={cn("rounded-full p-2 hover:bg-ivory-deep", isActive(path, "/settings", exp.basePath) && "text-terracotta")} aria-label={t("nav.settings")} data-testid="nav-settings">
              <Settings className="size-5" />
            </Link>
          </div>
        </div>
        {showSamples && ( /* development/test builds only — never in production */
          <div className="border-t border-[#e9d9a6] bg-[#fbf3d9] text-[11.5px] leading-snug text-[#5f4a0f]" data-testid="data-banner">
            <p className="mx-auto max-w-7xl px-4 py-1.5 md:px-6">
              <strong className="mr-1 rounded bg-[#f0d878] px-1 py-px text-[10px] uppercase tracking-wider">Sample</strong>
              {t("sample.banner")}
            </p>
          </div>
        )}
      </header>

      <main className={cn("flex-1", fullBleed ? "min-h-0 pb-[calc(57px+env(safe-area-inset-bottom))] lg:pb-0" : "pb-24 lg:pb-12")}>{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main mobile"
      >
        <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${nav.filter((n) => n.mobile).length}, minmax(0, 1fr))` }}>
          {nav.filter((n) => n.mobile).map((n) => {
            const Icon = NAV_ICONS[n.icon];
            const active = isActive(path, n.href, exp.basePath);
            return (
              <Link key={n.slot} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10.5px]", active ? "text-terracotta" : "text-charcoal/70")} data-testid={`tab-${n.slot}`}>
                <Icon className="size-5" />
                {loc(n.short, locale)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
