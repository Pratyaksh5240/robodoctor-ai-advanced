"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, Suspense, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
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
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [rawNotes, setRawNotes] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [source, setSource] = useState<string>("");

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
            <h2 className="text-2xl font-bold mb-4">
              {localize("2. Review & Confirm Medicines", "2. दवाएं समीक्षा व पुष्टि करें")}
            </h2>

            {items.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-center text-[var(--muted)]">
                <span className="text-4xl mb-2">💊</span>
                <p>
                  {localize(
                    "Upload a photo and click 'Extract Medicines' to view detected items.",
                    "फोटो अपलोड करके 'Extract Medicines' पर क्लिक करें।"
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rawNotes && (
                  <p className="text-xs text-[var(--muted)] bg-[color:var(--surface)] p-3 rounded-xl">
                    ℹ️ {rawNotes} {source === "openai_vision" ? "(AI Vision OCR)" : ""}
                  </p>
                )}

                <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition ${
                        item.selected
                          ? "border-cyan-500/40 bg-cyan-500/10"
                          : "border-[color:var(--border)] bg-[color:var(--surface)] opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => updateItem(item.id, "selected", e.target.checked)}
                            className="h-5 w-5 rounded border-cyan-400 accent-cyan-500 cursor-pointer"
                          />
                          <span className="font-bold text-base">
                            {localize("Confirmed", "पुष्ट")}
                          </span>
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

                      <div className="grid gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          placeholder={localize("Medicine Name", "दवा का नाम")}
                          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.dosageGuess || ""}
                            onChange={(e) => updateItem(item.id, "dosageGuess", e.target.value)}
                            placeholder={localize("Dosage (e.g. 500mg)", "खुराक (उदा. 500mg)")}
                            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs"
                          />
                          <input
                            type="text"
                            value={item.frequencyGuess || ""}
                            onChange={(e) => updateItem(item.id, "frequencyGuess", e.target.value)}
                            placeholder={localize("Frequency (e.g. 1-0-1)", "आवृत्ति (उदा. 1-0-1)")}
                            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs"
                          />
                        </div>
                      </div>

                      {item.selected && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSendToReminder(item)}
                            className="text-xs text-lime-400 hover:underline flex items-center gap-1 font-semibold"
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
