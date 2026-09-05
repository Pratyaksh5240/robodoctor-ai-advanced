"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

export function useLocalize() {
  const { language } = useLanguage();
  return (english: string, hindi?: string, vars?: Record<string, string | number>) => {
    let result = language === "hi"
      ? (hindi || translateUi(english, "hi"))
      : translateUi(english, language);

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return result;
  };
}
