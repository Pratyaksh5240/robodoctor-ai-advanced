import type { ExtractedSignal } from "@/lib/symptomExtraction";

export type GoogleAiProvider = "gemini" | "vertex" | "fallback";

export type AssistantConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ModelPart =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "inlineData";
      mimeType: string;
      data: string;
    };

export type ModelMessage = {
  role: "user" | "assistant";
  parts: ModelPart[];
};

export type GenerateModelInput = {
  model?: string;
  systemInstruction?: string;
  messages: ModelMessage[];
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
  maxOutputTokens?: number;
};

export type GenerateModelResult = {
  provider: GoogleAiProvider;
  model: string;
  text: string;
  raw: unknown;
};

export type BaselineHealthProfile = {
  age?: number | string | null;
  heightCm?: number | string | null;
  weightKg?: number | string | null;
  bloodPressure?: string | null;
  sugar?: number | string | null;
  heartRate?: number | string | null;
  symptoms?: string | null;
  notes?: string | null;
  extraSignals?: ExtractedSignal[];
};

export type WrappedRiskLevel = "Low" | "Medium" | "High";

export type WrappedRiskAssessment = {
  level: WrappedRiskLevel;
  urgencyLabel: string;
  reason: string;
  baselineRiskLevel: string | null;
  baselineRiskScore: number | null;
  immediateAttention: boolean;
  redFlagCount: number;
  tags: string[];
};

export type BaselineAnalysisSummary = {
  riskLevel: string;
  riskScore: number;
  summary: string;
  urgentFlags: string[];
  possibleConcerns: string[];
  recommendations: string[];
  symptomTags: string[];
};

export type ChatAssistantOutput = {
  reply: string;
  followUpQuestions: string[];
  redFlags: string[];
  nextStep: string;
  risk: WrappedRiskAssessment;
  baseline: BaselineAnalysisSummary;
  provider: GoogleAiProvider;
  model: string;
  fallbackUsed: boolean;
};

export type ReportAnalysisOutput = {
  headline: string;
  plainLanguageSummary: string;
  keyFindings: string[];
  redFlags: string[];
  recommendedNextSteps: string[];
  risk: WrappedRiskAssessment;
  provider: GoogleAiProvider;
  model: string;
  fallbackUsed: boolean;
};

export type SuggestionsOutput = {
  diet: string[];
  precautions: string[];
  nextSteps: string[];
  followUpQuestions: string[];
  risk: WrappedRiskAssessment;
  baseline: BaselineAnalysisSummary;
  provider: GoogleAiProvider;
  model: string;
  fallbackUsed: boolean;
};

export type ReminderPlanItem = {
  title: string;
  time: string;
  reason: string;
};

export type ReminderSuggestionOutput = {
  planTitle: string;
  reminders: ReminderPlanItem[];
  dailyTips: string[];
  provider: GoogleAiProvider;
  model: string;
  fallbackUsed: boolean;
};
