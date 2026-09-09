import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const mlServiceBaseUrl = process.env.ROBO_DOC_ML_SERVICE_URL || "http://127.0.0.1:8000";
  const targetUrl = `${mlServiceBaseUrl.replace(/\/+$/, "")}/predict-cad`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: Number(body.age),
        sex: body.sex === "male" || body.sex === "1" || body.sex === 1 ? 1 : 0,
        cp: Number(body.cp || 1),
        trestbps: body.trestbps !== undefined && body.trestbps !== null ? Number(body.trestbps) : undefined,
        chol: body.chol !== undefined && body.chol !== null ? Number(body.chol) : undefined,
        fbs: body.fbs ? 1 : 0,
        restecg: body.restecg !== undefined ? Number(body.restecg) : 0,
        thalach: body.thalach !== undefined && body.thalach !== null ? Number(body.thalach) : undefined,
        exang: body.exang ? 1 : 0,
        oldpeak: body.oldpeak !== undefined ? Number(body.oldpeak) : 0.0,
        slope: body.slope !== undefined ? Number(body.slope) : 1,
        ca: body.ca !== undefined ? Number(body.ca) : 0,
        thal: body.thal !== undefined ? Number(body.thal) : 3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `ML Service responded with status ${response.status}: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    clearTimeout(timeoutId);
    return NextResponse.json(
      {
        status: "service_offline",
        error: "Coronary Artery Disease ML diagnostic service is currently unreachable.",
        diagnostic_accuracy: "88.52% Test Accuracy, 95.24% ROC-AUC (Offline)",
        cad_presence: false,
        cad_probability: 0.0,
        risk_level: "Unavailable",
        diagnostic_assessment: "ML Diagnostic Service Offline. Please verify FastAPI backend on port 8000.",
        confidence: 0.0,
        key_factors: [],
        triage_guidance: "Please ensure the RoboDoctor AI ML backend is running.",
        clinical_recommendations: [
          "Verify the ML service status at http://127.0.0.1:8000/health",
          "Ensure ml/models/robodoctor_cad_model.joblib is loaded."
        ],
        disclaimer: "Offline diagnostic placeholder. No synthetic estimates substituted."
      },
      { status: 503 }
    );
  }
}
