"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { useLocalize } from "@/lib/useLocalize";
import type { ReportAnalysisOutput } from "@/lib/ai-health-assistant/types";

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & {
    error?: string;
    details?: string;
  };

  if (!response.ok) {
    throw new Error(payload.details || payload.error || "Request failed.");
  }

  return payload;
}

function sourceLabel(provider: string, model: string, fallbackUsed: boolean) {
  if (fallbackUsed || provider === "fallback") {
    return "Rule-based fallback";
  }

  return `${provider.toUpperCase()} • ${model}`;
}

export default function ReportUnderstandingPage() {
  const { language } = useLanguage();
  const localize = useLocalize();

  const [fileName, setFileName] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [patientContext, setPatientContext] = useState("");
  const [result, setResult] = useState<ReportAnalysisOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const isImageFile = fileDataUrl.startsWith("data:image/");

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileName(nextFile.name);
      setFileDataUrl(String(reader.result));
      setResult(null);
      setStatus(
        localize("File uploaded and ready to analyze.", "File upload ho gaya aur analyze ke liye ready hai.")
      );
    };
    reader.readAsDataURL(nextFile);
  };

  const runAnalysis = async (event: FormEvent) => {
    event.preventDefault();

    if (!fileDataUrl || busy) {
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const analysis = await postJson<ReportAnalysisOutput>(
        "/api/ai-health-assistant/report-analysis",
        {
          fileDataUrl,
          question,
          patientContext,
        }
      );

      setResult(analysis);
      setStatus(
        localize(
          "Report understanding completed.",
          "Report understanding complete ho gaya."
        )
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : localize(
              "Unable to analyze this file.",
              "Is file ko analyze nahi kiya ja saka."
            )
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-amber-400">
              {localize("Report Understanding", "Report Understanding")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize(
                "Standalone Gemini and Vertex report explainer",
                "Standalone Gemini aur Vertex report explainer"
              )}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "Upload an X-ray image, scanned report, lab slip, or PDF and get a separate plain-language explanation flow without touching the existing diagnosis modules.",
                "X-ray image, scanned report, lab slip, ya PDF upload kijiye aur existing diagnosis modules ko chhede bina alag plain-language explanation flow paaiye."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/ai-health-assistant"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("AI Health Assistant", "AI Health Assistant")}
            </Link>
            <Link
              href="/smart-reminders"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Smart Reminders", "Smart Reminders")}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Back Home", "Back Home")}
            </Link>
          </div>
        </div>

        {status && (
          <div className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {status}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <form onSubmit={runAnalysis} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize(
                    "Upload X-ray, report image, or PDF",
                    "X-ray, report image, ya PDF upload karein"
                  )}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={onFileChange}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize("Question for the AI", "AI se sawaal")}
                </span>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  placeholder={localize(
                    "Example: Explain this X-ray in simple language and tell me what needs urgent attention.",
                    "Example: Is X-ray ko simple language me samjhaiye aur batayein kya urgent dhyan chahiye."
                  )}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize("Patient context", "Patient context")}
                </span>
                <textarea
                  value={patientContext}
                  onChange={(event) => setPatientContext(event.target.value)}
                  rows={3}
                  placeholder={localize(
                    "Add age, symptoms, or clinical context if useful.",
                    "Age, symptoms, ya clinical context add kijiye agar useful ho."
                  )}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                />
              </label>

              {fileName && (
                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  {localize("Selected file", "Selected file")}: {fileName}
                </div>
              )}

              {isImageFile && (
                <div className="overflow-hidden rounded-3xl border border-[color:var(--border)]">
                  <Image
                    src={fileDataUrl}
                    alt="Uploaded report preview"
                    width={1200}
                    height={900}
                    unoptimized
                    className="h-72 w-full object-cover"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={!fileDataUrl || busy}
                className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? localize("Analyzing...", "Analyze ho raha hai...")
                  : localize("Analyze with AI", "AI se analyze karein")}
              </button>
            </form>
          </section>

          <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            {!result ? (
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 text-[var(--muted)]">
                {localize(
                  "Upload a report file to get a plain-language explanation, red flags, and suggested next steps.",
                  "Plain-language explanation, red flags, aur suggested next steps ke liye report file upload kijiye."
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-rose-200">
                    {localize("Risk level", "Risk level")}
                  </p>
                  <h2 className="mt-3 text-3xl font-black">{result.risk.level}</h2>
                  <p className="mt-2">{result.plainLanguageSummary}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {sourceLabel(result.provider, result.model, result.fallbackUsed)}
                  </p>
                </div>

                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                  <h3 className="text-xl font-bold">{result.headline}</h3>
                  <p className="mt-3">{result.plainLanguageSummary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                    <h3 className="text-lg font-bold">
                      {localize("Key findings", "Key findings")}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {result.keyFindings.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                    <h3 className="text-lg font-bold">
                      {localize("Red flags", "Red flags")}
                    </h3>
                    {result.redFlags.length === 0 ? (
                      <p className="mt-3 text-sm">
                        {localize(
                          "No urgent red flags were highlighted from this file alone.",
                          "Sirf is file se koi urgent red flag highlight nahi hua."
                        )}
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {result.redFlags.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-5">
                  <h3 className="text-lg font-bold">
                    {localize("Recommended next steps", "Recommended next steps")}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {result.recommendedNextSteps.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
