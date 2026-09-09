"use client";

import { useState } from "react";
import { useLocalize } from "@/app/context/LanguageContext";

export type GuideItem = {
  label: string;
  detail?: string;
};

export type FeatureGuideProps = {
  badge?: string;
  title?: string;
  purpose: string;
  inputs: Array<string | GuideItem>;
  steps?: Array<string | GuideItem>;
  outputs: Array<string | GuideItem>;
  tip?: string;
  defaultOpen?: boolean;
};

export default function FeatureGuide({
  badge,
  title,
  purpose,
  inputs,
  steps,
  outputs,
  tip,
  defaultOpen = true,
}: FeatureGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const localize = useLocalize();

  return (
    <section aria-label="Feature User Guide" className="mb-6 overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 sm:p-5 shadow-lg shadow-cyan-950/10 backdrop-blur transition-all">
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {badge || localize("User Guide", "उपयोगकर्ता मार्गदर्शिका")}
              </span>
              <span className="hidden sm:inline-block text-[10px] rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-cyan-300 font-medium">
                {localize("Easy 3-Step Overview", "आसान 3-चरण अवलोकन")}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100">
              {title || localize("How to Use This Feature", "इस सुविधा का उपयोग कैसे करें")}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70 transition"
        >
          <span>
            {isOpen
              ? localize("Hide Guide", "मार्गदर्शिका छुपाएं")
              : localize("Show Instructions", "निर्देश देखें")}
          </span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Purpose Statement (Always Visible) */}
      <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
        {purpose}
      </p>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Pillar 1: What to Enter */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                  <span className="text-base">📥</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    {localize("1. What to Enter", "1. क्या दर्ज करें")}
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {inputs.map((item, idx) => {
                    const label = typeof item === "string" ? item : item.label;
                    const detail = typeof item === "string" ? null : item.detail;
                    return (
                      <li key={idx} className="flex items-start space-x-1.5 leading-snug">
                        <span className="text-emerald-400 font-bold mt-0.5">•</span>
                        <span>
                          <strong className="text-slate-100">{label}</strong>
                          {detail && <span className="text-slate-400"> - {detail}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Pillar 2: How It Works */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3.5 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center space-x-2 text-blue-400 mb-2">
                  <span className="text-base">⚙️</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    {localize("2. How It Works", "2. यह कैसे काम करता है")}
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(steps || [
                    localize("Enter your data or upload report", "अपना डेटा दर्ज करें या रिपोर्ट अपलोड करें"),
                    localize("Click Analyze / Calculate button", "विश्लेषण / गणना बटन पर क्लिक करें"),
                    localize("Review verified clinical insights", "सत्यापित चिकित्सीय निष्कर्ष देखें"),
                  ]).map((item, idx) => {
                    const label = typeof item === "string" ? item : item.label;
                    const detail = typeof item === "string" ? null : item.detail;
                    return (
                      <li key={idx} className="flex items-start space-x-1.5 leading-snug">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-[10px] font-bold text-blue-300 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>
                          <strong className="text-slate-100">{label}</strong>
                          {detail && <span className="text-slate-400"> - {detail}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Pillar 3: What You Get */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center space-x-2 text-purple-400 mb-2">
                  <span className="text-base">📤</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    {localize("3. What You Receive", "3. आपको क्या मिलेगा")}
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {outputs.map((item, idx) => {
                    const label = typeof item === "string" ? item : item.label;
                    const detail = typeof item === "string" ? null : item.detail;
                    return (
                      <li key={idx} className="flex items-start space-x-1.5 leading-snug">
                        <span className="text-purple-400 font-bold mt-0.5">✓</span>
                        <span>
                          <strong className="text-slate-100">{label}</strong>
                          {detail && <span className="text-slate-400"> - {detail}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Helpful Tip Footer */}
          {tip && (
            <div className="flex items-start space-x-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3.5 py-2.5 text-xs text-amber-200">
              <span className="font-bold text-amber-400 shrink-0">
                {localize("💡 Helpful Tip:", "💡 उपयोगी सुझाव:")}
              </span>
              <span className="leading-relaxed">{tip}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
