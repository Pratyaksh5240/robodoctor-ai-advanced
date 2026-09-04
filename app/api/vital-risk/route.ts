import { NextResponse } from "next/server";
import { buildBaselineHealthAnalysis } from "@/lib/ai-health-assistant/riskWrapper";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const mlServiceBaseUrl = process.env.ROBO_DOC_ML_SERVICE_URL || "http://127.0.0.1:8000";
  const targetUrl = `${mlServiceBaseUrl.replace(/\/+$/, "")}/predict`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        ...data,
        source: "ml_model",
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Vital Risk ML Service unreachable or timed out, executing baseline fallback:", error);
  }

  // Graceful Fallback: Use baseline clinical rules engine when Python ML backend is offline
  try {
    const baseline = buildBaselineHealthAnalysis({
      age: Number(body.age || 0),
      heightCm: Number(body.heightCm || 0),
      weightKg: Number(body.weightKg || 0),
      bloodPressure: String(body.bloodPressure || ""),
      sugar: body.bloodSugar !== null && body.bloodSugar !== undefined ? Number(body.bloodSugar) : null,
      heartRate: body.heartRate !== null && body.heartRate !== undefined ? Number(body.heartRate) : null,
      symptoms: String(body.symptoms || ""),
    });

    const mappedRisk = baseline.riskLevel === "Emergency" ? "High" : baseline.riskLevel;

    const probaLow = mappedRisk === "Low" ? 75.0 : 15.0;
    const probaMod = mappedRisk === "Moderate" ? 70.0 : 20.0;
    const probaHigh = mappedRisk === "High" ? 80.0 : 10.0;

    const priorityFinding = baseline.urgentFlags[0]
      ? {
          title: baseline.urgentFlags[0].label,
          detail: baseline.urgentFlags[0].detail,
          explanation: baseline.summary,
          severity: baseline.urgentFlags[0].severity,
        }
      : baseline.possibleConcerns[0]
      ? {
          title: baseline.possibleConcerns[0].label,
          detail: baseline.possibleConcerns[0].detail,
          explanation: baseline.summary,
          severity: baseline.possibleConcerns[0].severity,
        }
      : null;

    const recommendations = baseline.recommendations.map((rec, idx) => ({
      id: `rec_fallback_${idx}`,
      title: rec.severity === "urgent" || rec.severity === "emergency" ? "Urgent Action" : "Health Advice",
      description: rec.text,
      category: "general",
      reason: baseline.summary,
      score: 80,
      priority: rec.severity === "emergency" ? "P1" : rec.severity === "urgent" ? "P2" : "P3",
    }));

    return NextResponse.json({
      risk: mappedRisk,
      probabilities: {
        Low: probaLow,
        Moderate: probaMod,
        High: probaHigh,
      },
      bmi: baseline.bmi ?? 0,
      priorityFinding,
      recommendations,
      urgent: baseline.riskLevel === "Emergency" || baseline.urgentFlags.some(f => f.severity === "urgent" || f.severity === "emergency"),
      message: baseline.summary,
      source: "rules_fallback",
    });
  } catch (fallbackErr) {
    console.error("Vital Risk Fallback Analysis Failed:", fallbackErr);
    return NextResponse.json(
      { error: "Unable to calculate health risk analysis at this time." },
      { status: 500 }
    );
  }
}