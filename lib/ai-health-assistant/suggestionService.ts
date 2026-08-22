import { generateStructuredJson } from "./googleAiClient";
import {
  buildBaselineHealthAnalysis,
  summarizeHealthAnalysis,
  wrapExistingHealthAnalysis,
} from "./riskWrapper";
import type {
  BaselineHealthProfile,
  SuggestionsOutput,
} from "./types";

type SuggestionModelPayload = {
  diet: string[];
  precautions: string[];
  nextSteps: string[];
  followUpQuestions: string[];
};

function buildFallbackSuggestions(profile: BaselineHealthProfile): SuggestionsOutput {
  const analysis = buildBaselineHealthAnalysis(profile);
  const baseline = summarizeHealthAnalysis(analysis);
  const summaryText = `${baseline.summary} ${baseline.recommendations.join(" ")}`;
  const loweredSummary = summaryText.toLowerCase();

  const diet = [
    "Prefer home-cooked meals with vegetables, dal, beans, eggs, or other balanced protein.",
    "Stay well hydrated and reduce sugary drinks.",
  ];

  if (loweredSummary.includes("blood pressure") || loweredSummary.includes("hypertension")) {
    diet.push("Reduce salty packaged foods and choose lighter meals.");
  }

  if (loweredSummary.includes("sugar") || loweredSummary.includes("diabetes")) {
    diet.push("Focus on high-fiber foods and keep sweets or sweet drinks limited.");
  }

  const precautions = [
    "Track symptoms daily and watch for worsening red flags.",
    "Avoid delaying medical review if symptoms are getting worse.",
  ];

  const nextSteps =
    baseline.recommendations.slice(0, 3).length > 0
      ? baseline.recommendations.slice(0, 3)
      : ["Book a routine doctor review if symptoms persist."];

  return {
    diet: Array.from(new Set(diet)).slice(0, 5),
    precautions,
    nextSteps,
    followUpQuestions: [
      "Do you have any diagnosed medical conditions?",
      "Are you taking any regular medicines?",
      "What symptom is troubling you the most right now?",
    ],
    risk: wrapExistingHealthAnalysis(analysis),
    baseline,
    provider: "fallback",
    model: "rule-based-suggestions",
    fallbackUsed: true,
  };
}

export async function generatePersonalizedSuggestions(input: {
  profile: BaselineHealthProfile;
  goal?: string;
}): Promise<SuggestionsOutput> {
  const analysis = buildBaselineHealthAnalysis(input.profile);
  const baseline = summarizeHealthAnalysis(analysis);

  try {
    const { data, meta } = await generateStructuredJson<SuggestionModelPayload>({
      systemInstruction: [
        "You create practical health suggestions for education only.",
        "Do not diagnose and do not give medication dosing.",
        "Return strict JSON only with keys: diet, precautions, nextSteps, followUpQuestions.",
        "Keep every item short, practical, and plain-language.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          parts: [
            {
              kind: "text",
              text: [
                "Use this existing rule-based screening to shape your advice.",
                `Risk level: ${baseline.riskLevel}`,
                `Risk score: ${baseline.riskScore}`,
                `Summary: ${baseline.summary}`,
                `Recommendations: ${baseline.recommendations.join(" | ") || "none"}`,
                `Symptoms: ${input.profile.symptoms ?? "not provided"}`,
                input.goal?.trim()
                  ? `User goal: ${input.goal.trim()}`
                  : "User goal: diet, precautions, and next steps.",
              ].join("\n"),
            },
          ],
        },
      ],
      maxOutputTokens: 900,
      temperature: 0.3,
    });

    return {
      diet: data.diet.map((item) => item.trim()).filter(Boolean).slice(0, 6),
      precautions: data.precautions
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6),
      nextSteps: data.nextSteps
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6),
      followUpQuestions: data.followUpQuestions
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4),
      risk: wrapExistingHealthAnalysis(analysis),
      baseline,
      provider: meta.provider,
      model: meta.model,
      fallbackUsed: false,
    };
  } catch {
    return buildFallbackSuggestions(input.profile);
  }
}
