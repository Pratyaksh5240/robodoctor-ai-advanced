"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const quickReplies = {
  en: [
    "I have fever and cough",
    "My BP is high",
    "I have chest pain",
    "I don't know my readings",
  ],
  hi: [
    "मुझे बुखार और खांसी है",
    "मेरा BP हाई है",
    "मेरे सीने में दर्द है",
    "मुझे अपनी रीडिंग नहीं पता",
  ],
};

function getBotReply(input: string, isHindi: boolean) {
  const text = input.toLowerCase();

  if (text.includes("chest pain") || text.includes("सीने")) {
    return isHindi
      ? "सीने में दर्द के साथ सांस फूलना, पसीना, कमजोरी या चक्कर हो तो तुरंत इमरजेंसी सहायता लें। हल्का दर्द भी बार-बार हो तो डॉक्टर को दिखाएं।"
      : "If chest pain comes with breathlessness, sweating, weakness, or dizziness, seek emergency help now. Even mild repeated chest pain should be reviewed by a doctor.";
  }

  if (text.includes("fever") || text.includes("बुखार")) {
    return isHindi
      ? "बुखार के साथ आराम करें, पानी पिएं, और तापमान देखें। अगर बहुत तेज बुखार, सांस की तकलीफ, लगातार उल्टी, या 3 दिन से ज्यादा समस्या रहे तो डॉक्टर से मिलें।"
      : "With fever, rest, hydrate, and monitor temperature. If there is very high fever, breathing trouble, repeated vomiting, or symptoms beyond 3 days, see a doctor.";
  }

  if (text.includes("bp") || text.includes("blood pressure") || text.includes("ब्लड प्रेशर")) {
    return isHindi
      ? "BP के लिए सही रीडिंग लें: 5 मिनट आराम करके डिजिटल मशीन से जांच करें। 140/90 से ऊपर की रीडिंग बार-बार आए तो डॉक्टर को दिखाएं। 180/120 या उससे ऊपर हो तो यह इमरजेंसी हो सकती है।"
      : "For BP, take a proper reading after resting 5 minutes with a digital machine. Repeated readings above 140/90 should be reviewed by a doctor. Around 180/120 or higher can be an emergency.";
  }

  if (text.includes("sugar") || text.includes("शुगर")) {
    return isHindi
      ? "ब्लड शुगर के लिए ग्लूकोमीटर से जांच करें। अगर फास्टिंग शुगर 126 या उससे ऊपर बार-बार आए तो डॉक्टर से डायबिटीज जांच कराएं।"
      : "Check blood sugar with a glucometer. If fasting sugar is 126 or higher on repeated readings, please get a diabetes evaluation.";
  }

  if (text.includes("don't know") || text.includes("नहीं पता")) {
    return isHindi
      ? "अगर आपको BP, शुगर या हार्ट रेट नहीं पता तो पहले उम्र, वजन, लंबाई और लक्षण दर्ज करें। आप हेल्थ चेक पेज पर 'मुझे ये रीडिंग नहीं पता' विकल्प भी उपयोग कर सकते हैं।"
      : "If you do not know your BP, sugar, or heart rate yet, start with age, weight, height, and symptoms. You can also use the 'I don't know these readings' option on the health check page.";
  }

  return isHindi
    ? "मैं सामान्य स्वास्थ्य मार्गदर्शन दे सकता हूं, लेकिन यह निदान नहीं है। अपने लक्षण, BP, शुगर, हार्ट रेट, या त्वचा समस्या के बारे में पूछें।"
    : "I can give general health guidance, but this is not a diagnosis. Ask about symptoms, BP, sugar, heart rate, or skin concerns.";
}

const improvedQuickReplies = {
  ...quickReplies,
  en: [
    "I have fever and cough for 2 days",
    "My BP is 160/100 with headache",
    "I have chest pain and breathlessness",
    "I don't know my readings yet",
  ],
  hi: [
    "मुझे 2 दिन से बुखार और खांसी है",
    "मेरा BP 160/100 है और सिरदर्द है",
    "मेरे सीने में दर्द और सांस फूल रही है",
    "मुझे अपनी रीडिंग अभी नहीं पता",
  ],
};

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

function getEnhancedBotReply(input: string, isHindi: boolean) {
  const text = input.toLowerCase();
  const baseReply = getBotReply(input, isHindi);
  const bpMatch = text.match(/(\d{2,3})\s*[\/-]\s*(\d{2,3})/);
  const sugarMatch =
    text.match(/(?:sugar|glucose|fasting|random|शुगर|ग्लूकोज)[^0-9]{0,12}(\d{2,3})/) ??
    text.match(/(\d{2,3})\s*(?:mg\/dl|mg dl|bsl)/);
  const pulseMatch =
    text.match(/(?:pulse|heart rate|hr|bpm|हार्ट रेट|नाड़ी)[^0-9]{0,12}(\d{2,3})/) ??
    text.match(/(\d{2,3})\s*bpm/);

  const systolic = bpMatch ? Number(bpMatch[1]) : null;
  const diastolic = bpMatch ? Number(bpMatch[2]) : null;
  const sugar = sugarMatch ? Number(sugarMatch[1]) : null;
  const pulse = pulseMatch ? Number(pulseMatch[1]) : null;

  const hasChestPain = includesAny(text, ["chest pain", "chest tight", "सीने", "छाती में दर्द"]);
  const hasBreathTrouble = includesAny(text, [
    "breathless",
    "breathing trouble",
    "shortness of breath",
    "sob",
    "सांस फूल",
    "सांस लेने में तकलीफ",
  ]);
  const hasDizziness = includesAny(text, ["dizzy", "dizziness", "faint", "चक्कर", "बेहोश"]);
  const hasSweating = includesAny(text, ["sweating", "sweat", "पसीना"]);
  const hasFever = includesAny(text, ["fever", "temperature", "temp", "बुखार"]);
  const hasCough = includesAny(text, ["cough", "खांसी", "खासी"]);
  const hasVomiting = includesAny(text, ["vomit", "vomiting", "उल्टी"]);
  const hasDiarrhea = includesAny(text, ["diarrhea", "loose motion", "दस्त"]);
  const hasHeadache = includesAny(text, ["headache", "सिरदर्द"]);
  const hasSkinIssue = includesAny(text, ["rash", "itch", "itchy", "skin", "दाने", "खुजली", "त्वचा"]);
  const doesNotKnowReadings = includesAny(text, ["don't know", "do not know", "unknown", "नहीं पता", "रीडिंग नहीं पता"]);
  const mentionsBp = includesAny(text, ["bp", "blood pressure", "ब्लड प्रेशर"]);
  const mentionsSugar = includesAny(text, ["sugar", "glucose", "शुगर", "ग्लूकोज"]);
  const mentionsPulse = includesAny(text, ["pulse", "heart rate", "bpm", "हार्ट रेट", "नाड़ी"]);

  const urgency =
    hasChestPain && (hasBreathTrouble || hasDizziness || hasSweating)
      ? "emergency"
      : systolic !== null && diastolic !== null && (systolic >= 180 || diastolic >= 120)
        ? "emergency"
        : sugar !== null && sugar < 54
          ? "emergency"
          : hasFever && hasBreathTrouble
            ? "urgent"
            : hasChestPain ||
                (systolic !== null && diastolic !== null && (systolic >= 140 || diastolic >= 90)) ||
                (sugar !== null && (sugar >= 250 || sugar < 70)) ||
                (pulse !== null && (pulse > 130 || pulse < 50))
              ? "urgent"
              : hasSkinIssue || hasFever || hasCough || hasVomiting || hasDiarrhea || hasHeadache
                ? "moderate"
                : "general";

  const concern: string[] = [];
  const actions: string[] = [];
  const redFlags: string[] = [];
  const followUp: string[] = [];

  if (urgency === "emergency") {
    if (hasChestPain) {
      concern.push(
        isHindi
          ? "सीने के दर्द के साथ सांस फूलना, पसीना या चक्कर इमरजेंसी संकेत हो सकते हैं।"
          : "Chest pain with breathlessness, sweating, or dizziness can be an emergency sign."
      );
      actions.push(
        isHindi
          ? "तुरंत इमरजेंसी सहायता लें और खुद वाहन चलाकर जाने से बचें।"
          : "Seek emergency help now and avoid driving yourself if possible."
      );
    }

    if (systolic !== null && diastolic !== null && (systolic >= 180 || diastolic >= 120)) {
      concern.push(
        isHindi
          ? `BP ${systolic}/${diastolic} बहुत अधिक है और यह इमरजेंसी हो सकती है।`
          : `BP ${systolic}/${diastolic} is dangerously high and may be an emergency.`
      );
    }

    if (sugar !== null && sugar < 54) {
      concern.push(isHindi ? `शुगर ${sugar} बहुत कम लग रही है।` : `Sugar ${sugar} looks severely low.`);
      actions.push(
        isHindi
          ? "अगर व्यक्ति होश में है तो तुरंत 15 ग्राम तेज शुगर दें और दोबारा जांच करें।"
          : "If the person is alert, give 15g of fast sugar now and recheck soon."
      );
    }
  } else if (urgency === "urgent") {
    if (hasFever && hasBreathTrouble) {
      concern.push(
        isHindi
          ? "बुखार के साथ सांस की तकलीफ जल्दी डॉक्टर को दिखाने वाली स्थिति है।"
          : "Fever with breathing trouble should be reviewed by a doctor urgently."
      );
    }

    if (systolic !== null && diastolic !== null && (systolic >= 140 || diastolic >= 90)) {
      concern.push(
        isHindi ? `BP ${systolic}/${diastolic} बढ़ा हुआ है।` : `BP ${systolic}/${diastolic} is elevated.`
      );
      actions.push(
        isHindi
          ? "5 मिनट आराम के बाद BP दोबारा जांचें और अगर बार-बार ऊंचा रहे तो डॉक्टर से मिलें।"
          : "Repeat the BP after 5 minutes of rest and arrange a doctor review if it stays high."
      );
    }

    if (sugar !== null && sugar >= 250) {
      concern.push(isHindi ? `शुगर ${sugar} काफी अधिक है।` : `Sugar ${sugar} is quite high.`);
    }

    if (sugar !== null && sugar < 70) {
      concern.push(isHindi ? `शुगर ${sugar} कम है।` : `Sugar ${sugar} is low.`);
      actions.push(
        isHindi
          ? "तेज शुगर लें, 15 मिनट बाद दोबारा जांचें, और सुधार न हो तो मदद लें।"
          : "Take fast sugar, recheck after 15 minutes, and seek help if it does not improve."
      );
    }
  } else if (urgency === "moderate") {
    if (hasFever && hasCough) {
      concern.push(
        isHindi
          ? "यह बुखार और खांसी जैसी सामान्य संक्रमण वाली स्थिति लग सकती है, लेकिन निगरानी जरूरी है।"
          : "This could fit a common fever-and-cough illness, but it should be monitored."
      );
      actions.push(
        isHindi
          ? "आराम करें, पानी पिएं, तापमान देखें, और सांस में तकलीफ हो तो तुरंत डॉक्टर को दिखाएं।"
          : "Rest, hydrate, monitor temperature, and seek urgent care if breathing becomes difficult."
      );
    }

    if (hasSkinIssue) {
      concern.push(
        isHindi
          ? "यह त्वचा से जुड़ी समस्या लग रही है और फोटो के साथ स्किन चेक पेज ज्यादा मदद करेगा।"
          : "This sounds like a skin concern, and the Skin Check page with a photo can help more."
      );
    }
  }

  if (doesNotKnowReadings) {
    actions.push(
      isHindi
        ? "रीडिंग नहीं पता हो तो उम्र, लक्षण कब से हैं, बुखार है या नहीं, और सांस या दर्द जैसी परेशानी बताएं।"
        : "If you do not know the readings yet, tell me your age, symptom duration, and whether you have fever, pain, or breathing trouble."
    );
    followUp.push(
      isHindi
        ? "अगर संभव हो तो BP, शुगर और हार्ट रेट बाद में जोड़ें।"
        : "If possible, add BP, sugar, and heart-rate readings later."
    );
  }

  if (concern.length === 0 && actions.length === 0 && followUp.length === 0) {
    return baseReply;
  }

  if (actions.length === 0) {
    actions.push(
      isHindi
        ? "लक्षणों को नोट करें, आराम करें, पानी पिएं, और अगर समस्या बढ़े तो डॉक्टर से मिलें।"
        : "Track the symptoms, rest, stay hydrated, and seek medical review if things worsen."
    );
  }

  if (urgency !== "general") {
    redFlags.push(
      isHindi
        ? "अगर सांस बहुत फूल रही हो, बेहोशी, तेज कमजोरी, लगातार उल्टी, या हालत तेजी से बिगड़े तो तुरंत मदद लें।"
        : "Get urgent help if there is severe breathlessness, fainting, marked weakness, repeated vomiting, or rapid worsening."
    );
  }

  if (!bpMatch && (mentionsBp || hasChestPain || hasHeadache || hasDizziness)) {
    followUp.push(
      isHindi ? "BP रीडिंग भेजें, उदाहरण: 150/95." : "Send your BP reading, for example: 150/95."
    );
  }

  if (mentionsSugar && sugar === null) {
    followUp.push(
      isHindi
        ? "शुगर रीडिंग भेजें, जैसे fasting 110 या random 220."
        : "Send the sugar reading, for example: fasting 110 or random 220."
    );
  }

  if (mentionsPulse && pulse === null) {
    followUp.push(
      isHindi ? "हार्ट रेट या pulse भेजें, जैसे 88 bpm." : "Send the heart rate or pulse, for example: 88 bpm."
    );
  }

  if (followUp.length === 0) {
    followUp.push(
      isHindi
        ? "उम्र, लक्षण कितने समय से हैं, और कोई रीडिंग हो तो भेजें।"
        : "Reply with your age, how long the symptoms have been present, and any readings you have."
    );
  }

  const urgencyLine =
    urgency === "emergency"
      ? isHindi
        ? "तत्कालता: इमरजेंसी"
        : "Urgency: Emergency"
      : urgency === "urgent"
        ? isHindi
          ? "तत्कालता: जल्दी डॉक्टर को दिखाएं"
          : "Urgency: Urgent doctor review"
        : isHindi
          ? "तत्कालता: नजर रखें"
          : "Urgency: Monitor closely";

  const sectionLabel = (en: string, hi: string) => (isHindi ? hi : en);

  return [
    urgencyLine,
    `${sectionLabel("What this may suggest:", "यह क्या संकेत दे सकता है:")}\n- ${concern.join("\n- ")}`,
    `${sectionLabel("What to do now:", "अभी क्या करें:")}\n- ${actions.join("\n- ")}`,
    redFlags.length
      ? `${sectionLabel("Red flags:", "रेड फ्लैग्स:")}\n- ${redFlags.join("\n- ")}`
      : "",
    `${sectionLabel("Reply with:", "यह जानकारी भेजें:")}\n- ${followUp.join("\n- ")}`,
    sectionLabel("This is guidance only, not a diagnosis.", "यह सिर्फ मार्गदर्शन है, पक्का निदान नहीं।"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function AIChatbotPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);
  const starter = useMemo<Message[]>(
    () => [
      {
        role: "assistant",
        text: isHindi
          ? "नमस्ते, मैं आपका हेल्थ असिस्टेंट हूं। अपने लक्षण या हेल्थ रीडिंग लिखें और मैं अगला सही कदम बताने की कोशिश करूंगा।"
          : translateUi(
              "Hello, I am your health assistant. Share symptoms or health readings and I will try to guide the next best step.",
              language
            ),
      },
    ],
    [isHindi, language]
  );
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMsg: Message = { role: "user", text: trimmed };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = (await response.json()) as { reply?: string; error?: string };
      const assistantReply = data.reply || getEnhancedBotReply(trimmed, isHindi);

      setMessages((current) => [...current, { role: "assistant", text: assistantReply }]);
    } catch (error) {
      console.warn("Chatbot API fetch failed, falling back to rule-based analysis:", error);
      const fallbackText = getEnhancedBotReply(trimmed, isHindi);
      setMessages((current) => [...current, { role: "assistant", text: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-cyan-400">
              {localize("AI Chatbot", "एआई चैटबॉट")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize("Guided health chat assistant", "गाइडेड हेल्थ चैट असिस्टेंट")}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {isHindi
                ? "यह चैटबॉट सामान्य स्वास्थ्य मार्गदर्शन देता है और अगले कदम समझाने में मदद करता है।"
                : "This chatbot gives simple health guidance and helps explain the next step."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/" className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90">
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <div className="mb-4 flex flex-wrap gap-3">
            {improvedQuickReplies[isHindi ? "hi" : "en"].map((reply) => (
              <button
                key={reply}
                type="button"
                disabled={isLoading}
                onClick={() => void sendMessage(reply)}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                {reply}
              </button>
            ))}
          </div>

          <div className="space-y-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-4 ${
                  message.role === "assistant"
                    ? "bg-cyan-500/10 text-[var(--foreground)]"
                    : "ml-auto bg-emerald-500/10 text-[var(--foreground)]"
                }`}
              >
                {message.text}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[85%] rounded-3xl bg-cyan-500/10 px-5 py-4 text-xs italic text-[var(--muted)] animate-pulse">
                {localize("RoboDoctor AI is thinking...", "RoboDoctor AI सोच रहा है...")}
              </div>
            )}
          </div>

          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              void sendMessage(input);
            }}
            className="mt-5 flex gap-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isLoading}
              placeholder={isHindi ? "लक्षण, BP, शुगर, पल्स या सवाल लिखें..." : translateUi("Type symptoms, BP, sugar, pulse, or a question...", language)}
              className="flex-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-2xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {isLoading
                ? localize("Sending...", "भेजा जा रहा है...")
                : isHindi
                ? "भेजें"
                : translateUi("Send", language)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
