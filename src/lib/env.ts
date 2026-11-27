/**
 * Development / designated-testing data tools. Inlined at build time.
 * NEXT_PUBLIC_DEV_DATA=1 → fictional sample venues (always SAMPLE-labelled) can be shown, plus dev-only
 * dataset notices. Unset (production, default `npm run build`) → samples are not shipped at all.
 */
export const DEV_DATA = process.env.NEXT_PUBLIC_DEV_DATA === "1";
