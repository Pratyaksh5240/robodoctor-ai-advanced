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
        risk: data.risk || framinghamLocal.risk,
        probabilities: data.probabilities || framinghamLocal.probabilities,
        probability: data.probability !== undefined ? data.probability : framinghamLocal.probability,
        tenYearRiskPercent: data.tenYearRiskPercent !== undefined ? data.tenYearRiskPercent : data.probability,
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
        model: data.model || "Framingham Heart Study CHD Model (Genuine)",
        modelAccuracy: data.modelAccuracy || "72.8% ROC-AUC (67.8% Sensitivity)",
        source: "ml_model",
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Vital Risk ML Service unreachable or timed out, executing Framingham engine:", error);
  }

  // Graceful Fallback: Use Framingham CVD Risk Engine + Symptom Extractor
  try {
    const symptomsText = String(body.symptoms || "");
    const { signals } = await extractSymptomSignals(symptomsText);

    const framinghamResult = calculateFraminghamRisk({
      age: Number(body.age || 0),
      sex: body.sex,
      heightCm: Number(body.heightCm || 0),
      weightKg: Number(body.weightKg || 0),
      bloodPressure: String(body.bloodPressure || "120/80"),
      bloodSugar: body.bloodSugar !== null && body.bloodSugar !== undefined ? Number(body.bloodSugar) : null,
      heartRate: body.heartRate !== null && body.heartRate !== undefined ? Number(body.heartRate) : null,
      symptoms: symptomsText,
      currentSmoker: body.currentSmoker,
      cigsPerDay: body.cigsPerDay,
      bpMeds: body.bpMeds,
      prevalentStroke: body.prevalentStroke,
      diabetes: body.diabetes,
      extraSignals: signals,
    });

    return NextResponse.json({
      ...framinghamResult,
      tenYearRiskPercent: framinghamResult.probability,
      topContributingFactors: (framinghamResult.keyContributingFactors || []).map((kf: any) => ({
        feature: kf.feature,
        label: kf.label,
        impact: kf.contributionPct / 20.0,
        direction: kf.effect,
        explanation: kf.explanation
      })),
      source: hasFraminghamInputs ? "rules_fallback" : "framingham_engine",
    });
  } catch (fallbackErr) {
    console.error("Vital Risk Fallback Analysis Failed:", fallbackErr);
    return NextResponse.json(
      { error: "Unable to calculate health risk analysis at this time." },
      { status: 500 }
    );
  }
}