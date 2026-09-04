"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

export default function MedicalDisclaimer() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const disclaimerText = isHindi
    ? "रोबोडॉक्टर एआई केवल सूचनात्मक और सहायता स्क्रीनिंग प्रदान करता है और यह चिकित्सीय निदान नहीं है। किसी भी स्वास्थ्य निर्णय के लिए हमेशा योग्य डॉक्टर से परामर्श लें।"
    : translateUi(
        "RoboDoctor AI provides informational screening only and is not a medical diagnosis. Always consult a licensed doctor for medical decisions.",
        language
      );

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4 print:hidden">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-5 text-xs text-[var(--muted)] flex items-start gap-3 shadow-sm">
        <span className="text-base select-none">⚠️</span>
        <div className="space-y-1">
          <div className="font-bold text-[var(--foreground)] uppercase tracking-wider text-[11px]">
            {isHindi ? "चिकित्सीय अस्वीकरण (Medical Disclaimer):" : "Official Medical Disclaimer:"}
          </div>
          <p className="leading-relaxed opacity-90">{disclaimerText}</p>
        </div>
      </div>
    </div>
  );
}
