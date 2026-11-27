import { Suspense } from "react";
import { ModulePage } from "@/components/engine/module-page";
import { asModule, moduleParams } from ".././params";

export const dynamicParams = false;
export const generateStaticParams = moduleParams;

export default async function Page({ params }: PageProps<"/[experience]/item">) {
  return <Suspense><ModulePage id={asModule((await params).experience)} slot="item" /></Suspense>;
}
