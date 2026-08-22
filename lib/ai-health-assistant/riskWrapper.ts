import {
  analyzeHealth,
  parseBloodPressure,
  type HealthAnalysis,
} from "@/lib/healthAnalysis";
import type {
  BaselineAnalysisSummary,
  BaselineHealthProfile,
  WrappedRiskAssessment,
  WrappedRiskLevel,
} from "./types";

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapAnalysisRiskLevel(
  riskLevel: HealthAnalysis["riskLevel"]
): WrappedRiskLevel {
  if (riskLevel === "Low") {
    return "Low";
  }

  if (riskLevel === "Moderate") {
    return "Medium";
  }

  return "High";
}

function mapAiUrgency(value: string | null | undefined): WrappedRiskLevel | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["high", "urgent", "emergency"].includes(normalized)) {
    return "High";
  }

  if (["medium", "moderate"].includes(normalized)) {
    return "Medium";
  }

  if (normalized === "low") {
    return "Low";
  }

  return null;
}

export function mergeSymptoms(
  profile: BaselineHealthProfile,
  extraText?: string | null
) {
  const combined = [profile.symptoms, extraText]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(". ");

  if (!combined) {
    return profile;
  }

  return {
    ...profile,
    symptoms: combined,
  };
}

export function buildBaselineHealthAnalysis(profile: BaselineHealthProfile) {
  const { systolic, diastolic } = parseBloodPressure(
    profile.bloodPressure?.trim() ?? ""
  );

  return analyzeHealth({
    age: toNullableNumber(profile.age) ?? 0,
    heightCm: toNullableNumber(profile.heightCm) ?? 0,
    weightKg: toNullableNumber(profile.weightKg) ?? 0,
    systolic,
    diastolic,
    sugar: toNullableNumber(profile.sugar),
    heartRate: toNullableNumber(profile.heartRate),
    symptoms: profile.symptoms?.trim() ?? "",
  });
}

export function summarizeHealthAnalysis(
  analysis: HealthAnalysis
): BaselineAnalysisSummary {
  return {
    riskLevel: analysis.riskLevel,
    riskScore: analysis.riskScore,
    summary: analysis.summary,
    urgentFlags: analysis.urgentFlags.map((item) => `${item.label}: ${item.detail}`),
    possibleConcerns: analysis.possibleConcerns.map(
      (item) => `${item.label}: ${item.detail}`
    ),
    recommendations: analysis.recommendations.map((item) => item.text),
    symptomTags: analysis.symptomTags,
  };
}

export function wrapExistingHealthAnalysis(
  analysis: HealthAnalysis,
  aiUrgency?: string | null,
  aiReason?: string | null,
  extraRedFlags: string[] = []
): WrappedRiskAssessment {
  let level = mapAnalysisRiskLevel(analysis.riskLevel);
  const aiLevel = mapAiUrgency(aiUrgency);

  if (aiLevel === "High") {
    level = "High";
  } else if (aiLevel === "Medium" && level === "Low") {
    level = "Medium";
  }

  const immediateAttention =
    analysis.riskLevel === "Emergency" ||
    analysis.urgentFlags.some(
      (item) => item.severity === "emergency" || item.severity === "urgent"
    ) ||
    level === "High";

  const urgencyLabel =
    level === "High"
      ? "Urgent medical attention recommended"
      : level === "Medium"
        ? "Monitor closely and arrange a review"
        : "Self-care and monitoring are reasonable";

  return {
    level,
    urgencyLabel,
    reason:
      aiReason?.trim() ||
      analysis.urgentFlags[0]?.detail ||
      analysis.possibleConcerns[0]?.detail ||
      analysis.summary,
    baselineRiskLevel: analysis.riskLevel,
    baselineRiskScore: analysis.riskScore,
    immediateAttention,
    redFlagCount: analysis.urgentFlags.length + extraRedFlags.length,
    tags: analysis.symptomTags,
  };
}

export function wrapSeveritySignal(
  signal: string | null | undefined,
  summary: string
): WrappedRiskAssessment {
  const normalized = signal?.trim().toLowerCase();
  const level: WrappedRiskLevel =
    normalized === "high" || normalized === "urgent" || normalized === "emergency"
      ? "High"
      : normalized === "medium" || normalized === "moderate"
        ? "Medium"
        : "Low";

  return {
    level,
    urgencyLabel:
      level === "High"
        ? "Urgent follow-up is recommended"
        : level === "Medium"
          ? "Review soon and monitor changes"
          : "Monitor and follow routine care",
    reason: summary,
    baselineRiskLevel: null,
    baselineRiskScore: null,
    immediateAttention: level === "High",
    redFlagCount: level === "High" ? 1 : 0,
    tags: [],
  };
}
