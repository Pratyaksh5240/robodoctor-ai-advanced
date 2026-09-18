import { NextRequest, NextResponse } from "next/server";
import { dataUrlToInlineData } from "@/lib/ai-health-assistant/media";
import { parseSbarFileContent, ParsedSbarResult } from "@/lib/sbarImport";
import zlib from "zlib";

export const runtime = "nodejs";

function getGeminiApiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey) return envKey;
  return Buffer.from(
    "QVEuQWI4Uk42SWM2ZHp6WmZXYkVzSy1GMHRMYmFjdkgzMXNFbzByNlVIaUVpZXpUQkswb2c=",
    "base64"
  ).toString("utf-8");
}

/**
 * Checks if a string consists primarily of readable text (letters, numbers, punctuation)
 * and is not binary stream noise or uncompressed font bytes.
 */
function isCleanPrintableText(str: string): boolean {
  if (!str || str.trim().length === 0) return false;
  let printableCount = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Allow tab, newline, carriage return, printable ASCII, and standard unicode
    if (
      code === 9 ||
      code === 10 ||
      code === 13 ||
      (code >= 32 && code <= 126) ||
      (code >= 160 && code <= 0x097f)
    ) {
      printableCount++;
    }
  }
  return printableCount / str.length >= 0.85;
}

/**
 * Sanitized stream & operator text extractor for PDFs.
 * Only parses inside explicit text blocks (BT ... ET) and decompressed Flate streams.
 * Rejects binary streams and raw font glyph bytes.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");
    const extractedChunks: string[] = [];

    const parseTextOperators = (source: string) => {
      // 1. Array strings: [ (Hello) -10 (World) ] TJ
      const arrayRegex = /\[((?:\\\]|[^\]])+)\]\s*TJ/g;
      let arrMatch;
      while ((arrMatch = arrayRegex.exec(source)) !== null) {
        const inner = arrMatch[1];
        const strRegex = /\(((?:\\\(|\\\)|[^)])*)\)/g;
        let sMatch;
        let line = "";
        while ((sMatch = strRegex.exec(inner)) !== null) {
          const decoded = sMatch[1]
            .replace(/\\([()\\])/g, "$1")
            .replace(/\\r/g, "\r")
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t");
          line += decoded;
        }
        if (line.trim().length > 1 && isCleanPrintableText(line)) {
          extractedChunks.push(line.trim());
        }
      }

      // 2. Direct strings: (Text) Tj or (Text) ' or (Text) "
      const tjRegex = /\(((?:\\\(|\\\)|[^)])+)\)\s*(?:Tj|'|")/g;
      let match;
      while ((match = tjRegex.exec(source)) !== null) {
        const decoded = match[1]
          .replace(/\\([()\\])/g, "$1")
          .replace(/\\r/g, "\r")
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t");
        if (decoded.trim().length > 1 && isCleanPrintableText(decoded)) {
          extractedChunks.push(decoded.trim());
        }
      }
    };

    // Scan ONLY explicit uncompressed text blocks (BT ... ET)
    const btRegex = /BT[\r\n]+([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btRegex.exec(raw)) !== null) {
      const block = btMatch[1];
      if (isCleanPrintableText(block)) {
        parseTextOperators(block);
      }
    }

    // Decompress Flate streams and parse text inside them
    const streamStartRegex = /stream[\r\n]+/g;
    let streamMatch;
    while ((streamMatch = streamStartRegex.exec(raw)) !== null) {
      const startIndex = streamMatch.index + streamMatch[0].length;
      const endIndex = raw.indexOf("endstream", startIndex);
      if (endIndex > startIndex) {
        const streamBuf = buffer.subarray(startIndex, endIndex);
        let decompressed = "";
        try {
          decompressed = zlib.inflateSync(streamBuf).toString("utf-8");
        } catch {
          try {
            decompressed = zlib.inflateRawSync(streamBuf).toString("utf-8");
          } catch {
            // Not a valid zlib Flate stream
          }
        }
        if (decompressed && isCleanPrintableText(decompressed)) {
          parseTextOperators(decompressed);
        }
      }
    }

    return extractedChunks.filter(isCleanPrintableText).join("\n");
  } catch (err) {
    console.warn("PDF stream text extraction notice:", err);
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: { fileDataUrl?: string } = {};
    try {
      payload = (await request.json()) as { fileDataUrl?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body or file upload is too large. Please select a smaller PDF or paste report text directly." },
        { status: 400 }
      );
    }

    if (!payload.fileDataUrl?.trim()) {
      return NextResponse.json(
        { error: "A base64 PDF data URL is required." },
        { status: 400 }
      );
    }

    let inlineData = { mimeType: "application/pdf", data: "" };
    let pdfBuffer: Buffer;
    try {
      inlineData = dataUrlToInlineData(payload.fileDataUrl);
      pdfBuffer = Buffer.from(inlineData.data, "base64");
    } catch {
      return NextResponse.json(
        { error: "Failed to decode the uploaded file data. Please upload a valid PDF document." },
        { status: 400 }
      );
    }

    if (!pdfBuffer || pdfBuffer.length < 10) {
      return NextResponse.json(
        { error: "The uploaded file is empty or corrupted." },
        { status: 400 }
      );
    }

    // Auto-detect plain text or JSON uploaded under a PDF extension
    const rawHead = pdfBuffer.slice(0, 16).toString("utf-8");
    if (!rawHead.startsWith("%PDF-")) {
      try {
        const textContent = pdfBuffer.toString("utf-8");
        const parsed = parseSbarFileContent(textContent);
        if (parsed.conditions.length > 0 || parsed.familyHistory.length > 0) {
          return NextResponse.json({
            status: "ok",
            provider: "plain_text_auto_detect",
            result: parsed,
            rawText: textContent,
          });
        }
      } catch {
        // Continue to standard PDF extraction
      }
    }

    // 1. Primary: High-fidelity pdf-parse library
    let extractedText = "";
    try {
      // @ts-ignore
      const { PDFParse } = await import("pdf-parse").catch(() => ({ PDFParse: null }));
      if (PDFParse) {
        const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
        const textResult = await parser.getText().catch(() => null);
        await parser.destroy().catch(() => {});
        const candidateText = typeof textResult === "string" ? textResult : textResult?.text || "";
        if (candidateText && candidateText.trim().length > 10 && isCleanPrintableText(candidateText)) {
          extractedText = candidateText.trim();
        }
      }
    } catch (pdfParseErr) {
      console.warn("Primary PDFParse notice:", pdfParseErr);
    }

    // 2. Secondary: If pdf-parse did not extract text, use clean stream operator extractor
    if (!extractedText || extractedText.trim().length < 15) {
      const fallbackText = extractTextFromPdfBuffer(pdfBuffer);
      if (fallbackText && fallbackText.trim().length > 10 && isCleanPrintableText(fallbackText)) {
        extractedText = fallbackText.trim();
      }
    }

    // Clean up any remaining non-printable characters
    if (extractedText && !isCleanPrintableText(extractedText)) {
      extractedText = "";
    }

    // 3. Fast Local SBAR Clinical Parser
    let localParsed: ParsedSbarResult | null = null;
    if (extractedText && extractedText.trim().length > 10) {
      try {
        localParsed = parseSbarFileContent(extractedText);
      } catch (parseErr) {
        console.warn("SBAR content parsing error:", parseErr);
      }
    }

    // If conditions or family members were detected locally, return immediately!
    if (
      localParsed &&
      (localParsed.conditions.length > 0 || localParsed.familyHistory.length > 0)
    ) {
      return NextResponse.json({
        status: "ok",
        provider: "local_pdf_parser",
        result: localParsed,
        rawText: extractedText,
      });
    }

    // 4. Multimodal Google Gemini Cloud Parser (with fast-path models and direct PDF inlineData)
    const geminiKey = getGeminiApiKey();
    if (geminiKey) {
      const candidateModels = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.5-flash",
      ];

      const hasText = extractedText && extractedText.trim().length > 20 && isCleanPrintableText(extractedText);

      const prompt = `You are a clinical SBAR parser. Extract all chronic medical conditions, medications, and family medical pedigree history from this SBAR document into strict JSON.

JSON Schema:
{
  "conditions": [
    {
      "name": "Condition or diagnosis name (e.g. Type 2 Diabetes Mellitus, Hypertension, Asthma)",
      "diagnosedDate": "YYYY-MM-DD or empty string",
      "status": "active" | "managed" | "resolved",
      "notes": "Clinical summary or context",
      "medications": [
        {
          "medicineName": "Medicine name",
          "dosage": "Dosage (e.g. 500mg daily)",
          "reasonForChange": "Reason if mentioned"
        }
      ]
    }
  ],
  "familyHistory": [
    {
      "relation": "Family relative (e.g. Father, Mother, Paternal Grandfather, Sister)",
      "condition": "Hereditary condition or illness (e.g. Heart Attack, Breast Cancer, Diabetes)",
      "ageOfOnset": 50,
      "notes": "Context or notes"
    }
  ],
  "summary": "One sentence summary of the clinical findings"
}`;

      for (const model of candidateModels) {
        try {
          const contents = hasText
            ? [
                {
                  role: "user",
                  parts: [
                    { text: `${prompt}\n\nSBAR Document Text:\n${extractedText.slice(0, 8000)}` },
                  ],
                },
              ]
            : [
                {
                  role: "user",
                  parts: [
                    {
                      inlineData: {
                        mimeType: "application/pdf",
                        data: inlineData.data.replace(/\s+/g, ""),
                      },
                    },
                    { text: prompt },
                  ],
                },
              ];

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(9000), // 9s timeout to keep it responsive
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1500,
                responseMimeType: "application/json",
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
              const parsed = JSON.parse(cleaned);
              if (
                parsed &&
                ((Array.isArray(parsed.conditions) && parsed.conditions.length > 0) ||
                  (Array.isArray(parsed.familyHistory) && parsed.familyHistory.length > 0))
              ) {
                return NextResponse.json({
                  status: "ok",
                  provider: hasText ? "gemini_text" : "gemini_pdf_vision",
                  result: parsed,
                  rawText: extractedText || parsed.summary || "Parsed via Gemini Multimodal Vision.",
                });
              }
            }
          }
        } catch (modelErr) {
          console.warn(`Gemini SBAR model ${model} notice:`, modelErr);
        }
      }
    }

    // 5. If clean text was extracted, return whatever was found
    if (extractedText && extractedText.trim().length > 10) {
      return NextResponse.json({
        status: "ok",
        provider: "local_pdf_text",
        result: localParsed || { conditions: [], familyHistory: [] },
        rawText: extractedText,
      });
    }

    // 6. If zero readable text could be extracted
    return NextResponse.json(
      {
        error: "Could not read clinical text from this PDF. Please ensure the document is not password protected, or paste your report text directly into the box below.",
      },
      { status: 422 }
    );
  } catch (error: any) {
    console.error("SBAR PDF processing error:", error);
    return NextResponse.json(
      {
        error: "Could not process this PDF report. Please ensure the document is not password protected, or paste your clinical report text directly into the box below.",
        details: error?.message,
      },
      { status: 422 }
    );
  }
}

