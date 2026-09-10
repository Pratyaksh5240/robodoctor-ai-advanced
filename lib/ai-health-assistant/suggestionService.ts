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
  const text = `${baseline.summary} ${baseline.recommendations.join(" ")} ${profile.symptoms || ""} ${profile.notes || ""}`.toLowerCase();

  const diet: string[] = [
    "Prefer home-cooked, easily digestible meals with balanced proteins and seasonal vegetables.",
    "Maintain adequate daily hydration with pure water and herbal fluids.",
  ];
  const precautions: string[] = [
    "Track symptoms daily and record resting vitals morning and evening.",
    "Avoid self-medicating with unprescribed antibiotics or heavy analgesics.",
  ];
  const nextSteps: string[] = [];

  if (text.includes("fever") || text.includes("बुखार") || text.includes("infection")) {
    diet.push("Hydrate with electrolyte fluids: coconut water, warm clear vegetable broths, and light moong dal soup.");
    diet.push("Incorporate vitamin C rich fruits (oranges, amla, kiwi) and soft boiled rice or oats.");
    precautions.push("Rest in bed; avoid physical exertion until temperature stays normal for 24 hours.");
    precautions.push("Do not take NSAIDs like ibuprofen or aspirin if tropical fever (dengue) is prevalent.");
    nextSteps.push("Log temperature 4 times daily and seek clinical blood work (CBC) if fever exceeds 48 hours.");
  }

  if (text.includes("cough") || text.includes("cold") || text.includes("खांसी") || text.includes("throat")) {
    diet.push("Sip warm ginger-honey water, turmeric milk, and light herbal teas throughout the day.");
    diet.push("Avoid refrigerated beverages, oily deep-fried snacks, and heavy ice creams.");
    precautions.push("Perform warm saline gargles twice daily and inhale steam before bed.");
    nextSteps.push("Consult a doctor if cough lasts longer than 2 weeks or produces colored phlegm.");
  }

  if (text.includes("stomach") || text.includes("acidity") || text.includes("gerd") || text.includes("heartburn") || text.includes("gas")) {
    diet.push("Eat small, frequent meals rather than large heavy dinners.");
    diet.push("Avoid spicy chilies, citrus juice, carbonated sodas, and excessive coffee/tea.");
    precautions.push("Avoid lying flat for at least 2 hours following a meal; elevate your head slightly.");
    precautions.push("Take an over-the-counter antacid or cooling plain yogurt for temporary soothing.");
    nextSteps.push("Book an outpatient gastroenterology consultation if acid symptoms persist beyond 10 days.");
  }

  if (text.includes("diarrhea") || text.includes("vomit") || text.includes("loose motion") || text.includes("dast")) {
    diet.push("Prioritize oral rehydration salts (ORS) solution in small, steady sips after every loose stool.");
    diet.push("Follow the bland BRAT diet: ripe bananas, boiled white rice, applesauce, and dry toast/khichdi.");
    precautions.push("Strictly avoid all milk products, raw salads, and greasy foods until stools firm up.");
    nextSteps.push("Seek immediate intravenous fluids at a clinic if vomiting prevents retaining any oral water.");
  }

  if (text.includes("blood pressure") || text.includes("hypertension") || text.includes("bp")) {
    diet.push("Adopt DASH principles: strictly restrict added salt (under 1 teaspoon / 5g daily) and eliminate packaged namkeens.");
    diet.push("Increase potassium-rich vegetables (spinach, ridge gourd) and unsalted roasted seeds.");
    precautions.push("Avoid smoking, alcohol, and sudden heavy weightlifting.");
    nextSteps.push("Maintain a 7-day BP tracking diary to present at your next physician appointment.");
  }

  if (text.includes("sugar") || text.includes("diabetes") || text.includes("glucose")) {
    diet.push("Choose low-glycemic-index whole grains (barley, oats, multigrain atta) and high-fiber lentils.");
    diet.push("Completely eliminate sugary soft drinks, sweets, white bread, and refined corn syrup.");
    precautions.push("Keep glucose tablets or hard candy on hand to rapidly treat hypoglycemia (<70 mg/dL).");
    nextSteps.push("Schedule a routine HbA1c test and urine microalbumin check with your physician.");
  }

  if (text.includes("headache") || text.includes("सिरदर्द") || text.includes("migraine")) {
    diet.push("Drink 2-3 large glasses of water immediately, as dehydration is a common headache trigger.");
    diet.push("Avoid skipping meals or prolonged fasting, which causes blood sugar crashes and headaches.");
    precautions.push("Rest in a dim, silent room and apply a cold compress to the temples.");
    nextSteps.push("Track headache triggers (screen time, stress, sleep deficit) in a symptom diary.");
  }

  if (nextSteps.length === 0) {
    nextSteps.push(...baseline.recommendations.slice(0, 3));
    if (nextSteps.length === 0) {
      nextSteps.push("Book a routine consultation with your primary physician to review these symptoms.");
    }
  }

  return {
    diet: Array.from(new Set(diet)).slice(0, 6),
    precautions: Array.from(new Set(precautions)).slice(0, 6),
    nextSteps: Array.from(new Set(nextSteps)).slice(0, 6),
    followUpQuestions: [
      "Do you have any diagnosed medical conditions or take regular medications?",
      "How many days have these specific symptoms been present?",
      "Are you experiencing any other symptoms like fever, dizziness, or chest tightness?",
    ],
    risk: wrapExistingHealthAnalysis(analysis),
    baseline,
    provider: "fallback",
    model: "clinical-engine-suggestions",
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
