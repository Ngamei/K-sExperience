/**
 * Original line-art food illustrations (64×64), one per dish type.
 * Returned as SVG strings so they can be used both in React and in MapLibre DOM markers.
 * Used until licensed photography is supplied (see docs/DATA_SOURCES.md).
 */
import type { Category, DishType } from "@/lib/data/schema";

const S = "#292D29"; // stroke
const W = 'stroke="#292D29" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const steam = `<path d="M24 14c-3-4 3-6 0-10M32 13c-3-4 3-6 0-10M40 14c-3-4 3-6 0-10" fill="none" ${W} opacity=".45"/>`;
const bowl = (fill: string, inner: string) =>
  `<path d="M8 30h48c0 13-10.7 22-24 22S8 43 8 30z" fill="${fill}" ${W}/><path d="M24 52h16v4H24z" fill="${fill}" ${W}/>${inner}`;

const ART: Record<string, string> = {
  "noodle-soup": steam + bowl("#F3E6D2", `<path d="M10 30c6-5 12 4 18-1s12 4 18-1 8 2 8 2" fill="none" stroke="#C4923A" stroke-width="2.2"/><circle cx="22" cy="27" r="3" fill="#BAC8B5" ${W}/><path d="M36 25l6 3-6 3z" fill="#B66B50" ${W}/><path d="M44 8l-8 22M50 10l-10 20" ${W}/>`),
  soup: steam + bowl("#E7EEE3", `<ellipse cx="32" cy="30" rx="22" ry="3" fill="#D79D86"/><path d="M20 28c3-3 6-3 8 0" fill="none" stroke="#294C3D" stroke-width="2.2"/><circle cx="40" cy="29" r="2.5" fill="#BAC8B5" ${W}/>`),
  porridge: steam + bowl("#FBF7EE", `<ellipse cx="32" cy="30" rx="22" ry="3.5" fill="#F6EEDC"/><path d="M24 29h4M34 28h3M41 30h3" stroke="#294C3D" stroke-width="2.4" stroke-linecap="round"/>`),
  hotpot: steam + `<path d="M8 30h48v6c0 9-9 16-24 16S8 45 8 36z" fill="#B66B50" ${W}/><path d="M4 32h4M56 32h4" ${W}/><ellipse cx="32" cy="30" rx="24" ry="4" fill="#E9C9A8" ${W}/><circle cx="24" cy="29" r="2.5" fill="#294C3D"/><circle cx="38" cy="30" r="2.5" fill="#BAC8B5"/>`,
  noodles: `<ellipse cx="32" cy="40" rx="26" ry="10" fill="#FBF7EE" ${W}/><path d="M14 38c5-6 9 4 14-2s9 4 14-2 8 3 8 3" fill="none" stroke="#C4923A" stroke-width="2.4"/><path d="M16 42c5-5 9 3 14-1s9 3 14-1" fill="none" stroke="#C4923A" stroke-width="2.4"/><circle cx="24" cy="34" r="3" fill="#B66B50" ${W}/><path d="M38 32c2-3 6-3 8 0" fill="#BAC8B5" ${W}/><path d="M40 10l-6 22M48 12l-10 20" ${W}/>`,
  rice: steam + bowl("#F3E6D2", `<path d="M12 30c2-8 10-12 20-12s18 4 20 12" fill="#FFFDF8" ${W}/><path d="M24 22l1 1M30 20l1 1M36 22l1 1M28 25l1 1M40 25l1 1" stroke="#292D29" stroke-width="2"/><path d="M34 24c4-3 10-2 12 3" fill="#B66B50" ${W}/>`),
  banh: `<path d="M12 40l20-20 20 20-20 14z" fill="#9DB596" ${W}/><path d="M12 40l20 6 20-6M32 20v26" fill="none" ${W}/><path d="M22 34l10 3 10-3" fill="none" stroke="#294C3D" stroke-width="1.8" opacity=".6"/><path d="M8 48h48" ${W} opacity=".35"/>`,
  bread: `<path d="M8 40c4-14 40-22 48-10 3 5-1 10-8 12L16 48c-6 1-9-3-8-8z" fill="#E1B27A" ${W}/><path d="M20 38l6-6M30 35l6-6M40 32l5-5" ${W}/><path d="M14 44l34-8" stroke="#BAC8B5" stroke-width="4" stroke-linecap="round"/><path d="M16 46l30-7" stroke="#B66B50" stroke-width="2" stroke-linecap="round"/>`,
  rolls: `<rect x="8" y="26" width="22" height="14" rx="7" fill="#F4EDE1" ${W}/><rect x="32" y="30" width="22" height="14" rx="7" fill="#F4EDE1" ${W}/><path d="M14 30c2 2 4 2 6 0M38 34c2 2 4 2 6 0" stroke="#BAC8B5" stroke-width="3" stroke-linecap="round"/><path d="M14 36h8M40 40h6" stroke="#D79D86" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="30" cy="50" rx="7" ry="4" fill="#B66B50" ${W}/>`,
  grilled: `<path d="M10 52L54 14" ${W}/><rect x="18" y="34" width="10" height="10" rx="3" transform="rotate(-40 23 39)" fill="#B66B50" ${W}/><rect x="28" y="26" width="10" height="10" rx="3" transform="rotate(-40 33 31)" fill="#8E4F38" ${W}/><rect x="38" y="18" width="10" height="10" rx="3" transform="rotate(-40 43 23)" fill="#B66B50" ${W}/><path d="M14 58c2-3 6-3 8 0M26 58c2-3 6-3 8 0" stroke="#C4923A" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  salad: `<path d="M8 34h48c0 10-10 18-24 18S8 44 8 34z" fill="#FBF7EE" ${W}/><path d="M14 34c2-10 10-14 14-14-1 6-5 12-14 14zM30 34c2-12 12-16 18-14-2 8-8 12-18 14z" fill="#9DB596" ${W}/><circle cx="40" cy="31" r="3" fill="#B66B50" ${W}/><path d="M22 30l2 2M34 28l2 2" stroke="#C4923A" stroke-width="2"/>`,
  stew: steam + `<path d="M12 28h40l-3 20c-1 4-4 6-8 6H23c-4 0-7-2-8-6z" fill="#A9603F" ${W}/><path d="M10 28h44" ${W}/><path d="M24 22h16c0-3-3-5-8-5s-8 2-8 5z" fill="#A9603F" ${W}/><path d="M20 36c4 2 8 2 12 0s8-2 12 0" fill="none" stroke="#F8F5EE" stroke-width="2" opacity=".7"/>`,
  che: `<path d="M18 10h28l-4 42c0 3-3 5-6 5h-8c-3 0-6-2-6-5z" fill="#FFFDF8" ${W}/><path d="M19.5 22h25l-1 10h-23z" fill="#D79D86"/><path d="M20.5 32h23l-1 10h-21z" fill="#BAC8B5"/><path d="M21.5 42h21l-.8 9h-19.4z" fill="#E7C27D"/><path d="M38 4l-6 30" ${W}/>`,
  dessert: `<path d="M16 46l4-20h24l4 20z" fill="#F0CF84" ${W}/><path d="M20 26c4 4 8-2 12 2s8-2 12-2" fill="#8E4F38" ${W}/><ellipse cx="32" cy="48" rx="22" ry="5" fill="#FBF7EE" ${W}/><circle cx="32" cy="20" r="3" fill="#B66B50" ${W}/>`,
  fried: `<ellipse cx="32" cy="42" rx="26" ry="10" fill="#FBF7EE" ${W}/><path d="M10 40c0-12 10-20 22-20s22 8 22 20c-8 4-36 4-44 0z" fill="#E9B44C" ${W}/><path d="M18 34c3-2 6 2 9 0M32 30c3-2 6 2 9 0M38 36c2-1 4 1 6 0" fill="none" stroke="#B66B50" stroke-width="2.2" stroke-linecap="round"/><path d="M22 38l3-6" stroke="#9DB596" stroke-width="3" stroke-linecap="round"/>`,
  cured: `<path d="M14 22h36v28H14z" fill="#9DB596" ${W}/><path d="M14 22l18 12 18-12M14 50l18-12 18 12" fill="none" ${W} opacity=".7"/><rect x="26" y="30" width="12" height="12" rx="2" fill="#D79D86" ${W}/><path d="M32 22v-8M28 14h8" ${W}/>`,
  seafood: `<path d="M12 44c0-14 10-24 20-24s20 10 20 24z" fill="#F0D2B8" ${W}/><path d="M32 20v24M22 26l4 18M42 26l-4 18M14 36l12 8M50 36l-12 8" fill="none" ${W} opacity=".7"/><path d="M8 46h48" ${W}/><circle cx="50" cy="16" r="3" fill="#BAC8B5" ${W}/>`,
  confection: `<path d="M18 26h28v14H18z" fill="#F4EDE1" ${W}/><path d="M18 26l-10-6v26l10-6M46 26l10-6v26l-10-6" fill="#D79D86" ${W}/><path d="M24 30v6M30 30v6M36 30v6M42 30v6" stroke="#C4923A" stroke-width="2"/>`,
};

export const CATEGORY_COLORS: Record<Category, string> = { savory: "#294C3D", sweet: "#B66B50", snack: "#C4923A" };

export function dishSvg(type: DishType | string, size = 64): string {
  const body = ART[type] ?? ART["noodle-soup"];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="${S}">${body}</svg>`;
}
