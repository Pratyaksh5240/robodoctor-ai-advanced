import { generateStructuredJson } from "./googleAiClient";
import {
  buildBaselineHealthAnalysis,
  mergeSymptoms,
  summarizeHealthAnalysis,
  wrapExistingHealthAnalysis,
} from "./riskWrapper";
import type {
  AssistantConversationMessage,
  BaselineHealthProfile,
  ChatAssistantOutput,
  ModelMessage,
} from "./types";

type ChatModelPayload = {
  reply: string;
  followUpQuestions: string[];
  aiUrgency: "low" | "medium" | "high";
  redFlags: string[];
  nextStep: string;
  conciseAssessment: string;
};

function buildFallbackChat(
  profile: BaselineHealthProfile,
  messages: AssistantConversationMessage[]
): ChatAssistantOutput {
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
  const enrichedProfile = mergeSymptoms(profile, latestUserMessage);
  const analysis = buildBaselineHealthAnalysis(enrichedProfile);
  const baseline = summarizeHealthAnalysis(analysis);
  const risk = wrapExistingHealthAnalysis(analysis);

  return {
    reply: [
      baseline.summary,
      baseline.recommendations[0] ??
        "Track symptoms and seek medical care if they worsen.",
    ].join(" "),
    followUpQuestions: [
      "How long have these symptoms been present?",
      "Are you having fever, chest pain, or trouble breathing right now?",
      "Do you have any known medical conditions or regular medicines?",
    ],
    redFlags: baseline.urgentFlags,
    nextStep:
      baseline.recommendations[0] ??
      "Monitor symptoms and seek in-person care if things get worse.",
    risk,
    baseline,
    provider: "fallback",
    model: "rule-based-baseline",
    fallbackUsed: true,
  };
}

function toModelMessages(messages: AssistantConversationMessage[]): ModelMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      parts: [
        {
          kind: "text" as const,
          text: message.text.trim(),
        },
      ],
    }))
    .filter((message) => message.parts[0].text.length > 0);
}

export async function runSymptomChat(input: {
  profile: BaselineHealthProfile;
  messages: AssistantConversationMessage[];
}): Promise<ChatAssistantOutput> {
  const latestUserMessage =
    [...input.messages].reverse().find((message) => message.role === "user")
      ?.text ?? "";
  const enrichedProfile = mergeSymptoms(input.profile, latestUserMessage);
  const analysis = buildBaselineHealthAnalysis(enrichedProfile);
  const baseline = summarizeHealthAnalysis(analysis);

  const contextBlock = [
    "Patient profile for context only:",
    `- Age: ${enrichedProfile.age ?? "unknown"}`,
    `- Height (cm): ${enrichedProfile.heightCm ?? "unknown"}`,
    `- Weight (kg): ${enrichedProfile.weightKg ?? "unknown"}`,
    `- Blood pressure: ${enrichedProfile.bloodPressure ?? "unknown"}`,
    `- Sugar: ${enrichedProfile.sugar ?? "unknown"}`,
    `- Heart rate: ${enrichedProfile.heartRate ?? "unknown"}`,
    `- Symptoms note: ${enrichedProfile.symptoms ?? "none"}`,
    `- Existing rule-based risk level: ${baseline.riskLevel}`,
    `- Existing rule-based risk score: ${baseline.riskScore}`,
    `- Existing rule-based summary: ${baseline.summary}`,
    baseline.urgentFlags.length
      ? `- Existing rule-based urgent flags: ${baseline.urgentFlags.join(" | ")}`
      : "- Existing rule-based urgent flags: none",
  ].join("\n");

  try {
    const { data, meta } = await generateStructuredJson<ChatModelPayload>({
      systemInstruction: [
        "You are RoboDoctor AI's AI Health Assistant for symptom conversations.",
        "Be cautious, practical, and non-alarmist. Do not diagnose with certainty.",
        "Use the provided rule-based health screening as context, but continue the conversation naturally.",
        "Ask follow-up questions when information is missing.",
        "If you see emergency warning signs, say so clearly and recommend urgent care.",
        "Return strict JSON only with keys: reply, followUpQuestions, aiUrgency, redFlags, nextStep, conciseAssessment.",
        "reply must be plain-language and 2 to 5 sentences.",
        "followUpQuestions must contain 1 to 4 short questions.",
        "aiUrgency must be one of low, medium, high.",
        "nextStep must be one concrete next action.",
        "conciseAssessment must be a short explanation of concern level without diagnosing.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          parts: [{ kind: "text", text: contextBlock }],
        },
        ...toModelMessages(input.messages),
      ],
      maxOutputTokens: 900,
      temperature: 0.2,
    });

    return {
      reply: data.reply.trim(),
      followUpQuestions: data.followUpQuestions
        .map((question) => question.trim())
        .filter(Boolean)
        .slice(0, 4),
      redFlags: data.redFlags
        .map((flag) => flag.trim())
        .filter(Boolean)
        .slice(0, 6),
      nextStep: data.nextStep.trim(),
      risk: wrapExistingHealthAnalysis(
        analysis,
        data.aiUrgency,
        data.conciseAssessment,
        data.redFlags
      ),
      baseline,
      provider: meta.provider,
      model: meta.model,
      fallbackUsed: false,
    };
  } catch {
    return buildFallbackChat(input.profile, input.messages);
  }
}
