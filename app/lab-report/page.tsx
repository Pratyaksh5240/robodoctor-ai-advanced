"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

type LabForm = {
  fastingSugar: string;
  hba1c: string;
  hemoglobin: string;
  tsh: string;
  totalCholesterol: string;
};

const initialForm: LabForm = {
  fastingSugar: "",
  hba1c: "",
  hemoglobin: "",
  tsh: "",
  totalCholesterol: "",
};

type LabFinding = {
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
  tone: "low" | "medium" | "high";
};

const toneClasses = {
  low: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  medium: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  high: "border-rose-400/20 bg-rose-500/10 text-rose-100",
};

export default function LabReportPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);
  const [form, setForm] = useState<LabForm>(initialForm);

  const findings = useMemo(() => {
    const nextFindings: LabFinding[] = [];
    const fastingSugar = Number(form.fastingSugar);
    const hba1c = Number(form.hba1c);
    const hemoglobin = Number(form.hemoglobin);
    const tsh = Number(form.tsh);
    const totalCholesterol = Number(form.totalCholesterol);

    if (!Number.isNaN(fastingSugar) && form.fastingSugar) {
      if (fastingSugar >= 126) {
        nextFindings.push({
          titleEn: "High fasting sugar",
          titleHi: "फास्टिंग शुगर अधिक है",
          detailEn:
            "This is in a diabetic-range zone and should be reviewed with a doctor soon.",
          detailHi:
            "यह डायबिटीज रेंज में हो सकता है और इसे जल्द डॉक्टर से दिखाना चाहिए।",
          tone: "high",
        });
      } else if (fastingSugar >= 100) {
        nextFindings.push({
          titleEn: "Borderline fasting sugar",
          titleHi: "फास्टिंग शुगर सीमा रेखा पर है",
          detailEn:
            "This may suggest prediabetes. Diet, exercise, and repeat testing may help.",
          detailHi:
            "यह प्रीडायबिटीज का संकेत हो सकता है। डाइट, व्यायाम और दोबारा जांच मदद कर सकती है।",
          tone: "medium",
        });
      } else {
        nextFindings.push({
          titleEn: "Fasting sugar looks in range",
          titleHi: "फास्टिंग शुगर सामान्य लग रही है",
          detailEn: "The entered fasting sugar is in a typical healthy range.",
          detailHi: "दर्ज की गई फास्टिंग शुगर सामान्य सीमा में लग रही है।",
          tone: "low",
        });
      }
    }

    if (!Number.isNaN(hba1c) && form.hba1c) {
      if (hba1c >= 6.5) {
        nextFindings.push({
          titleEn: "HbA1c is high",
          titleHi: "HbA1c अधिक है",
          detailEn:
            "This may suggest diabetes control needs medical review and stronger routine changes.",
          detailHi:
            "यह बता सकता है कि डायबिटीज नियंत्रण के लिए डॉक्टर की सलाह और मजबूत दिनचर्या बदलाव चाहिए।",
          tone: "high",
        });
      } else if (hba1c >= 5.7) {
        nextFindings.push({
          titleEn: "HbA1c is above ideal",
          titleHi: "HbA1c आदर्श स्तर से ऊपर है",
          detailEn:
            "This can match early blood sugar risk and is worth monitoring.",
          detailHi:
            "यह शुरुआती ब्लड शुगर जोखिम का संकेत हो सकता है और निगरानी योग्य है।",
          tone: "medium",
        });
      }
    }

    if (!Number.isNaN(hemoglobin) && form.hemoglobin) {
      if (hemoglobin < 12) {
        nextFindings.push({
          titleEn: "Hemoglobin may be low",
          titleHi: "हीमोग्लोबिन कम हो सकता है",
          detailEn:
            "Low hemoglobin can match anemia, weakness, tiredness, or poor iron stores.",
          detailHi:
            "कम हीमोग्लोबिन एनीमिया, कमजोरी, थकान या आयरन की कमी से जुड़ा हो सकता है।",
          tone: "medium",
        });
      } else {
        nextFindings.push({
          titleEn: "Hemoglobin looks okay",
          titleHi: "हीमोग्लोबिन ठीक लग रहा है",
          detailEn:
            "The entered hemoglobin does not suggest a low-value alert.",
          detailHi: "दर्ज किया गया हीमोग्लोबिन कम होने का संकेत नहीं देता।",
          tone: "low",
        });
      }
    }

    if (!Number.isNaN(tsh) && form.tsh) {
      if (tsh > 4.5) {
        nextFindings.push({
          titleEn: "TSH may be elevated",
          titleHi: "TSH बढ़ा हुआ हो सकता है",
          detailEn:
            "A higher TSH may fit hypothyroid pattern and should be reviewed with symptoms.",
          detailHi:
            "बढ़ा हुआ TSH हाइपोथायरॉयड पैटर्न से मेल खा सकता है और लक्षणों के साथ डॉक्टर को दिखाना चाहिए।",
          tone: "medium",
        });
      } else if (tsh < 0.4) {
        nextFindings.push({
          titleEn: "TSH may be low",
          titleHi: "TSH कम हो सकता है",
          detailEn:
            "A low TSH can match hyperthyroid pattern and may need confirmation testing.",
          detailHi:
            "कम TSH हाइपरथायरॉयड पैटर्न से मेल खा सकता है और पुष्टि जांच की जरूरत हो सकती है।",
          tone: "medium",
        });
      }
    }

    if (!Number.isNaN(totalCholesterol) && form.totalCholesterol) {
      if (totalCholesterol >= 240) {
        nextFindings.push({
          titleEn: "Total cholesterol is high",
          titleHi: "कुल कोलेस्ट्रॉल अधिक है",
          detailEn:
            "Higher cholesterol can raise heart-risk over time and usually needs lifestyle review.",
          detailHi:
            "अधिक कोलेस्ट्रॉल समय के साथ हृदय जोखिम बढ़ा सकता है और जीवनशैली की समीक्षा चाहिए।",
          tone: "high",
        });
      } else if (totalCholesterol >= 200) {
        nextFindings.push({
          titleEn: "Total cholesterol is borderline",
          titleHi: "कुल कोलेस्ट्रॉल सीमा रेखा पर है",
          detailEn:
            "This is not ideal and is worth tracking with diet and activity changes.",
          detailHi:
            "यह आदर्श नहीं है और डाइट व गतिविधि बदलाव के साथ ट्रैक करना चाहिए।",
          tone: "medium",
        });
      }
    }

    return nextFindings;
  }, [form]);

  const summary =
    findings.length === 0
      ? localize(
          "Enter a few basic lab values to quickly understand what looks normal and what may need doctor review.",
          "कुछ बेसिक लैब वैल्यू दर्ज करें और तुरंत समझें कि कौन सी चीज सामान्य है और किसे डॉक्टर को दिखाना चाहिए।"
        )
      : localize(
          "This tool offers simple educational interpretation only, not diagnosis. Please see a doctor for abnormal values.",
          "यह टूल केवल सामान्य समझ देने के लिए है, पक्का निदान नहीं। असामान्य वैल्यू होने पर डॉक्टर से सलाह लें।"
        );

  const fields = [
    ["fastingSugar", localize("Fasting sugar (mg/dL)", "फास्टिंग शुगर (mg/dL)")],
    ["hba1c", "HbA1c (%)"],
    ["hemoglobin", localize("Hemoglobin (g/dL)", "हीमोग्लोबिन (g/dL)")],
    ["tsh", "TSH (mIU/L)"],
    [
      "totalCholesterol",
      localize("Total cholesterol (mg/dL)", "कुल कोलेस्ट्रॉल (mg/dL)"),
    ],
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-amber-400">
              {localize("Lab Report", "लैब रिपोर्ट")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize("Basic lab report analyzer", "बेसिक लैब रिपोर्ट विश्लेषक")}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">{summary}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">
              {localize("Enter lab values", "लैब वैल्यू दर्ज करें")}
            </h2>
            <div className="mt-5 grid gap-4">
              {fields.map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm text-[var(--muted)]">
                    {label}
                  </span>
                  <input
                    value={form[key as keyof LabForm]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    type="number"
                    className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 outline-none"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">
              {localize("Simple interpretation", "सरल व्याख्या")}
            </h2>
            <div className="mt-5 space-y-4">
              {findings.length === 0 ? (
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 text-[var(--muted)]">
                  {localize(
                    "Fill a few values and this section will explain each one in simple language.",
                    "रिपोर्ट के कुछ मान भरें, फिर यह सेक्शन हर वैल्यू के बारे में आसान भाषा में समझ देगा।"
                  )}
                </div>
              ) : (
                findings.map((finding) => (
                  <div
                    key={finding.titleEn}
                    className={`rounded-3xl border p-5 ${toneClasses[finding.tone]}`}
                  >
                    <h3 className="text-xl font-bold">
                      {isHindi
                        ? finding.titleHi
                        : translateUi(finding.titleEn, language)}
                    </h3>
                    <p className="mt-2 text-sm leading-7">
                      {isHindi
                        ? finding.detailHi
                        : translateUi(finding.detailEn, language)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
                {localize("Important note", "महत्वपूर्ण नोट")}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                {localize(
                  "This is not a substitute for medical review. If sugar, HbA1c, thyroid, or cholesterol values are abnormal, please discuss the full report with a doctor.",
                  "यह डॉक्टर की रिपोर्ट का विकल्प नहीं है। यदि शुगर, HbA1c, थायरॉयड या कोलेस्ट्रॉल असामान्य हो, तो पूरी लैब रिपोर्ट के साथ डॉक्टर से मिलें।"
                )}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
