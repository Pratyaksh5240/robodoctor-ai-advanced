"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, Suspense, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import FeatureGuide from "@/components/FeatureGuide";
import { useLocalize } from "@/lib/useLocalize";
import { ScannedMedicineItem } from "@/app/api/prescription-scan/route";

type SelectableItem = ScannedMedicineItem & {
  selected: boolean;
  id: string;
};

function PrescriptionScanContent() {
  const router = useRouter();
  const localize = useLocalize();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [rawNotes, setRawNotes] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [source, setSource] = useState<string>("");

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setHasScanned(false);
    setRawNotes("");
    const nextPreviewUrl = URL.createObjectURL(file);
    const reader = new FileReader();

    reader.onload = () => {
      const res = typeof reader.result === "string" ? reader.result : null;
      if (res) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(nextPreviewUrl);
        setImageDataUrl(res);
        setItems([]);
        setStatusMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imageDataUrl) return;

    setIsScanning(true);
    setHasScanned(true);
    setStatusMsg("");

    try {
      const res = await fetch("/api/prescription-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to scan prescription.");
      }

      const scannedItems: SelectableItem[] = (data.medicines || []).map(
        (m: ScannedMedicineItem, idx: number) => ({
          ...m,
          id: `med-${idx}-${Date.now()}`,
          selected: m.confidence !== "low",
        })
      );

      setItems(scannedItems);
      setRawNotes(data.rawNotes || "");
      setSource(data.source || "");
    } catch (err: any) {
      setStatusMsg(
        err.message ||
          localize(
            "Unable to scan prescription right now. Please try again.",
            "प्रिस्क्रिप्शन स्कैन नहीं हो पाया। कृपया फिर कोशिश करें।"
          )
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddManual = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const query = manualInput.trim();
    if (!query) return;

    const queryLower = query.toLowerCase();
    let name = query;
    let dosage = "Standard adult dosage";
    let freq = "As directed by physician / packaging";
    let whenToEat = "Take with water as advised on packaging or by your physician.";
    let howMuchToEat = "Follow the labeled adult dosage instructions.";
    let harmOveruse = "Do not exceed maximum daily limits. Discontinue and consult your physician if adverse reactions occur.";
    let purpose = "Medication added for safety screening and reminders.";

    if (queryLower.includes("vicks") || queryLower.includes("vaporub")) {
      name = "Vicks VapoRub (Camphor, Menthol & Eucalyptus)";
      dosage = "10ml / 25ml Topical Rub";
      freq = "Apply 2 to 3 times daily as needed";
      whenToEat = "Rub gently on chest, throat, and back before bedtime, or add to hot water for steam inhalation. NEVER swallow.";
      howMuchToEat = "Apply a generous layer. Do not apply inside nostrils or on broken skin.";
      harmOveruse = "TOXIC IF SWALLOWED — Camphor can cause severe poisoning and seizures if ingested orally.";
      purpose = "Topical decongestant & analgesic for cough, cold, and nasal blockage.";
    } else if (queryLower.includes("volini") || queryLower.includes("moov") || queryLower.includes("iodex") || queryLower.includes("omnigel")) {
      name = "Pain Relief Gel / Balm (Diclofenac / Methyl Salicylate)";
      dosage = "Topical Gel / Spray";
      freq = "Apply 2 to 3 times daily";
      whenToEat = "Apply thin layer to painful joint or muscle. Wash hands thoroughly with soap after application.";
      howMuchToEat = "Apply 2g to 4g to affected area 2-3 times daily.";
      harmOveruse = "For external use only. Avoid contact with eyes or open cuts.";
      purpose = "Topical pain relief for sprains, muscle stiffness, and backache.";
    } else if (queryLower.includes("dolo") || queryLower.includes("paracetamol") || queryLower.includes("crocin") || queryLower.includes("calpol")) {
      name = "Paracetamol (Dolo 650)";
      dosage = "650mg";
      freq = "Every 6 to 8 hours as needed (Max 3/day)";
      whenToEat = "Take after food or milk with a full glass of water. Avoid taking on an empty stomach.";
      howMuchToEat = "Adults: 1 tablet per dose (wait at least 6 hours). Do not exceed 3 tablets in 24 hours.";
      harmOveruse = "Overdose causes severe liver damage and hepatic failure. Avoid alcohol completely.";
      purpose = "Antipyretic & painkiller for fever and headaches.";
    }

    const newItem: SelectableItem = {
      id: `manual-${Date.now()}`,
      name,
      dosageGuess: dosage,
      frequencyGuess: freq,
      whenToEat,
      howMuchToEat,
      harmOveruse,
      purpose,
      confidence: "high",
      selected: true,
    };

    setItems((prev) => [newItem, ...prev]);
    setManualInput("");
  };

  const updateItem = (id: string, key: keyof SelectableItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const selectedItems = items.filter((i) => i.selected);

  const handleSendToChecker = () => {
    if (selectedItems.length === 0) return;
    const names = selectedItems.map((i) => encodeURIComponent(i.name.trim())).join(",");
    router.push(`/medicine-checker?meds=${names}`);
  };

  const handleSendToReminder = (item: SelectableItem) => {
    const params = new URLSearchParams({
      medName: item.name,
      dosage: item.dosageGuess || "",
      frequency: item.frequencyGuess || "",
    });
    router.push(`/medicine-reminder?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-cyan-400">
              {localize("AI Vision Scanner", "एआई विज़न स्कैनर")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize("Prescription & Medicine Scanner", "प्रिस्क्रिप्शन व दवा स्कैनर")}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "Upload a photo of a doctor's rx prescription or medicine box to extract medicine names, dosages, and instructions.",
                "दवा के नाम, खुराक और निर्देश निकालने के लिए पर्चे या दवा की फोटो अपलोड करें।"
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProfileSwitcher />
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90 transition"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        {/* Feature Usage Guide */}
        <FeatureGuide
          badge={localize("AI Vision OCR Scanner", "एआई विज़न ओसीआर स्कैनर")}
          title={localize("How to Scan Prescriptions & Medication Strips", "पर्चे और दवा की स्ट्रिप को कैसे स्कैन करें")}
          purpose={localize(
            "Quickly digitize handwritten or printed doctor prescriptions and medicine boxes to extract medicine names, strengths, timings, and schedules.",
            "दवाओं के नाम, खुराक की ताकत, समय और शेड्यूल निकालने के लिए हाथ से लिखे या प्रिंट किए गए डॉक्टर के पर्चे और दवा के डिब्बों को तुरंत डिजिटाइज़ करें।"
          )}
          inputs={[
            localize("A clear, flat photo of your doctor's Rx prescription", "अपने डॉक्टर के पर्चे (Rx) की एक साफ, सीधी फोटो"),
            localize("Or a photo of the medication strip / box label showing the salt or brand name", "या दवा की स्ट्रिप / बॉक्स लेबल की फोटो जिसमें दवा का नाम दिख रहा हो"),
          ]}
          steps={[
            localize("Upload an image file or capture directly using your camera", "इमेज फाइल अपलोड करें या कैमरे से सीधे फोटो खींचें"),
            localize("Click 'Run AI Prescription Scan' to extract text", "टेक्स्ट निकालने के लिए 'प्रिस्क्रिप्शन स्कैन चलाएं' पर क्लिक करें"),
            localize("Review detected medicines and click 'Add to Reminders' if desired", "पहचानी गई दवाओं की समीक्षा करें और चाहें तो 'रिमाइंडर में जोड़ें' दबाएं"),
          ]}
          outputs={[
            localize("Clean list of extracted medicine names with strengths (e.g. 500mg)", "ताकत (जैसे 500mg) के साथ निकाली गई दवाओं की स्पष्ट सूची"),
            localize("Dosage instructions (e.g. 1-0-1, Once daily, Twice daily)", "खुराक निर्देश (जैसे 1-0-1, दिन में एक बार, दिन में दो बार)"),
            localize("Timing advice (Before meals, After food, Bedtime)", "समय की सलाह (खाने से पहले, भोजन के बाद, सोते समय)"),
            localize("One-click button to send medications to your reminder schedule", "दवाओं को सीधे अपने रिमाइंडर शेड्यूल में भेजने के लिए सिंगल-क्लिक बटन"),
          ]}
          tip={localize(
            "Tip: Ensure the paper is well-lit and laid flat. Avoid flash reflection on glossy medicine strips for the highest optical character recognition accuracy.",
            "सुझाव: सुनिश्चित करें कि कागज पर अच्छी रोशनी हो और वह मुड़ा न हो। उच्चतम सटीकता के लिए चमकदार दवा की पन्नी पर फ्लैश की चमक से बचें।"
          )}
        />

        {/* Warning Disclaimer Box */}
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-300">
                {localize("Medical OCR Disclaimer", "मेडिकल ओसीआर अस्वीकरण")}
              </p>
              <p className="mt-1">
                {localize(
                  "AI extraction can make mistakes on handwritten prescriptions or ambiguous packaging. Always verify every extracted medicine name and dosage against your original doctor prescription before taking action.",
                  "हाथ से लिखे पर्चे पर एआई ओसीआर से चूक हो सकती है। कोई भी कदम उठाने से पहले मूल डॉक्टर पर्चे से हर नाम व खुराक का मिलान करें।"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upload & Preview Card */}
          <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6">
            <h2 className="text-2xl font-bold mb-4">
              {localize("1. Upload Prescription Photo", "1. पर्चे की फोटो अपलोड करें")}
            </h2>

            <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-center">
              {previewUrl ? (
                <div className="relative w-full max-h-72 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-html-element-suppression */}
                  <img
                    src={previewUrl}
                    alt="Prescription preview"
                    className="w-full object-contain max-h-72"
                  />
                </div>
              ) : (
                <div className="py-8">
                  <span className="text-5xl">📄</span>
                  <p className="mt-3 font-semibold">
                    {localize("Choose Rx Photo or Medicine Box", "Rx पर्चा या दवा बॉक्स चुनें")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {localize("Supports JPG, PNG, WEBP photos", "JPG, PNG, WEBP फोटो का उपयोग करें")}
                  </p>
                </div>
              )}

              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 font-bold text-black hover:bg-cyan-400 transition">
                <span>📸</span>
                <span>
                  {previewUrl
                    ? localize("Change Photo", "फोटो बदलें")
                    : localize("Select Photo", "फोटो चुनें")}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {imageDataUrl && (
              <button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-lime-500 py-4 font-black text-black hover:opacity-90 disabled:opacity-50 transition shadow-lg text-lg"
              >
                {isScanning
                  ? localize("Scanning with AI Vision...", "एआई विज़न से स्कैन हो रहा है...")
                  : localize("Extract Medicines", "दवाएं निकालें (Scan Rx)")}
              </button>
            )}

            {statusMsg && (
              <p className="mt-4 text-center text-sm font-semibold text-rose-400">{statusMsg}</p>
            )}
          </section>

          {/* Results & Confirmation Card */}
          <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {localize("2. Review & Confirm Medicines", "2. दवाएं समीक्षा व पुष्टि करें")}
              </h2>
              {items.length > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/30">
                  {localize("{count} item(s) found", "{count} दवाएं मिलीं", { count: items.length })}
                </span>
              )}
            </div>

            {/* Always display scan feedback if present */}
            {rawNotes && (
              <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs text-cyan-200">
                <span className="font-bold">ℹ️ {localize("Scan Result", "स्कैन परिणाम")}:</span> {rawNotes}{" "}
                {source === "local_ocr"
                  ? "(AI Vision OCR)"
                  : source === "gemini_vision"
                  ? "(Gemini Vision)"
                  : ""}
              </div>
            )}

            {/* Quick Manual Add Input Bar */}
            <form onSubmit={handleAddManual} className="mb-5 flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={localize(
                  "Type a medicine/balm name (e.g. Vicks, Dolo 650, Volini)...",
                  "दवा या बाम का नाम लिखें (उदा. Vicks, Dolo 650, Volini)..."
                )}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-40 transition whitespace-nowrap"
              >
                + {localize("Add Medicine", "दवा जोड़ें")}
              </button>
            </form>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center text-[var(--muted)]">
                <span className="text-5xl mb-3">{hasScanned ? "🔍" : "💊"}</span>
                <p className="font-semibold text-slate-200 text-sm">
                  {hasScanned
                    ? localize("No matching medicines could be read from this photo", "इस फोटो से कोई पहचानी जाने वाली दवा नहीं मिल सकी")
                    : localize("Upload a photo and click 'Extract Medicines' to view detected items.", "फोटो अपलोड करके 'Extract Medicines' पर क्लिक करें।")}
                </p>
                {hasScanned ? (
                  <p className="mt-2 text-xs text-slate-400 max-w-md">
                    {localize(
                      "Tips: Ensure clear lighting, avoid glare on glossy blister packs or circular tubs, or use the '+ Add Medicine' bar above to type the name directly.",
                      "सुझाव: सुनिश्चित करें कि रोशनी अच्छी हो, बोतल या पन्नी पर चमक न हो, या ऊपर दिए गए '+ दवा जोड़ें' विकल्प से सीधे नाम लिख लें।"
                    )}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    {localize("You can also type any medicine above to add it immediately.", "आप तुरंत जोड़ने के लिए ऊपर किसी भी दवा का नाम भी टाइप कर सकते हैं।")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">

                <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-3xl border p-5 transition shadow-lg ${
                        item.selected
                          ? "border-cyan-500/40 bg-slate-900/90"
                          : "border-[color:var(--border)] bg-[color:var(--surface)] opacity-70"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => updateItem(item.id, "selected", e.target.checked)}
                            className="h-5 w-5 rounded border-cyan-400 accent-cyan-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-extrabold text-lg text-white">
                              {item.name || localize("Identified Medicine", "पहचानी गई दवा")}
                            </span>
                            {item.purpose && (
                              <p className="text-xs text-cyan-400 font-medium">{item.purpose}</p>
                            )}
                          </div>
                        </label>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.confidence === "high"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : item.confidence === "medium"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {item.confidence.toUpperCase()} {localize("Confidence", "विश्वास")}
                        </span>
                      </div>

                      {/* Name & Dosage Inputs */}
                      <div className="grid gap-2 mb-4">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          placeholder={localize("Medicine Name", "दवा का नाम")}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white focus:border-cyan-400 focus:outline-none"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.dosageGuess || ""}
                            onChange={(e) => updateItem(item.id, "dosageGuess", e.target.value)}
                            placeholder={localize("Dosage (e.g. 500mg)", "खुराक (उदा. 500mg)")}
                            className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={item.frequencyGuess || ""}
                            onChange={(e) => updateItem(item.id, "frequencyGuess", e.target.value)}
                            placeholder={localize("Frequency (e.g. 1-0-1)", "आवृत्ति (उदा. 1-0-1)")}
                            className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 1. WHEN TO EAT SECTION */}
                      {item.whenToEat && (
                        <div className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">🕒</span>
                            <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                              {localize("When to Take", "कब खाएं (सेवन का समय)")}
                            </span>
                          </div>
                          <p className="leading-relaxed pl-6 text-slate-200">{item.whenToEat}</p>
                        </div>
                      )}

                      {/* 2. HOW MUCH TO EAT SECTION */}
                      {item.howMuchToEat && (
                        <div className="mb-3 rounded-2xl border border-blue-500/20 bg-blue-950/30 p-3.5 text-xs text-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">📏</span>
                            <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">
                              {localize("How Much to Take", "कितनी मात्रा लें (खुराक सीमा)")}
                            </span>
                          </div>
                          <p className="leading-relaxed pl-6 text-slate-200">{item.howMuchToEat}</p>
                        </div>
                      )}

                      {/* 3. HARM OF OVERUSE & DANGERS */}
                      {item.harmOveruse && (
                        <div className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">⚠️</span>
                            <span className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">
                              {localize("Harm if Overused & Dangers", "जरूरत से ज्यादा लेने पर नुकसान व खतरे")}
                            </span>
                          </div>
                          <p className="leading-relaxed pl-6 text-slate-200">{item.harmOveruse}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {item.selected && (
                        <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-800">
                          <span className="text-[11px] text-slate-400">
                            ✓ {localize("Ready for reminder & interaction check", "रिमाइंडर और सुरक्षा जांच के लिए तैयार")}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSendToReminder(item)}
                            className="rounded-xl border border-lime-400/30 bg-lime-500/10 px-3 py-1.5 text-xs text-lime-400 hover:bg-lime-500/20 transition flex items-center gap-1.5 font-bold"
                          >
                            <span>⏰</span>
                            <span>{localize("Create Reminder", "रिमाइंडर बनाएं")}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bulk Actions */}
                <div className="pt-2 border-t border-[color:var(--border)]">
                  <button
                    type="button"
                    onClick={handleSendToInteractionChecker}
                    disabled={selectedItems.length === 0}
                    className="w-full rounded-2xl bg-cyan-500 py-3 font-bold text-black hover:bg-cyan-400 disabled:opacity-50 transition"
                  >
                    🔍 {localize("Check Interactions for {count} Selected", "चयनित {count} दवाओं के इंटरेक्शन जांचें", { count: selectedItems.length })}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );

  function handleSendToInteractionChecker() {
    if (selectedItems.length === 0) return;
    const names = selectedItems.map((i) => encodeURIComponent(i.name.trim())).join(",");
    router.push(`/medicine-checker?meds=${names}`);
  }
}

export default function PrescriptionScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] p-10 text-[var(--foreground)]">
          Loading Prescription Scanner...
        </div>
      }
    >
      <PrescriptionScanContent />
    </Suspense>
  );
}
