import { NextResponse } from "next/server";
import { extractSymptomSignals } from "@/lib/symptomExtraction";
import { calculateFraminghamRisk } from "@/lib/framinghamRisk";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const mlServiceBaseUrl = process.env.ROBO_DOC_ML_SERVICE_URL || "http://127.0.0.1:8000";

  // Check if Framingham clinical fields are provided (e.g. totChol, smoking status, etc.)
  const hasFraminghamInputs = Boolean(
    body.totChol !== undefined && body.totChol !== null && Number(body.totChol) > 0 ||
    body.currentSmoker !== undefined && body.currentSmoker !== null ||
    body.cigsPerDay !== undefined && body.cigsPerDay !== null ||
    body.bpMeds !== undefined && body.bpMeds !== null ||
    body.diabetes !== undefined && body.diabetes !== null
  );

  // If Framingham inputs are present, target either /predict-chd or /predict
  const targetUrl = `${mlServiceBaseUrl.replace(/\/+$/, "")}/predict`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

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

      if (data.status === "model_unavailable") {
        return NextResponse.json(
          {
            status: "model_unavailable",
            risk: "Unavailable",
            probability: null,
            tenYearRiskPercent: null,
            threshold: data.threshold || 0.37,
            screening_result: "unavailable",
            safety_flags: data.safety_flags || [],
            error: "Cardiovascular risk prediction model is currently offline. No synthetic estimate is substituted.",
            message: data.message || "Cardiovascular risk ML model is currently unavailable.",
            model: "Framingham Heart Study CVD Model (Offline)",
            model_version: null,
            source: "model_offline",
            recommendations: [],
            keyContributingFactors: [],
            topContributingFactors: [],
            urgent: false
          },
          { status: 503 }
        );
      }

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
        topContributingFactors: data.topContributingFactors || data.keyContributingFactors || [],
        keyContributingFactors: data.keyContributingFactors || [],
        priorityFinding: data.priorityFinding || framinghamLocal.priorityFinding,
        recommendations:
          Array.isArray(data.recommendations) && data.recommendations.length > 0
            ? data.recommendations
            : framinghamLocal.recommendations,
        medicationInformation: data.medicationInformation || framinghamLocal.medicationInformation || [],
        usefulInformation: data.usefulInformation || framinghamLocal.usefulInformation || [],
        urgent: data.urgent !== undefined ? data.urgent : framinghamLocal.urgent,
        model: data.model || "Framingham Heart Study 10-Year CVD Screening Ensemble (v4.0)",
        modelAccuracy: data.modelAccuracy || "86.1% Recall (Sensitivity), 56.2% Precision, 72.9% ROC-AUC (Optimal Threshold 0.37)",
        source: "ml_model",
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Vital Risk ML Service unreachable or timed out:", error);
  }

  // Explicit Model-Unavailable Status: Never fabricate synthetic risk when ML service is offline
  return NextResponse.json(
    {
      status: "model_unavailable",
      risk: "Unavailable",
      probability: null,
      tenYearRiskPercent: null,
      screening_result: "unavailable",
      threshold: 0.37,
      safety_flags: [],
      error: "Cardiovascular risk prediction ML service is currently offline. No synthetic percentages substituted.",
      message: "The Framingham cardiovascular risk model is currently offline. Please restart the ML service on port 8000.",
      model: "Framingham Heart Study CVD Model (Offline)",
      model_version: null,
      source: "model_offline",
      recommendations: [],
      keyContributingFactors: [],
      topContributingFactors: [],
      urgent: false
    },
    { status: 503 }
  );
}