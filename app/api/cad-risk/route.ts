import { NextResponse } from "next/server";
import { calculateCadRisk } from "@/lib/cadRisk";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const payload = {
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
  };

  const mlServiceBaseUrl = process.env.ROBO_DOC_ML_SERVICE_URL || "http://127.0.0.1:8000";
  const targetUrl = `${mlServiceBaseUrl.replace(/\/+$/, "")}/predict-cad`;

  // Quick 2.5s timeout: if local FastAPI is running, use it; otherwise seamlessly fall back to local clinical model
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    clearTimeout(timeoutId);
    // Fall through to seamless local clinical calculation
  }

  // Seamless Clinical Fallback Engine (Vercel & Offline Compatible)
  const localResult = calculateCadRisk(payload);
  return NextResponse.json(localResult, { status: 200 });
}
