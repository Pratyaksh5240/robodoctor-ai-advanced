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

function buildFallbackReportAnalysis(): ReportAnalysisOutput {
  const summary =
    "The upload pipeline is ready, but Gemini or Vertex AI credentials are not configured yet for report understanding.";

  return {
    headline: "AI report understanding needs configuration",
    plainLanguageSummary: summary,
    keyFindings: [
      "The file was received by the new standalone report-understanding flow.",
      "Configure Gemini API key or Vertex AI credentials to enable plain-language explanation.",
    ],
    redFlags: [],
    recommendedNextSteps: [
      "Add Gemini or Vertex AI environment variables.",
      "Re-upload the report or X-ray after configuration.",
    ],
    risk: wrapSeveritySignal("low", summary),
    provider: "fallback",
    model: "configuration-required",
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
    return buildFallbackReportAnalysis();
  }
}
