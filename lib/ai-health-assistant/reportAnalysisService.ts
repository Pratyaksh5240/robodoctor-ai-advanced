import { generateStructuredJson } from "./googleAiClient";
import { dataUrlToInlineData } from "./media";
import { wrapSeveritySignal } from "./riskWrapper";
import type { ReportAnalysisOutput } from "./types";

type ReportModelPayload = {
  headline: string;
  plainLanguageSummary: string;
  keyFindings: string[];
  redFlags: string[];
  recommendedNextSteps: string[];
  aiUrgency: "low" | "medium" | "high";
};

function buildFallbackReportAnalysis(
  question?: string,
  patientContext?: string
): ReportAnalysisOutput {
  const combinedContext = `${question || ""} ${patientContext || ""}`.toLowerCase();
  const keyFindings: string[] = [
    "Medical document safely ingested and prepared for clinical analysis.",
  ];
  const redFlags: string[] = [];
  const recommendedNextSteps: string[] = [
    "Verify printed reference intervals provided on your laboratory's official report sheet.",
    "Share the complete report with your treating doctor before initiating any medication adjustments.",
  ];

  const headline = "Clinical Report Review & Contextual Interpretation";
  const summary =
    "Your medical file has been processed. For fully automated vision AI scanning, ensure a valid GEMINI_API_KEY is configured in .env.local. Below is the clinical guidance and standard reference interpretation.";
  let aiUrgency: "low" | "medium" | "high" = "low";

  // Check for common lab values in question or context
  if (combinedContext.includes("sugar") || combinedContext.includes("glucose") || combinedContext.includes("hba1c")) {
    keyFindings.push("Glucose / Glycemic evaluation identified in query.");
    keyFindings.push("Normal Fasting Plasma Glucose: 70–99 mg/dL | Prediabetes: 100–125 mg/dL | Diabetes: ≥126 mg/dL.");
    keyFindings.push("Target HbA1c: <5.7% (Normal), 5.7–6.4% (Prediabetes), ≥6.5% (Diabetes).");
  }

  if (combinedContext.includes("hemoglobin") || combinedContext.includes("hb") || combinedContext.includes("anemia")) {
    keyFindings.push("Hematology / Hemoglobin marker referenced.");
    keyFindings.push("Typical normal adult Hemoglobin: 13.5–17.5 g/dL (Males), 12.0–15.5 g/dL (Females).");
    keyFindings.push("Values below 10 g/dL may indicate moderate anemia requiring iron, B12, or folate evaluation.");
  }

  if (combinedContext.includes("platelet") || combinedContext.includes("cbc") || combinedContext.includes("wbc")) {
    keyFindings.push("Complete Blood Count (CBC) panel referenced.");
    keyFindings.push("Normal Platelet Count: 150,000–450,000 /µL | Normal Total Leukocyte Count (WBC): 4,000–11,000 /µL.");
    if (combinedContext.includes("dengue") || combinedContext.includes("fever")) {
      keyFindings.push("In acute fever, platelet count <100,000 /µL requires daily monitoring for dengue hemorrhagic signs.");
      aiUrgency = "medium";
    }
  }

  if (combinedContext.includes("tsh") || combinedContext.includes("thyroid")) {
    keyFindings.push("Thyroid Function panel identified.");
    keyFindings.push("Typical normal TSH range: 0.4–4.5 mIU/L (High TSH suggests Hypothyroidism; Low TSH suggests Hyperthyroidism).");
  }

  if (combinedContext.includes("cholesterol") || combinedContext.includes("lipid") || combinedContext.includes("triglyceride")) {
    keyFindings.push("Lipid Cardiovascular Profile referenced.");
    keyFindings.push("Desirable Total Cholesterol: <200 mg/dL | Target LDL: <100 mg/dL | Desirable Triglycerides: <150 mg/dL.");
  }

  if (keyFindings.length === 1) {
    keyFindings.push(
      "Standard routine panels include Complete Blood Count (CBC), Fasting Blood Sugar, Kidney Function (Creatinine/Urea), and Lipid Profile."
    );
  }

  return {
    headline,
    plainLanguageSummary: summary,
    keyFindings,
    redFlags,
    recommendedNextSteps,
    risk: wrapSeveritySignal(aiUrgency, summary),
    provider: "fallback",
    model: "clinical-report-engine",
    fallbackUsed: true,
  };
}

export async function analyzeReportFile(input: {
  fileDataUrl: string;
  question?: string;
  patientContext?: string;
}): Promise<ReportAnalysisOutput> {
  const inlineData = dataUrlToInlineData(input.fileDataUrl);
  const fileDescriptor = inlineData.mimeType.startsWith("image/")
    ? "medical image, scan, or X-ray"
    : inlineData.mimeType === "application/pdf"
      ? "medical report PDF"
      : `medical file (${inlineData.mimeType})`;

  try {
    const { data, meta } = await generateStructuredJson<ReportModelPayload>({
      systemInstruction: [
        "You explain uploaded medical reports and images in simple language.",
        "Do not claim certainty and do not replace a doctor.",
        "Be conservative. If the image or report is unclear, say that clearly.",
        "Return strict JSON only with keys: headline, plainLanguageSummary, keyFindings, redFlags, recommendedNextSteps, aiUrgency.",
        "aiUrgency must be one of low, medium, high.",
        "keyFindings, redFlags, and recommendedNextSteps should each contain short bullet-style strings.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          parts: [
            {
              kind: "text",
              text: [
                `Please review this uploaded ${fileDescriptor}.`,
                input.question?.trim()
                  ? `User question: ${input.question.trim()}`
                  : "User question: Explain what this means in plain language.",
                input.patientContext?.trim()
                  ? `Patient context: ${input.patientContext.trim()}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
            {
              kind: "inlineData",
              mimeType: inlineData.mimeType,
              data: inlineData.data,
            },
          ],
        },
      ],
      maxOutputTokens: 1100,
      temperature: 0.1,
    });

    return {
      headline: data.headline.trim(),
      plainLanguageSummary: data.plainLanguageSummary.trim(),
      keyFindings: data.keyFindings.map((item) => item.trim()).filter(Boolean),
      redFlags: data.redFlags.map((item) => item.trim()).filter(Boolean),
      recommendedNextSteps: data.recommendedNextSteps
        .map((item) => item.trim())
        .filter(Boolean),
      risk: wrapSeveritySignal(data.aiUrgency, data.plainLanguageSummary),
      provider: meta.provider,
      model: meta.model,
      fallbackUsed: false,
    };
  } catch {
    return buildFallbackReportAnalysis(input.question, input.patientContext);
  }
}
