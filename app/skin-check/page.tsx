"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveSkinReport, loadSkinReports, SkinReportRecord } from "@/lib/reportHistory";
import { SkinAnalysis } from "@/lib/skinAnalysis";
import { useLanguage } from "@/app/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { translateUi } from "@/lib/uiI18n";

type SkinFormState = {
  bodyPart: string;
  duration: string;
  symptoms: string;
  texture: string;
  spreading: boolean;
  pain: boolean;
  itching: boolean;
  fever: boolean;
  discharge: boolean;
  bleeding: boolean;
};

const initialState: SkinFormState = {
  bodyPart: "arm",
  duration: "1-7-days",
  symptoms: "",
  texture: "",
  spreading: false,
  pain: false,
  itching: false,
  fever: false,
  discharge: false,
  bleeding: false,
};

const severityTone = {
  low: { label: "Low", color: "#22c55e" },
  moderate: { label: "Moderate", color: "#eab308" },
  high: { label: "High", color: "#f97316" },
  urgent: { label: "Urgent", color: "#dc2626" },
};

type SavedSkinReport = {
  createdAt: number;
  bodyPart: string;
  severity: string;
  score: number;
  summary: string;
};

type ImageCheckResult = {
  isSkinLike: boolean;
  message: string;
};

const skinTextTranslations: Record<string, string> = {
  "This looks like a lower-risk skin issue based on the entered details, but continue monitoring changes.":
    "दिए गए विवरण के आधार पर यह कम जोखिम वाली त्वचा समस्या लगती है, लेकिन बदलावों पर नजर रखें।",
  "One or more warning signs suggest this skin problem needs urgent medical attention.":
    "एक या अधिक चेतावनी संकेत बताते हैं कि इस त्वचा समस्या के लिए तुरंत चिकित्सा सहायता चाहिए।",
  "This skin issue has several concerning features and should be reviewed by a clinician soon.":
    "इस त्वचा समस्या में कई चिंताजनक संकेत हैं और इसे जल्द डॉक्टर को दिखाना चाहिए।",
  "This looks like a moderate skin concern. Home care may help, but follow-up is reasonable if it persists.":
    "यह मध्यम स्तर की त्वचा समस्या लगती है। घर पर देखभाल मदद कर सकती है, लेकिन समस्या बनी रहे तो डॉक्टर से मिलना ठीक रहेगा।",
  "If it worsens, spreads, or fails to improve, book a routine doctor review.":
    "यदि यह बढ़े, फैले, या ठीक न हो, तो सामान्य डॉक्टर जांच कराएं।",
  "Seek urgent care now if fever, facial swelling, rapid spread, or severe pain is present.":
    "यदि बुखार, चेहरे पर सूजन, तेजी से फैलना, या तेज दर्द हो तो तुरंत इलाज लें।",
  "Arrange a doctor or dermatologist visit within 24 to 72 hours.":
    "24 से 72 घंटे के भीतर डॉक्टर या त्वचा विशेषज्ञ से मिलें।",
  "Monitor for 2 to 3 days and seek medical review if it spreads or becomes painful.":
    "2 से 3 दिन तक नजर रखें और यदि यह फैले या दर्दनाक हो जाए तो डॉक्टर को दिखाएं।",
  "Eczema or allergic irritation pattern": "एक्जिमा या एलर्जी जनित जलन का पैटर्न",
  "Itching with dry or patchy skin can match eczema, irritation, or allergy-related flare.":
    "सूखी या धब्बेदार त्वचा के साथ खुजली एक्जिमा, जलन, या एलर्जी से जुड़ी समस्या हो सकती है।",
  "Acne-type pattern": "मुंहासे जैसा पैटर्न",
  "Bumps, pimples, or oil-related lesions often fit acne or follicle irritation.":
    "दाने, पिंपल, या तेलीय त्वचा से जुड़े घाव अक्सर मुंहासे या रोमछिद्र की जलन से मेल खाते हैं।",
  "Possible fungal infection pattern": "संभावित फंगल संक्रमण का पैटर्न",
  "Circular or scaly rash patterns can suggest a fungal skin issue.":
    "गोल या पपड़ीदार दाने फंगल त्वचा संक्रमण का संकेत हो सकते हैं।",
  "Inflammatory rash pattern": "सूजन वाले दाने का पैटर्न",
  "Redness, burning, or swelling can fit irritation, allergy, or infection-related inflammation.":
    "लालिमा, जलन, या सूजन जलन, एलर्जी, या संक्रमण से जुड़ी सूजन का संकेत हो सकती है।",
  "Possible infection pattern": "संभावित संक्रमण का पैटर्न",
  "Blisters, boils, pus, or crusting can suggest bacterial or viral skin infection.":
    "फफोले, फुंसी, पस, या पपड़ी बनना बैक्टीरियल या वायरल त्वचा संक्रमण का संकेत हो सकता है।",
  "Spreading rash": "फैलता हुआ दाना",
  "A rash or lesion that is spreading needs earlier medical review.":
    "जो दाना या घाव फैल रहा हो, उसे जल्दी डॉक्टर को दिखाना चाहिए।",
  "Painful lesion": "दर्द वाला घाव",
  "Pain suggests deeper inflammation or infection rather than a mild cosmetic issue.":
    "दर्द यह संकेत दे सकता है कि समस्या केवल हल्की नहीं बल्कि सूजन या संक्रमण से जुड़ी है।",
  "Skin symptoms with fever": "बुखार के साथ त्वचा के लक्षण",
  "Fever with rash, swelling, or skin pain can signal an infection needing urgent care.":
    "दाने, सूजन, या त्वचा दर्द के साथ बुखार होना ऐसे संक्रमण का संकेत हो सकता है जिसे तुरंत इलाज चाहिए।",
  "Bleeding or discharge": "खून या रिसाव",
  "Bleeding, pus, or fluid release can indicate an infected or unstable lesion.":
    "खून, पस, या तरल निकलना संक्रमित या अस्थिर घाव का संकेत हो सकता है।",
  "Persistent skin issue": "लंबे समय से बनी त्वचा समस्या",
  "A lesion lasting more than two weeks should be reviewed by a clinician or dermatologist.":
    "दो हफ्तों से अधिक समय तक रहने वाले घाव को डॉक्टर या त्वचा विशेषज्ञ को दिखाना चाहिए।",
  "Non-specific skin concern": "सामान्य त्वचा चिंता",
  "The entered details do not strongly match one pattern, so better images and symptom details would help.":
    "दिए गए विवरण किसी एक पैटर्न से स्पष्ट रूप से मेल नहीं खाते, इसलिए बेहतर फोटो और अधिक लक्षण विवरण मदद करेंगे।",
  "Use a gentle cleanser, avoid harsh soaps, and do not scratch the area.":
    "हल्का क्लेंजर इस्तेमाल करें, तेज साबुन से बचें, और उस जगह को खुजलाएं नहीं।",
  "Keep the area clean, avoid squeezing lesions, and use non-comedogenic products.":
    "उस हिस्से को साफ रखें, दानों को दबाएं नहीं, और नॉन-कॉमेडोजेनिक उत्पाद इस्तेमाल करें।",
  "Keep the skin dry, avoid sharing towels, and consider medical review if it expands.":
    "त्वचा को सूखा रखें, तौलिया साझा न करें, और यदि यह फैले तो डॉक्टर से सलाह लें।",
  "Avoid new cosmetic products or creams on the area until the cause is clearer.":
    "कारण स्पष्ट होने तक उस हिस्से पर नए कॉस्मेटिक उत्पाद या क्रीम न लगाएं।",
  "Do not pop blisters or boils, and keep the area clean and covered if rubbing occurs.":
    "फफोले या फुंसियों को फोड़ें नहीं, और रगड़ होने पर उस जगह को साफ और ढका रखें।",
  "Sensitive body areas need lower thresholds for professional review.":
    "शरीर के संवेदनशील हिस्सों के लिए डॉक्टर की सलाह जल्दी लेना बेहतर होता है।",
  "This screening cannot confirm diagnosis from a photo alone.":
    "केवल फोटो के आधार पर यह स्क्रीनिंग पक्की बीमारी की पुष्टि नहीं कर सकती।",
};

const bodyPartLabels: Record<string, { en: string; hi: string }> = {
  face: { en: "Face", hi: "चेहरा" },
  arm: { en: "Arm", hi: "हाथ" },
  leg: { en: "Leg", hi: "पैर" },
  chest: { en: "Chest", hi: "छाती" },
  back: { en: "Back", hi: "पीठ" },
  genitals: { en: "Private area", hi: "निजी भाग" },
  other: { en: "Other", hi: "अन्य" },
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = src;
  });

async function validateSkinLikeImage(dataUrl: string, isHindi: boolean): Promise<ImageCheckResult> {
  try {
    const image = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return { isSkinLike: true, message: "" };
    }

    const sampleSize = 64;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    context.drawImage(image, 0, 0, sampleSize, sampleSize);

    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
    const totalPixels = data.length / 4;
    let skinTonePixels = 0;
    let brightPixels = 0;
    let darkPixels = 0;
    let neutralPixels = 0;
    let saturatedPixels = 0;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const difference = max - min;
      const average = (red + green + blue) / 3;

      if (average > 232) {
        brightPixels += 1;
      }

      if (average < 60) {
        darkPixels += 1;
      }

      if (difference < 18) {
        neutralPixels += 1;
      }

      if (difference > 42) {
        saturatedPixels += 1;
      }

      if (
        red > 60 &&
        green > 40 &&
        blue > 20 &&
        red > green &&
        red > blue &&
        difference > 15 &&
        Math.abs(red - green) > 12
      ) {
        skinTonePixels += 1;
      }
    }

    const skinRatio = skinTonePixels / totalPixels;
    const brightRatio = brightPixels / totalPixels;
    const darkRatio = darkPixels / totalPixels;
    const neutralRatio = neutralPixels / totalPixels;
    const saturatedRatio = saturatedPixels / totalPixels;

    const looksLikeDocument =
      skinRatio < 0.08 &&
      ((brightRatio > 0.45 && darkRatio > 0.04) || neutralRatio > 0.78 || saturatedRatio < 0.1);

    if (looksLikeDocument) {
      return {
        isSkinLike: false,
        message: isHindi
          ? "Yeh photo twacha ki photo jaisi nahin lag rahi hai. Kripya sirf prabhavit twacha wale hissa ki saaf photo upload karein."
          : "This does not appear to be a skin photo. Please upload a clear photo of the affected skin area only.",
      };
    }

    return { isSkinLike: true, message: "" };
  } catch {
    return {
      isSkinLike: false,
      message: isHindi
        ? "Photo padi nahin ja saki. Kripya twacha ki ek saaf photo dobara upload karein."
        : "The image could not be read. Please upload a clear skin photo and try again.",
    };
  }
}

const translateSkinText = (text: string, language: string) => {
  if (language === "hi") {
    return skinTextTranslations[text] || text;
  }

  if (language === "en") {
    return text;
  }

  return translateUi(text, language as Parameters<typeof translateUi>[1]);
};

const translateBodyPart = (bodyPart: string, language: string) => {
  const label = bodyPartLabels[bodyPart];
  if (!label) {
    return bodyPart;
  }

  if (language === "hi") {
    return label.hi;
  }

  if (language === "en") {
    return label.en;
  }

  return translateUi(label.en, language as Parameters<typeof translateUi>[1]);
};

export default function SkinCheckPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);
  const severityLabels = {
    low: localize("Low", "कम"),
    moderate: isHindi ? "मध्यम" : "Moderate",
    high: isHindi ? "उच्च" : "High",
    urgent: isHindi ? "तत्काल" : "Urgent",
  };
  const [form, setForm] = useState<SkinFormState>(initialState);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [reports, setReports] = useState<SavedSkinReport[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const savedReports = localStorage.getItem("robodoctor-skin-history");
    return savedReports ? (JSON.parse(savedReports) as SavedSkinReport[]) : [];
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"openai" | "rules" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [imageWarning, setImageWarning] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId(null);
        return;
      }

      setUserId(user.uid);

      try {
        const cloudReports = await loadSkinReports(user.uid);
        if (cloudReports.length > 0) {
          setReports(cloudReports);
        }
      } catch {
        setStatusMessage(
          isHindi
            ? "क्लाउड हिस्ट्री अभी उपलब्ध नहीं है, इसलिए लोकल हिस्ट्री का उपयोग किया जा रहा है।"
            : "Cloud history is unavailable right now, so local history is still being used."
        );
      }
    });

    return () => unsubscribe();
  }, [isHindi]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updateField = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = event.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;

    setForm((current) => ({
      ...current,
      [target.name]: value,
    }));
  };

  const applySelectedImage = (nextPreviewUrl: string, nextImageDataUrl: string) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(nextPreviewUrl);
    setImageDataUrl(nextImageDataUrl);
    setStatusMessage("");
    setImageWarning("");
    setAnalysis(null);
    setAnalysisSource(null);
  };

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setStatusMessage(
          isHindi
            ? "फोटो पढ़ी नहीं जा सकी। कृपया दूसरी फोटो चुनें।"
            : "The selected image could not be read. Please choose another photo."
        );
        return;
      }

      applySelectedImage(nextPreviewUrl, result);
    };
    reader.readAsDataURL(file);
  };

  const persistReport = async (report: SkinReportRecord) => {
    const nextHistory = [report, ...reports].slice(0, 5);
    setReports(nextHistory);
    localStorage.setItem("robodoctor-skin-history", JSON.stringify(nextHistory));

    if (!userId) {
      return;
    }

    try {
      await saveSkinReport(userId, report);
      setStatusMessage(isHindi ? "स्किन रिपोर्ट आपकी क्लाउड हिस्ट्री में सेव हो गई।" : "Skin report saved to your cloud history.");
    } catch {
      setStatusMessage(
        isHindi
          ? "स्किन विश्लेषण पूरा हुआ, लेकिन क्लाउड सेव नहीं हो पाया। लोकल सेव सफल रहा।"
          : "Skin analysis completed, but cloud save failed. Local save still worked."
      );
    }
  };

  const runAnalysis = async () => {
    if (!imageDataUrl) {
      setAnalysis(null);
      setAnalysisSource(null);
      setImageWarning("");
      setStatusMessage(
        isHindi
          ? "विश्लेषण शुरू करने से पहले कृपया त्वचा की फोटो अपलोड करें।"
          : "Please upload a skin photo before analysis."
      );
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage("");
    setImageWarning("");

    const imageCheck = await validateSkinLikeImage(imageDataUrl, isHindi);
    if (!imageCheck.isSkinLike) {
      setAnalysis(null);
      setAnalysisSource(null);
      setImageWarning(imageCheck.message);
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch("/api/skin-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          imageDataUrl,
        }),
      });

      const data = (await response.json()) as {
        analysis?: SkinAnalysis;
        source?: "openai" | "rules";
        error?: string;
      };

      if (!response.ok || !data.analysis) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.analysis);
      setAnalysisSource(data.source || "rules");

      const nextReport: SkinReportRecord = {
        createdAt: Date.now(),
        bodyPart: form.bodyPart,
        severity: severityLabels[data.analysis.severity],
        score: data.analysis.score,
        summary: data.analysis.summary,
      };

      await persistReport(nextReport);
    } catch {
      setStatusMessage(
        isHindi
          ? "विश्लेषण अभी पूरा नहीं हो पाया। कृपया फिर कोशिश करें।"
          : "Analysis could not be completed right now. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#163047_0%,#08111d_45%,#04070c_100%)] text-white px-6 py-8 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300 mb-2">
              {isHindi ? "स्किन चेक" : "Skin Check"}
            </p>
            <h1 className="text-4xl md:text-5xl font-black">
              {isHindi ? "कैमरा-सहायित त्वचा स्क्रीनिंग" : "Skin Photo Analysis"}
            </h1>
            <p className="text-slate-300 mt-3 max-w-3xl">
              {isHindi
                ? "त्वचा की फोटो अपलोड करें या कैमरे से लें, लक्षण जोड़ें और रेड फ्लैग्स व सावधानियों के साथ ट्रायज-स्टाइल जोखिम सारांश पाएं।"
                : "Upload a skin photo, add symptoms, and get a triage-style risk summary with red flags and precautions."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="self-start rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-slate-100 hover:bg-white/10"
            >
              {isHindi ? "होम पर वापस जाएं" : "Back Home"}
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-300 mb-2">
                  {isHindi ? "फोटो अपलोड या कैमरा कैप्चर" : "Upload skin photo"}
                </label>
                <div className="rounded-3xl border border-dashed border-cyan-400/40 bg-slate-950/60 p-5">
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onImageChange}
                        className="hidden"
                      />
                      {isHindi ? "फोटो अपलोड करें" : "Upload photo"}
                    </label>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    {isHindi
                      ? "सबसे अच्छे परिणाम के लिए रोशनी अच्छी हो, फोटो साफ हो, और फ्रेम में एक ही त्वचा क्षेत्र दिखे।"
                      : "Best results come from good lighting, a sharp image, and one skin area filling most of the frame."}
                  </p>
                  <p className="mt-2 text-xs text-cyan-200">
                    {isHindi
                      ? "विश्लेषण शुरू करने के लिए त्वचा की फोटो अपलोड करना जरूरी है।"
                      : "A skin photo is required before analysis can start."}
                  </p>
                  {previewUrl && (
                    <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
                      <Image
                        src={previewUrl}
                        alt="Skin preview"
                        width={1200}
                        height={900}
                        unoptimized
                        className="h-72 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">{isHindi ? "शरीर का हिस्सा" : "Body area"}</label>
                <select
                  name="bodyPart"
                  value={form.bodyPart}
                  onChange={updateField}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3"
                >
                  <option value="face">{isHindi ? "चेहरा" : "Face"}</option>
                  <option value="arm">{isHindi ? "हाथ" : "Arm"}</option>
                  <option value="leg">{isHindi ? "पैर" : "Leg"}</option>
                  <option value="chest">{isHindi ? "छाती" : "Chest"}</option>
                  <option value="back">{isHindi ? "पीठ" : "Back"}</option>
                  <option value="genitals">{isHindi ? "निजी भाग" : "Private area"}</option>
                  <option value="other">{isHindi ? "अन्य" : "Other"}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">{isHindi ? "अवधि" : "Duration"}</label>
                <select
                  name="duration"
                  value={form.duration}
                  onChange={updateField}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3"
                >
                  <option value="less-than-24h">{isHindi ? "24 घंटे से कम" : "Less than 24 hours"}</option>
                  <option value="1-7-days">{isHindi ? "1 से 7 दिन" : "1 to 7 days"}</option>
                  <option value="1-2-weeks">{isHindi ? "1 से 2 हफ्ते" : "1 to 2 weeks"}</option>
                  <option value="more-than-2-weeks">{isHindi ? "2 हफ्ते से अधिक" : "More than 2 weeks"}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-300 mb-2">{isHindi ? "लक्षण" : "Symptoms"}</label>
                <textarea
                  name="symptoms"
                  value={form.symptoms}
                  onChange={updateField}
                  rows={4}
                  placeholder={isHindi ? "उदाहरण: खुजली वाला लाल दाग, गोल किनारा, हल्की जलन" : "Example: itchy red rash with circular border and mild burning"}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-300 mb-2">{isHindi ? "दिखावट या बनावट" : "Texture or look"}</label>
                <input
                  type="text"
                  name="texture"
                  value={form.texture}
                  onChange={updateField}
                  placeholder={isHindi ? "सूखा, पपड़ीदार, फफोला, पस, पैची, उभरा हुआ" : "dry, scaly, blister, pus, patchy, raised"}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["itching", isHindi ? "खुजली" : "Itching"],
                ["pain", isHindi ? "दर्द या जलन" : "Pain or burning"],
                ["spreading", isHindi ? "तेजी से फैल रहा है" : "Spreading quickly"],
                ["fever", isHindi ? "बुखार है" : "Fever present"],
                ["discharge", isHindi ? "पस या डिस्चार्ज" : "Pus or discharge"],
                ["bleeding", isHindi ? "खून निकलना" : "Bleeding"],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    name={name}
                    checked={form[name as keyof SkinFormState] as boolean}
                    onChange={updateField}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={runAnalysis}
                disabled={!imageDataUrl || isAnalyzing}
                className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing ? (isHindi ? "विश्लेषण हो रहा है..." : "Analyzing...") : (isHindi ? "त्वचा समस्या का विश्लेषण करें" : "Analyze Skin Issue")}
              </button>
              <button
                onClick={() => {
                  setForm(initialState);
                  setAnalysis(null);
                  setAnalysisSource(null);
                  setStatusMessage("");
                  setImageWarning("");
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setPreviewUrl(null);
                  setImageDataUrl(null);
                }}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3"
              >
                {isHindi ? "रीसेट" : "Reset"}
              </button>
            </div>

            {statusMessage && (
              <p className="mt-4 text-sm text-cyan-200">{statusMessage}</p>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-[#09101b] p-6">
              <h2 className="text-2xl font-bold mb-4">{isHindi ? "ट्रायज परिणाम" : "Triage Result"}</h2>
              {!analysis ? (
                imageWarning ? (
                  <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 text-amber-100">
                    <p className="text-sm uppercase tracking-[0.18em] text-amber-300">
                      Photo Check
                    </p>
                    <h3 className="mt-2 text-2xl font-bold">
                      {isHindi ? "Yeh skin photo nahin lag rahi" : "This does not look like a skin photo"}
                    </h3>
                    <p className="mt-3 text-sm text-amber-50">{imageWarning}</p>
                  </div>
                ) : (
                <p className="text-slate-300">
                  {isHindi
                    ? "अपनी फोटो और त्वचा लक्षण जोड़ें, फिर विश्लेषण चलाकर संभावित पैटर्न और चेतावनी संकेत देखें।"
                    : "Add your photo and skin symptoms, then run analysis to see possible patterns and warning signs."}
                </p>
                )
              ) : (
                <>
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5 mb-5">
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                      {isHindi ? "गंभीरता" : "Severity"}
                    </p>
                    <h3
                      className="mt-2 text-4xl font-black"
                      style={{ color: severityTone[analysis.severity].color }}
                    >
                      {severityLabels[analysis.severity]}
                    </h3>
                    <p className="mt-3 text-slate-200">{translateSkinText(analysis.summary, language)}</p>
                    <p className="mt-3 text-sm text-slate-400">
                      {isHindi ? "स्कोर" : "Score"}: {analysis.score}/100
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {isHindi ? "विश्लेषण स्रोत" : "Analysis source"}: {analysisSource === "openai" ? (isHindi ? "एआई विज़न + नियम" : "AI vision + rules") : (isHindi ? "नियम-आधारित बैकअप" : "Rule-based fallback")}
                    </p>
                  </div>

                  <div className="mb-5">
                    <h4 className="text-lg font-semibold text-cyan-300 mb-3">
                      {isHindi ? "संभावित पैटर्न" : "Likely Patterns"}
                    </h4>
                    <div className="space-y-3">
                      {analysis.likelyPatterns.map((item) => (
                        <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="font-semibold">{translateSkinText(item.title, language)}</p>
                          <p className="text-sm text-slate-300 mt-1">{translateSkinText(item.detail, language)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <h4 className="text-lg font-semibold text-rose-300 mb-3">
                      {isHindi ? "रेड फ्लैग्स" : "Red Flags"}
                    </h4>
                    {analysis.redFlags.length === 0 ? (
                      <p className="text-slate-300">{isHindi ? "वर्तमान इनपुट से कोई तत्काल चेतावनी संकेत नहीं मिला।" : "No urgent warning signs were triggered from the current inputs."}</p>
                    ) : (
                      <div className="space-y-3">
                        {analysis.redFlags.map((item) => (
                          <div key={item.title} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                            <p className="font-semibold">{translateSkinText(item.title, language)}</p>
                            <p className="text-sm text-slate-200 mt-1">{translateSkinText(item.detail, language)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-emerald-300 mb-3">
                      {isHindi ? "सावधानियां" : "Precautions"}
                    </h4>
                    <ul className="space-y-2 text-slate-200">
                      {analysis.precautions.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="text-cyan-300">•</span>
                          <span>{translateSkinText(item, language)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
                      <strong>{isHindi ? "अगला कदम:" : "Next step:"}</strong> {translateSkinText(analysis.followUp, language)}
                    </p>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold mb-4">{isHindi ? "हाल की स्किन रिपोर्ट" : "Recent Skin Reports"}</h2>
              {reports.length === 0 ? (
                <p className="text-slate-300">{isHindi ? "अभी तक कोई स्किन रिपोर्ट सेव नहीं हुई।" : "No skin reports saved yet."}</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={`${report.createdAt}-${report.summary}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold capitalize">{translateBodyPart(report.bodyPart, language)}</p>
                        <span className="text-sm text-slate-400">
                          {isHindi
                            ? report.severity
                                .replace("Urgent", "तत्काल")
                                .replace("High", "उच्च")
                                .replace("Moderate", "मध्यम")
                                .replace("Low", "कम")
                            : report.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{translateSkinText(report.summary, language)}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}




