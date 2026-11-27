import { readFileSync } from "node:fs";
import path from "node:path";
import { EXPERIENCES } from "@/experiences/registry";
import { ExperienceDataSchema } from "@/engine/schema";

/** Each implemented module's dataset as one static JSON file (/data/experiences/<id>.json), validated at build time. */
export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => EXPERIENCES.filter((e) => e.id !== "food" && e.implemented).map((e) => ({ file: `${e.id}.json` }));

export async function GET(_req: Request, { params }: RouteContext<"/data/experiences/[file]">) {
  const { file } = await params;
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data/experiences", path.basename(file)), "utf8"));
  return Response.json(ExperienceDataSchema.parse(raw));
}
