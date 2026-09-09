"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { useLocalize } from "@/lib/useLocalize";
import FeatureGuide from "@/components/FeatureGuide";
import type {
  AssistantConversationMessage,
  BaselineAnalysisSummary,
  ChatAssistantOutput,
  SuggestionsOutput,
  WrappedRiskAssessment,
} from "@/lib/ai-health-assistant/types";

type ProfileState = {
  age: string;
  heightCm: string;
  weightKg: string;
  bloodPressure: string;
  sugar: string;
  heartRate: string;
  symptoms: string;
  notes: string;
};

const initialProfile: ProfileState = {
  age: "",
  heightCm: "",
  weightKg: "",
  bloodPressure: "",
  sugar: "",
  heartRate: "",
  symptoms: "",
  notes: "",
};

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

export default function AIHealthAssistantPage() {
  const { language } = useLanguage();
  const localize = useLocalize();

  const starterMessage = useMemo<AssistantConversationMessage>(
    () => ({
      role: "assistant",
      text: localize(
        "Hello, I am your AI Health Assistant. Share symptoms or health readings and I will guide you with follow-up questions.",
        "नमस्ते, मैं आपका AI Health Assistant हूँ। लक्षण या हेल्थ रीडिंग भेजें और मैं फॉलो-अप प्रश्नों के साथ मार्गदर्शन करूँगा।"
      ),
    }),
    [localize]
  );

  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([
    starterMessage,
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [starterMessage];
      }
      return prev;
    });
  }, [starterMessage]);
  const [chatInput, setChatInput] = useState("");
  const [chatState, setChatState] = useState<ChatAssistantOutput | null>(null);
  const [riskState, setRiskState] = useState<{
    risk: WrappedRiskAssessment;
    baseline: BaselineAnalysisSummary;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsOutput | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [riskBusy, setRiskBusy] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [status, setStatus] = useState("");

  const quickPrompts = [
    localize("I have fever and cough for 2 days", "मुझे बुखार और खांसी है"),
    localize("My BP is 160/100 with headache", "मेरा BP 160/100 है और सिर दर्द है"),
    localize("I have chest pain and breathlessness", "सीने में दर्द और सांस की दिक्कत है"),
  ];

  const profilePayload = {
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bloodPressure: profile.bloodPressure,
    sugar: profile.sugar,
    heartRate: profile.heartRate,
    symptoms: profile.symptoms,
    notes: profile.notes,
  };

  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.text ?? "";

  const handleSend = async (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || chatBusy) {
      return;
    }

    setStatus("");
    setChatBusy(true);

    const nextMessages = [...messages, { role: "user" as const, text: trimmed }];
    setMessages(nextMessages);
    setChatInput("");

    try {
      const result = await postJson<ChatAssistantOutput>(
        "/api/ai-health-assistant/chat",
        {
          profile: profilePayload,
          messages: nextMessages,
        }
      );

      setMessages([...nextMessages, { role: "assistant", text: result.reply }]);
      setChatState(result);
      setRiskState({
        risk: result.risk,
        baseline: result.baseline,
      });
      setStatus(
        localize(
          "AI health assistant updated successfully.",
          "AI health assistant safalta se update ho gaya."
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : localize("Unable to continue the chat.", "Chat jari nahi rakh pa raha.");

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          text: message,
        },
      ]);
      setStatus(message);
    } finally {
      setChatBusy(false);
    }
  };

  const runRiskWrap = async () => {
    setStatus("");
    setRiskBusy(true);

    try {
      const result = await postJson<{
        risk: WrappedRiskAssessment;
        baseline: BaselineAnalysisSummary;
      }>("/api/ai-health-assistant/risk", {
        profile: profilePayload,
        liveText: latestUserMessage,
      });

      setRiskState(result);
      setStatus(
        localize(
          "Risk wrapper updated from the current profile.",
          "Risk wrapper current profile se update ho gaya."
        )
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : localize("Unable to update risk.", "Risk update nahi ho pa raha.")
      );
    } finally {
      setRiskBusy(false);
    }
  };

  const runSuggestions = async () => {
    setStatus("");
    setSuggestBusy(true);

    try {
      const result = await postJson<SuggestionsOutput>(
        "/api/ai-health-assistant/suggestions",
        {
          profile: {
            ...profilePayload,
            symptoms: [profile.symptoms, latestUserMessage]
              .filter(Boolean)
              .join(". "),
          },
          goal:
            profile.notes ||
            localize(
              "Give me diet, precautions, and next steps.",
              "Mujhe diet, precautions aur next steps batayein."
            ),
        }
      );

      setSuggestions(result);
      setStatus(
        localize(
          "Personalized suggestions are ready.",
          "Personalized suggestions taiyar hain."
        )
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : localize(
              "Unable to generate suggestions.",
              "Suggestions generate nahi ho pa rahi."
            )
      );
    } finally {
      setSuggestBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-cyan-400">
              {localize("AI Health Assistant", "AI Health Assistant")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize(
                "Gemini and Vertex-powered symptom assistant",
                "Gemini aur Vertex powered symptom assistant"
              )}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "This new standalone module adds conversational symptom chat, risk wrapping, and personalized suggestions without changing the existing RoboDoctor flows.",
                "Yeh naya standalone module conversational symptom chat, risk wrapping aur personalized suggestions add karta hai bina existing RoboDoctor flows ko badle."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/report-understanding"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Report Understanding", "Report Understanding")}
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
          <div className="mb-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            {status}
          </div>
        )}

                {/* Feature Usage Guide */}
        <FeatureGuide
          badge={localize("Clinical AI Assistant & Symptom Triage", "क्लिनिकल एआई सहायक व लक्षण ट्राइएज")}
          title={localize("How to Use the Interactive Symptom Assistant", "इंटरएक्टिव लक्षण सहायक का उपयोग कैसे करें")}
          purpose={localize(
            "Engage in a structured medical consultation. Provide symptoms and baseline vitals to receive automated clinical triage, risk tier analysis, and actionable next steps.",
            "एक व्यवस्थित स्वास्थ्य परामर्श प्राप्त करें। लक्षण और बुनियादी वाइटल्स दर्ज करें ताकि स्वचालित क्लिनिकल ट्राइएज, जोखिम विश्लेषण और उचित अगला कदम जान सकें।"
          )}
          inputs={[
            localize("Patient profile: Age, height, weight, BP, blood sugar, and pulse rate", "मरीज का विवरण: उम्र, ऊंचाई, वजन, बीपी, ब्लड शुगर और हृदय गति"),
            localize("Detailed symptoms: Location, severity, duration, and what makes it better or worse", "विस्तृत लक्षण: दर्द/परेशानी का स्थान, तीव्रता, कितने दिनों से है और कब घटता/बढ़ता है"),
            localize("Clinical notes or past medical conditions you are currently managing", "अतिरिक्त चिकित्सीय विवरण या पुरानी बीमारियां जिनका इलाज चल रहा है"),
          ]}
          steps={[
            localize("Fill in your baseline profile vitals or start typing symptoms directly", "अपनी बुनियादी प्रोफाइल व वाइटल्स भरें या सीधे लक्षण लिखना शुरू करें"),
            localize("Engage with the AI as it asks targeted follow-up clarifying questions", "एआई द्वारा पूछे गए स्पष्टीकरण सवालों के जवाब दें"),
            localize("Review the comprehensive risk assessment and structured clinical recommendations", "व्यापक जोखिम मूल्यांकन और व्यवस्थित चिकित्सीय सिफारिशों की समीक्षा करें"),
          ]}
          outputs={[
            localize("Triage Risk Classification (Low, Moderate, High, or Immediate Emergency)", "ट्राइएज जोखिम वर्गीकरण (कम, मध्यम, उच्च, या तत्काल आपातकालीन)"),
            localize("Symptom breakdown with potential differential clinical possibilities", "संभावित नैदानिक कारणों के साथ विस्तृत लक्षण विश्लेषण"),
            localize("Personalized lifestyle, home-monitoring, and medical consultation plan", "व्यक्तिगत जीवनशैली, घरेलू निगरानी और डॉक्टर परामर्श योजना"),
            localize("Exportable summary to share with your healthcare provider", "अपने डॉक्टर के साथ साझा करने योग्य परामर्श सारांश"),
          ]}
          tip={localize(
            "Tip: The more details you share (like duration of symptoms and resting vitals), the more precise and helpful the triage guidance will be.",
            "सुझाव: आप जितनी अधिक जानकारी साझा करेंगे (जैसे लक्षण कितने दिनों से हैं और आराम के समय वाइटल्स), ट्राइएज मार्गदर्शन उतना ही सटीक और उपयोगी होगा।"
          )}
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <div className="mb-5 flex flex-wrap gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void handleSend(prompt)}
                  className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="space-y-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[88%] whitespace-pre-wrap rounded-3xl px-5 py-4 ${
                    message.role === "assistant"
                      ? "bg-cyan-500/10"
                      : "ml-auto bg-emerald-500/10"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void handleSend(chatInput);
              }}
              className="mt-5 flex flex-col gap-3"
            >
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                rows={4}
                placeholder={localize(
                  "Describe symptoms, ask follow-up questions, or add new readings...",
                  "Symptoms likhiye, follow-up question poochhiye, ya nayi readings add kijiye..."
                )}
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
              />
              <button
                type="submit"
                disabled={chatBusy}
                className="rounded-2xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chatBusy
                  ? localize("Thinking...", "Soch raha hai...")
                  : localize("Send to AI Assistant", "AI Assistant ko bhejein")}
              </button>
            </form>

            {chatState && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">
                    {localize("Next Step", "Next Step")}
                  </p>
                  <p className="mt-3">{chatState.nextStep}</p>
                </div>
                <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-amber-200">
                    {localize("AI Source", "AI Source")}
                  </p>
                  <p className="mt-3">
                    {sourceLabel(
                      chatState.provider,
                      chatState.model,
                      chatState.fallbackUsed
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
              <h2 className="text-2xl font-bold">
                {localize("Current health profile", "Current health profile")}
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  ["age", localize("Age", "Age")],
                  ["heightCm", localize("Height (cm)", "Height (cm)")],
                  ["weightKg", localize("Weight (kg)", "Weight (kg)")],
                  ["bloodPressure", localize("Blood pressure", "Blood pressure")],
                  ["sugar", localize("Sugar", "Sugar")],
                  ["heartRate", localize("Heart rate", "Heart rate")],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-2 block text-sm text-[var(--muted)]">
                      {label}
                    </span>
                    <input
                      value={profile[key as keyof ProfileState]}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                    />
                  </label>
                ))}
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm text-[var(--muted)]">
                    {localize("Symptoms summary", "Symptoms summary")}
                  </span>
                  <textarea
                    value={profile.symptoms}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        symptoms: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                  />
                </label>
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm text-[var(--muted)]">
                    {localize("Notes or goals", "Notes or goals")}
                  </span>
                  <textarea
                    value={profile.notes}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void runRiskWrap()}
                  disabled={riskBusy}
                  className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {riskBusy
                    ? localize("Updating risk...", "Risk update ho raha hai...")
                    : localize("Run risk wrapper", "Run risk wrapper")}
                </button>
                <button
                  type="button"
                  onClick={() => void runSuggestions()}
                  disabled={suggestBusy}
                  className="rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestBusy
                    ? localize("Generating...", "Generate ho raha hai...")
                    : localize(
                        "Generate personalized suggestions",
                        "Personalized suggestions generate karein"
                      )}
                </button>
              </div>

              {riskState && (
                <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-rose-200">
                    {localize("Wrapped risk level", "Wrapped risk level")}
                  </p>
                  <h3 className="mt-3 text-3xl font-black">{riskState.risk.level}</h3>
                  <p className="mt-2">{riskState.risk.reason}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {localize("Baseline", "Baseline")}: {riskState.baseline.riskLevel} •{" "}
                    {riskState.baseline.riskScore}/100
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {riskState.risk.urgencyLabel}
                  </p>
                </div>
              )}

              {chatState?.followUpQuestions.length ? (
                <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
                    {localize("Suggested follow-up questions", "Suggested follow-up questions")}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {chatState.followUpQuestions.map((question) => (
                      <li key={question} className="flex gap-3">
                        <span className="text-cyan-300">•</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {chatState?.redFlags.length ? (
                <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-amber-200">
                    {localize("Red flags", "Red flags")}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {chatState.redFlags.map((flag) => (
                      <li key={flag} className="flex gap-3">
                        <span className="text-amber-200">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <section className="mt-6 rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
                {localize("Personalized suggestions", "Personalized suggestions")}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {localize(
                  "Diet, precautions, and next steps",
                  "Diet, precautions, aur next steps"
                )}
              </h2>
            </div>
            {suggestions && (
              <span className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[var(--muted)]">
                {sourceLabel(
                  suggestions.provider,
                  suggestions.model,
                  suggestions.fallbackUsed
                )}
              </span>
            )}
          </div>

          {!suggestions ? (
            <p className="text-[var(--muted)]">
              {localize(
                "Use the button above to generate a new standalone suggestion plan from Gemini or Vertex AI.",
                "Upar wala button use karke Gemini ya Vertex AI se naya standalone suggestion plan generate kijiye."
              )}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                <h3 className="text-lg font-bold">
                  {localize("Diet", "Diet")}
                </h3>
                <ul className="mt-3 space-y-2">
                  {suggestions.diet.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                <h3 className="text-lg font-bold">
                  {localize("Precautions", "Precautions")}
                </h3>
                <ul className="mt-3 space-y-2">
                  {suggestions.precautions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                <h3 className="text-lg font-bold">
                  {localize("Next steps", "Next steps")}
                </h3>
                <ul className="mt-3 space-y-2">
                  {suggestions.nextSteps.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-5">
                <h3 className="text-lg font-bold">
                  {localize("What the AI still wants to know", "AI aur kya poochna chahta hai")}
                </h3>
                <ul className="mt-3 space-y-2">
                  {suggestions.followUpQuestions.map((item) => (
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
  );
}
