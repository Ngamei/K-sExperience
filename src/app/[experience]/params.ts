import { EXPERIENCES, type ExperienceId } from "@/experiences/registry";

/**
 * One set of routes for every non-Food module (/coffee/, /coffee/catalogue/, …) — the shared engine, not
 * cloned pages. Only implemented modules get pages; the gate still hides them unless their flag is on.
 */
export const moduleParams = () => EXPERIENCES.filter((e) => e.id !== "food" && e.implemented).map((e) => ({ experience: e.id }));
export const asModule = (id: string) => id as ExperienceId;
