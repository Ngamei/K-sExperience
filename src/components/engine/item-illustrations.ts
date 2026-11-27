/**
 * Original line-art illustrations (64×64) for the shared-engine modules, drawn in the same style and palette
 * as Food's dish medallions (src/components/food/illustrations.ts). One per module category, so every item
 * has a relevant visual when no licensed photograph exists. SVG strings: usable in React and map markers.
 */
const W = 'stroke="#292D29" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const steam = `<path d="M26 12c-3-4 3-6 0-10M34 11c-3-4 3-6 0-10" fill="none" ${W} opacity=".45"/>`;
const tall = (fill: string, layers: string) =>
  `<path d="M20 10h24l-3 44c0 2-2 4-4 4H27c-2 0-4-2-4-4z" fill="${fill}" ${W}/>${layers}`;

export const ITEM_ART: Record<string, string> = {
  // ---- Coffee
  "coffee:vietnamese-coffee": `<path d="M22 8h20v8H22z" fill="#8E4F38" ${W}/><path d="M18 16h28" ${W}/><path d="M30 18v4M34 18v4" ${W}/>` +
    tall("#FBF7EE", `<path d="M22.6 30h18.8l-1 14H23.6z" fill="#8E4F38"/><path d="M23.6 44h16.8l-.6 9H24.2z" fill="#F3E6D2"/><path d="M27 34l3 3M35 38l2 2" stroke="#FBF7EE" stroke-width="2"/>`),
  "coffee:espresso": steam + `<path d="M18 30h26l-2 14c-.5 4-3.5 6-7.5 6h-7c-4 0-7-2-7.5-6z" fill="#FBF7EE" ${W}/><ellipse cx="31" cy="30" rx="13" ry="3" fill="#8E4F38" ${W}/><path d="M44 34c5 0 6 2 6 4s-2 4-7 4" fill="none" ${W}/><ellipse cx="32" cy="54" rx="20" ry="4" fill="#F3E6D2" ${W}/>`,
  "coffee:specialty": `<path d="M16 10h32l-12 18h-8z" fill="#F3E6D2" ${W}/><path d="M24 14h16" stroke="#8E4F38" stroke-width="3"/><path d="M32 30v4" stroke="#8E4F38" stroke-width="2.4" stroke-dasharray="2 3"/>` +
    `<path d="M18 36h28l-3 16c-.5 3-3 5-6 5H27c-3 0-5.5-2-6-5z" fill="#FBF7EE" ${W}/><path d="M20 42h24" stroke="#C4923A" stroke-width="4"/>`,
  "coffee:cold-brew": `<path d="M22 8h20v6c4 3 6 7 6 12v26c0 3-2 5-5 5H21c-3 0-5-2-5-5V26c0-5 2-9 6-12z" fill="#FBF7EE" ${W}/><path d="M17 30h30v22H17z" fill="#8E4F38" opacity=".85"/><path d="M22 36h6v6h-6zM32 40h6v6h-6z" fill="#E7EEE3" ${W}/><path d="M22 8h20" ${W}/>`,
  "coffee:matcha": `<path d="M8 32h48c0 12-10 20-24 20S8 44 8 32z" fill="#F3E6D2" ${W}/><ellipse cx="32" cy="32" rx="24" ry="4" fill="#9DB596" ${W}/><path d="M44 6l-8 22" ${W}/><path d="M38 24c-3 2-4 6-2 8 3 1 6-1 7-4" fill="#FBF7EE" ${W}/><path d="M26 52h12v4H26z" fill="#F3E6D2" ${W}/>`,
  "coffee:tea": `<path d="M14 26c0-6 8-10 18-10s18 4 18 10v14c0 8-8 14-18 14S14 48 14 40z" fill="#E7EEE3" ${W}/><path d="M50 30c6 0 8 4 8 7s-2 6-8 6" fill="none" ${W}/><path d="M14 30l-8-6" ${W}/><path d="M26 16c0-4 3-6 6-6s6 2 6 6" fill="#9DB596" ${W}/><path d="M24 38c4-4 12-4 16 0-4 4-12 4-16 0z" fill="#D79D86" ${W}/>`,
  "coffee:non-coffee": tall("#FBF7EE", `<path d="M22.4 22h19.2l-1.6 30H24z" fill="#F0CF84"/><circle cx="28" cy="16" r="5" fill="#9DB596" ${W}/><path d="M36 4l-4 40" ${W}/>`),
  // ---- Bars
  "bars:classic-cocktail": `<path d="M12 12h40L32 34z" fill="#F0CF84" ${W}/><path d="M32 34v16M22 54h20" ${W}/><circle cx="40" cy="16" r="3" fill="#9DB596" ${W}/><path d="M40 16l6-8" ${W}/>`,
  "bars:signature-cocktail": `<path d="M14 14c0 10 8 18 18 18s18-8 18-18z" fill="#D79D86" ${W}/><path d="M32 32v16M22 54h20" ${W}/><path d="M42 10c4 0 6 3 4 6" fill="none" ${W}/><circle cx="24" cy="18" r="2" fill="#FBF7EE"/><path d="M14 14h36" ${W}/>`,
  "bars:wine": `<path d="M20 8h24c0 14-4 24-12 24S20 22 20 8z" fill="#FBF7EE" ${W}/><path d="M21 16h22c-1 9-5 14-11 14s-10-5-11-14z" fill="#8E4F38"/><path d="M32 32v18M22 54h20" ${W}/>`,
  "beer-mug": `<path d="M14 18h28v34c0 3-2 4-4 4H18c-2 0-4-1-4-4z" fill="#F0CF84" ${W}/><path d="M42 24h6c3 0 4 2 4 4v12c0 2-1 4-4 4h-6" fill="none" ${W}/><path d="M12 18c0-6 6-8 10-6 2-4 10-4 12 0 4-2 10 0 10 6z" fill="#FBF7EE" ${W}/><path d="M22 28v18M30 28v18" stroke="#FBF7EE" stroke-width="2.4" stroke-linecap="round"/>`,
  "bars:mocktail": tall("#FBF7EE", `<path d="M22.4 24h19.2l-1.6 28H24z" fill="#BAC8B5"/><path d="M26 30h4v4h-4zM34 38h4v4h-4z" fill="#FBF7EE" ${W}/><circle cx="42" cy="12" r="5" fill="#9DB596" ${W}/><path d="M28 2l2 30" ${W}/>`),
  // ---- Spa
  "spa:massage": `<ellipse cx="22" cy="44" rx="10" ry="6" fill="#8E4F38" ${W}/><ellipse cx="38" cy="46" rx="9" ry="5" fill="#A9603F" ${W}/><ellipse cx="31" cy="36" rx="8" ry="5" fill="#8E4F38" ${W}/><path d="M42 12c-6 4-6 12 0 16 6-4 6-12 0-16z" fill="#9DB596" ${W}/><path d="M42 28v6" ${W}/>`,
  "spa:head-spa": `<circle cx="32" cy="34" r="14" fill="#F3E6D2" ${W}/><path d="M18 30c2-10 8-14 14-14s12 4 14 14" fill="#8E4F38" ${W}/><path d="M16 12c2 3 2 5 0 8M26 6c2 3 2 5 0 8M38 6c2 3 2 5 0 8M48 12c2 3 2 5 0 8" fill="none" stroke="#7FA7B8" stroke-width="2.4" stroke-linecap="round"/><path d="M27 38h2M35 38h2M28 44c2 2 6 2 8 0" ${W}/>`,
  "spa:facial": `<ellipse cx="32" cy="32" rx="16" ry="20" fill="#9DB596" ${W}/><circle cx="26" cy="28" r="4" fill="#FBF7EE" ${W}/><circle cx="38" cy="28" r="4" fill="#FBF7EE" ${W}/><path d="M26 42c4 3 8 3 12 0" ${W}/><path d="M50 12l2-4 2 4-4 0z" fill="#F0CF84" ${W}/>`,
  "spa:nails": `<rect x="22" y="22" width="20" height="32" rx="5" fill="#D79D86" ${W}/><path d="M26 22v-6h12v6" fill="#FBF7EE" ${W}/><path d="M28 16V6h8v10" fill="#292D29" ${W}/><path d="M26 32h12" stroke="#FBF7EE" stroke-width="2.4" stroke-linecap="round"/>`,
  "spa:hair": `<circle cx="20" cy="44" r="6" fill="#FBF7EE" ${W}/><circle cx="36" cy="44" r="6" fill="#FBF7EE" ${W}/><path d="M24 39L46 10M32 39L14 10" ${W}/><path d="M48 30c4 6 4 14 0 20" fill="none" stroke="#8E4F38" stroke-width="3" stroke-linecap="round"/>`,
  "spa:body-care": `<path d="M16 24h32v26c0 3-2 6-6 6H22c-4 0-6-3-6-6z" fill="#F3E6D2" ${W}/><path d="M14 18h36v6H14z" fill="#B66B50" ${W}/><circle cx="26" cy="38" r="2" fill="#C4923A"/><circle cx="34" cy="42" r="2" fill="#C4923A"/><circle cx="38" cy="34" r="2" fill="#C4923A"/>`,
  "spa:wellness": `<path d="M32 12c-6 8-6 20 0 28 6-8 6-20 0-28z" fill="#D79D86" ${W}/><path d="M32 40c-10 0-18-6-20-16 10 0 16 6 20 16zM32 40c10 0 18-6 20-16-10 0-16 6-20 16z" fill="#F0CF84" ${W}/><path d="M12 48c8 4 32 4 40 0" fill="none" stroke="#7FA7B8" stroke-width="2.4" stroke-linecap="round"/>`,
  // ---- Sport
  "sport:pickleball": `<path d="M14 10c8-4 20 2 22 12s-4 18-12 18-14-4-16-12 0-14 6-18z" fill="#294C3D" ${W}/><path d="M22 38l-8 16" stroke="#C4923A" stroke-width="5" stroke-linecap="round"/><circle cx="46" cy="40" r="9" fill="#F0CF84" ${W}/><circle cx="43" cy="37" r="1.5" fill="#292D29"/><circle cx="49" cy="39" r="1.5" fill="#292D29"/><circle cx="45" cy="44" r="1.5" fill="#292D29"/>`,
  "sport:pilates": `<rect x="6" y="38" width="52" height="8" rx="2" fill="#F3E6D2" ${W}/><rect x="22" y="32" width="18" height="6" rx="2" fill="#294C3D" ${W}/><path d="M8 46v8M56 46v8" ${W}/><path d="M52 38V26" ${W}/><path d="M40 35l12-9" stroke="#C4923A" stroke-width="2.2" stroke-dasharray="3 2"/><path d="M8 38V30h6" ${W}/>`,
};
ITEM_ART["bars:beer"] = ITEM_ART["beer-mug"];

/** Generic fallback (never blank). */
const FALLBACK = `<circle cx="32" cy="32" r="18" fill="#F3E6D2" ${W}/><path d="M32 22v20M22 32h20" ${W}/>`;

export const itemSvg = (key: string, px = 50) =>
  `<svg viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true">${ITEM_ART[key] ?? FALLBACK}</svg>`;

export const hasItemArt = (key: string) => key in ITEM_ART;
