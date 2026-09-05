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
      const framingham = calculateFraminghamRisk({
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
        ...framingham,
        risk: data.risk || framingham.risk,
        probabilities: data.probabilities || framingham.probabilities,
        probability: framingham.probability,
        priorityFinding: data.priorityFinding || framingham.priorityFinding,
        recommendations:
          Array.isArray(data.recommendations) && data.recommendations.length > 0
            ? data.recommendations
            : framingham.recommendations,
        urgent: data.urgent !== undefined ? data.urgent : framingham.urgent,
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
      source: "framingham_engine",
    });
  } catch (fallbackErr) {
    console.error("Vital Risk Fallback Analysis Failed:", fallbackErr);
    return NextResponse.json(
      { error: "Unable to calculate health risk analysis at this time." },
      { status: 500 }
    );
  }
}