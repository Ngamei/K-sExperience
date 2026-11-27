/**
 * Sport pilot (Pickleball, Pilates) — DRAFT data structures, prepared for the pilot sprint.
 * Not wired into any screen or dataset yet: no venues, schedules, availability or prices exist,
 * and none may be invented. Shared concepts (establishment, offering, evidence, media) follow the
 * Food model; these schemas only add the Sport-specific attributes. See docs/EXPERIENCE_ENGINE.md.
 */
import { z } from "zod";

export const SPORT_TYPES = ["pickleball", "pilates"] as const;
export const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "all-levels"] as const;
export const SESSION_FORMATS = ["trial", "private", "small-group", "group", "social-game", "open-play"] as const;
export const FACILITIES = ["shower", "changing-room", "parking", "lockers", "drinking-water", "air-conditioning"] as const;
export const COURT_SURFACES = ["acrylic", "concrete", "asphalt", "modular-tile", "wood", "other"] as const;
export const PILATES_EQUIPMENT = ["reformer", "mat", "cadillac", "chair", "barrel", "tower"] as const;

const price = z.object({
  minVnd: z.number().int().nonnegative(),
  maxVnd: z.number().int().nonnegative(),
  unit: z.enum(["session", "class", "package", "court-hour", "hour"]),
  note: z.string().optional(),
});

/** Sport-specific attributes of an establishment (shared fields live on the establishment record). */
export const SportVenueExtensionSchema = z.object({
  establishmentId: z.string(),
  sports: z.array(z.enum(SPORT_TYPES)).min(1),
  facilities: z.array(z.enum(FACILITIES)),
  instructorLanguages: z.array(z.string()),
  booking: z.object({ url: z.url().optional(), phone: z.string().optional(), note: z.string().optional() }).optional(),
  pickleball: z.object({
    courtCount: z.number().int().positive().optional(),
    indoor: z.boolean().optional(),
    outdoor: z.boolean().optional(),
    surface: z.enum(COURT_SURFACES).optional(),
    equipmentRental: z.boolean().optional(),
  }).optional(),
  pilates: z.object({
    equipment: z.array(z.enum(PILATES_EQUIPMENT)),
    maxClassSize: z.number().int().positive().optional(),
  }).optional(),
});

/** An offering = an activity at a venue (the Sport counterpart of a dish–restaurant link). */
export const SportOfferingSchema = z.object({
  activityId: z.string(),          // e.g. "reformer-pilates", "pickleball-beginner-clinic"
  establishmentId: z.string(),
  sport: z.enum(SPORT_TYPES),
  formats: z.array(z.enum(SESSION_FORMATS)).min(1),
  levels: z.array(z.enum(SKILL_LEVELS)).min(1),
  equipment: z.array(z.enum(PILATES_EQUIPMENT)).optional(),
  classSize: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).optional(),
  price: price.optional(),
  /** Weekly schedule as published by the venue (never inferred). */
  schedule: z.array(z.object({ day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) })).optional(),
});

export const InstructorSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  establishmentIds: z.array(z.string()),
  sports: z.array(z.enum(SPORT_TYPES)).min(1),
  languages: z.array(z.string()),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string().optional(), sourceUrl: z.url().optional() })),
});

export type SportVenueExtension = z.infer<typeof SportVenueExtensionSchema>;
export type SportOffering = z.infer<typeof SportOfferingSchema>;
export type Instructor = z.infer<typeof InstructorSchema>;
