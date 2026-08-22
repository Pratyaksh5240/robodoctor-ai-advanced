import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mlServiceBaseUrl =
      process.env.ROBO_DOC_ML_SERVICE_URL || "http://127.0.0.1:8000";
    const targetUrl = `${mlServiceBaseUrl.replace(/\/+$/, "")}/predict`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.detail ||
            data.error ||
            "ML Service encountered an error during prediction.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Vital Risk API Bridge Error:", error);
    return NextResponse.json(
      {
        error:
          "Unable to connect to the Python Vital Check ML service. Please ensure the service is running on " +
          (process.env.ROBO_DOC_ML_SERVICE_URL || "http://127.0.0.1:8000"),
      },
      { status: 502 }
    );
  }
}