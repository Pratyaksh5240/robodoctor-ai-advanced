"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";

export default function EmergencyButton() {
  const [isOpen, setIsOpen] = useState(false);
  const localize = useLocalize();

  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener("open-emergency-modal", handleOpenModal);
    return () => window.removeEventListener("open-emergency-modal", handleOpenModal);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Floating Action Button (FAB) anchored bottom-left to avoid overlapping with AI Assistant at bottom-right */}
      <div className="fixed bottom-6 left-6 z-[9998]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={localize("Emergency Medical Assistance", "आपातकालीन चिकित्सा सहायता")}
          className="group flex items-center gap-2.5 rounded-full bg-red-600 px-4 py-3 text-white font-bold shadow-2xl shadow-red-600/40 hover:bg-red-500 hover:scale-105 active:scale-95 transition-all duration-200 border border-red-400/30"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="text-sm">🚨 {localize("Emergency", "इमरजेंसी")}</span>
        </button>
      </div>

      {/* Emergency Drawer / Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-3xl border border-red-500/40 bg-[#0c1827] p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-dialog-title"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 text-lg font-bold transition"
              aria-label="Close dialog"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wide border border-red-500/40">
                <span>🚨 Emergency Medical Access</span>
              </div>
              <h2 id="emergency-dialog-title" className="text-xl sm:text-2xl font-extrabold text-white">
                {localize("Urgent Medical Help", "तत्काल चिकित्सा सहायता")}
              </h2>
            </div>

            {/* Acute Symptom Warning */}
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-200 space-y-1">
              <div className="font-bold text-red-400 uppercase tracking-wide">
                ⚠️ {localize("Immediate Action Required:", "तत्काल कार्रवाई आवश्यक:")}
              </div>
              <p className="leading-relaxed">
                {localize(
                  "Call local emergency services immediately for chest pain, severe shortness of breath, sudden weakness/numbness, or loss of consciousness.",
                  "सीने में दर्द, सांस लेने में अत्यधिक तकलीफ, अचानक कमजोरी/सुन्नता या बेहोशी की स्थिति में तुरंत स्थानीय आपातकालीन सेवाओं को कॉल करें।"
                )}
              </p>
            </div>

            {/* Regional Emergency Quick Dial Numbers */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                {localize("Quick Emergency Helplines:", "त्वरित आपातकालीन हेल्पलाइन:")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:108"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 transition group"
                >
                  <div>
                    <div className="text-xs text-slate-400">India Ambulance</div>
                    <div className="text-base font-extrabold text-red-400 group-hover:text-red-300">108 / 112</div>
                  </div>
                  <span className="text-lg">📞</span>
                </a>
                <a
                  href="tel:911"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 transition group"
                >
                  <div>
                    <div className="text-xs text-slate-400">US / Intl Emergency</div>
                    <div className="text-base font-extrabold text-red-400 group-hover:text-red-300">911 / 112</div>
                  </div>
                  <span className="text-lg">📞</span>
                </a>
              </div>
            </div>

            {/* Quick Links to Saved Contacts & First Aid */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                {localize("Emergency Resources:", "आपातकालीन संसाधन:")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/emergency-contacts"
                  onClick={() => setIsOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition text-xs font-semibold text-cyan-300 flex items-center justify-between"
                >
                  <span>📞 {localize("Saved Contacts", "सेव किए कॉन्टैक्ट्स")}</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/first-aid"
                  onClick={() => setIsOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition text-xs font-semibold text-cyan-300 flex items-center justify-between"
                >
                  <span>🩹 {localize("First Aid Guide", "प्राथमिक चिकित्सा")}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function openEmergencyModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("open-emergency-modal"));
  }
}
