/**
 * Experience modules registry.
 *
 * K's Experience is a lifestyle discovery platform; Vietnamese Food is the first module.
 * Each experience plugs into the shared shell (navigation, settings, saved, i18n, maps).
 * Future modules only need an entry here plus their own routes under src/app/(<id>)/.
 */
import type { DictKey } from "@/lib/i18n/dict";

export type ExperienceId = "food" | "bars" | "coffee" | "spa" | "shopping";

export interface NavItem { href: string; labelKey: DictKey; shortKey?: DictKey; icon: string; mobile?: boolean }

export interface ExperienceModule {
  id: ExperienceId;
  labelKey: DictKey;
  status: "active" | "coming-soon";
  icon: string;
  nav: NavItem[];
}

export const EXPERIENCES: ExperienceModule[] = [
  {
    id: "food",
    labelKey: "exp.food",
    status: "active",
    icon: "utensils",
    nav: [
      { href: "/", labelKey: "nav.discover", icon: "compass", mobile: true },
      { href: "/explore", labelKey: "nav.explore", shortKey: "nav.exploreShort", icon: "map", mobile: true },
      { href: "/catalogue", labelKey: "nav.catalogue", shortKey: "nav.catalogueShort", icon: "book", mobile: true },
      { href: "/nearby", labelKey: "nav.nearby", icon: "pin", mobile: true },
      { href: "/passport", labelKey: "nav.passport", shortKey: "nav.passportShort", icon: "stamp", mobile: true },
      { href: "/saved", labelKey: "nav.saved", icon: "bookmark" },
    ],
  },
  { id: "bars", labelKey: "exp.bars", status: "coming-soon", icon: "wine", nav: [] },
  { id: "coffee", labelKey: "exp.coffee", status: "coming-soon", icon: "coffee", nav: [] },
  { id: "spa", labelKey: "exp.spa", status: "coming-soon", icon: "flower", nav: [] },
  { id: "shopping", labelKey: "exp.shopping", status: "coming-soon", icon: "bag", nav: [] },
];

export const getExperience = (id: ExperienceId) => EXPERIENCES.find((e) => e.id === id) ?? EXPERIENCES[0];
