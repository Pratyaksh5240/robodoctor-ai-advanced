"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

export function useLocalize() {
  const { language } = useLanguage();
  return (english: string, hindi: string) =>
    language === "hi" ? hindi : translateUi(english, language);
}
