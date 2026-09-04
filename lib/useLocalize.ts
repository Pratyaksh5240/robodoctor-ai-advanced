"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

export function useLocalize() {
  const { language } = useLanguage();
  return (english: string, hindi?: string) => {
    if (language === "hi") {
      return hindi || translateUi(english, "hi");
    }
    return translateUi(english, language);
  };
}
