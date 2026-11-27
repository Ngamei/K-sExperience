"use client";
import { useCallback } from "react";
import { useUser } from "../store/user";
import { type DictKey, translate } from "./dict";

export function useT() {
  const locale = useUser((s) => s.locale);
  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);
  return { t, locale };
}
