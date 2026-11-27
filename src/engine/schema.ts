/**
 * Shared Experience Engine — data model for experience modules other than Food.
 *
 *   Experience item  (Food: dish)        e.g. Cà phê muối, Espresso Martini, Gội đầu dưỡng sinh, Reformer Pilates
 *   Establishment    (Food: restaurant)  café, bar, spa, studio, court — same shape as a Food restaurant
 *   Offering         (Food: dish link)   "this establishment offers this item", with the SAME evidence levels,
 *                                        last-checked date, price and dish-at-place photo rules as Food links
 *
 * Food keeps its richer DishSchema (origins, ingredients, regional variants) as its module extension.
 */
import { z } from "zod";
import { EVIDENCE_TYPES, LINK_STATUSES, evidenceProblem } from "../lib/data/evidence";
import { LinkPhotoSchema, RestaurantSchema, VERIFICATION_STATUSES } from "../lib/data/schema";
import { EXPERIENCE_IDS } from "../experiences/registry";

const localized = z.object({ vi: z.string(), en: z.string() });
const sourceRef = z.object({ title: z.string().min(1), url: z.url().optional(), accessed: z.string().optional(), note: z.string().optional() });
const photo = z.object({ url: z.string().min(1), credit: z.string().min(1), license: z.string().min(1), sourceUrl: z.url().optional() });

/** Module-specific attribute values, keyed by the attribute ids declared in the module's registry config. */
const attributes = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]));

export const ExperienceItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  experienceId: z.enum(EXPERIENCE_IDS),
  nameVi: z.string().min(1),
  nameEn: z.string().min(1),
  altNames: z.array(z.string()),
  /** One of the module's registry categories. */
  category: z.string().min(1),
  attributes,
  description: localized,
  photos: z.array(photo),
  sources: z.array(sourceRef),
  verification: z.object({ status: z.enum(VERIFICATION_STATUSES), notes: z.string().optional() }),
  dataset: z.enum(["seed", "master"]),
});
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;

/** Establishment = the Food restaurant shape with a free venue type and the modes it belongs to. */
export const EstablishmentSchema = RestaurantSchema.extend({
  venueType: z.string().min(1),
  experiences: z.array(z.enum(EXPERIENCE_IDS)).min(1),
});
export type Establishment = z.infer<typeof EstablishmentSchema>;

export const OfferingSchema = z.object({
  itemId: z.string(),
  establishmentId: z.string(),
  status: z.enum(LINK_STATUSES),
  isSample: z.boolean(),
  menuEvidence: z.object({ type: z.enum(EVIDENCE_TYPES), note: z.string(), url: z.url().optional() }).optional(),
  price: z.object({ minVnd: z.number(), maxVnd: z.number(), unit: z.string() }).optional(),
  lastVerified: z.string().optional(),
  photo: LinkPhotoSchema.optional(),
}).superRefine((o, ctx) => {
  const problem = evidenceProblem(o.status, o.menuEvidence?.type, o.isSample);
  if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["menuEvidence"] });
  if (o.status !== "candidate" && !o.isSample && !o.lastVerified) ctx.addIssue({ code: "custom", message: "lastVerified (last-checked date) is required", path: ["lastVerified"] });
});
export type Offering = z.infer<typeof OfferingSchema>;

export const ExperienceDataSchema = z.object({
  metadata: z.object({ experienceId: z.enum(EXPERIENCE_IDS), note: z.string(), dataset: z.enum(["seed", "master", "empty"]) }),
  items: z.array(ExperienceItemSchema),
  establishments: z.array(EstablishmentSchema),
  offerings: z.array(OfferingSchema),
});
export type ExperienceData = z.infer<typeof ExperienceDataSchema>;
