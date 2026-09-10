import { NextResponse } from "next/server";
import { calculateFraminghamRisk } from "@/lib/framinghamRisk";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const mlServiceBaseUrl = process.env.ROBO_DOC_ML_SERVICE_URL || "http://127.0.0.1:8000";
  const targetUrl = `${mlServiceBaseUrl.replace(/\/+$/, "")}/predict`;

  // 2.5 second timeout for remote ML service
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

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

      if (data.status !== "model_unavailable" && data.risk && data.risk !== "Unavailable") {
        const framinghamLocal = calculateFraminghamRisk({
          age: Number(body.age || 0),
          sex: body.sex,
          heightCm: Number(body.heightCm || 0),
          weightKg: Number(body.weightKg || 0),
          bloodPressure: String(body.bloodPressure || "120/80"),
          bloodSugar: body.bloodSugar !== null && body.bloodSugar !== undefined ? Number(body.bloodSugar) : null,
          heartRate: body.heartRate !== null && body.heartRate !== undefined ? Number(body.heartRate) : null,
          symptoms: String(body.symptoms || ""),
          currentSmoker: body.currentSmoker,
          cigsPerDay: body.cigsPerDay,
          bpMeds: body.bpMeds,
          prevalentStroke: body.prevalentStroke,
          diabetes: body.diabetes,
          totChol: body.totChol,
        });

        return NextResponse.json({
          ...framinghamLocal,
          status: "ok",
          model_version: data.model_version || "4.0.0",
          risk: data.risk || framinghamLocal.risk,
          probabilities: data.probabilities || framinghamLocal.probabilities,
          probability: data.probability !== undefined ? data.probability : framinghamLocal.probability,
          tenYearRiskPercent: data.tenYearRiskPercent !== undefined ? data.tenYearRiskPercent : data.probability,
          threshold: data.threshold || 0.37,
          screening_result: data.screening_result || (data.probability >= 37.0 ? "positive" : "negative"),
          safety_flags: data.safety_flags || [],
          topContributingFactors: data.topContributingFactors || data.keyContributingFactors || framinghamLocal.keyContributingFactors,
          keyContributingFactors: data.keyContributingFactors || framinghamLocal.keyContributingFactors,
          priorityFinding: data.priorityFinding || framinghamLocal.priorityFinding,
          recommendations:
            Array.isArray(data.recommendations) && data.recommendations.length > 0
              ? data.recommendations
              : framinghamLocal.recommendations,
          medicationInformation: data.medicationInformation || framinghamLocal.medicationInformation || [],
          usefulInformation: data.usefulInformation || framinghamLocal.usefulInformation || [],
          urgent: data.urgent !== undefined ? data.urgent : framinghamLocal.urgent,
          model: data.model || "Framingham Heart Study 10-Year CVD Screening Ensemble (v4.0)",
          source: "ml_model",
        });
      }
    }
  } catch {
    clearTimeout(timeoutId);
    // Fall through to seamless local clinical calculation
  }

  // Seamless Clinical Fallback Engine (Vercel & Offline Compatible)
  const fallbackFramingham = calculateFraminghamRisk({
    age: Number(body.age || 0),
    sex: body.sex,
    heightCm: Number(body.heightCm || 0),
    weightKg: Number(body.weightKg || 0),
    bloodPressure: String(body.bloodPressure || "120/80"),
    bloodSugar: body.bloodSugar !== null && body.bloodSugar !== undefined ? Number(body.bloodSugar) : null,
    heartRate: body.heartRate !== null && body.heartRate !== undefined ? Number(body.heartRate) : null,
    symptoms: String(body.symptoms || ""),
    currentSmoker: body.currentSmoker,
    cigsPerDay: body.cigsPerDay,
    bpMeds: body.bpMeds,
    prevalentStroke: body.prevalentStroke,
    diabetes: body.diabetes,
    totChol: body.totChol,
  });

  return NextResponse.json(
    {
      ...fallbackFramingham,
      status: "ok",
      model_version: "4.0.0",
      threshold: 0.37,
      tenYearRiskPercent: fallbackFramingham.probability,
      screening_result: fallbackFramingham.probability >= 37.0 ? "positive" : "negative",
      safety_flags: [],
      topContributingFactors: fallbackFramingham.keyContributingFactors,
      source: "framingham_engine",
    },
    { status: 200 }
  );
}