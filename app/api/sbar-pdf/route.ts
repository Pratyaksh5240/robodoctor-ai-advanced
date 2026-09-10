import { NextRequest, NextResponse } from "next/server";
import { generateStructuredJson } from "@/lib/ai-health-assistant/googleAiClient";
import { dataUrlToInlineData } from "@/lib/ai-health-assistant/media";
import { parseSbarFileContent, ParsedSbarResult } from "@/lib/sbarImport";
import zlib from "zlib";

export const runtime = "nodejs";

/**
 * 100% Offline, zero-crash stream & operator text extractor for PDFs.
 * Parses TJ arrays, Tj single strings, ' and " operators, and decompresses Flate streams.
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
        if (line.trim().length > 1) {
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
        if (decoded.trim().length > 1) {
          extractedChunks.push(decoded.trim());
        }
      }
    };

    // Scan uncompressed streams
    parseTextOperators(raw);

    // Decompress Flate streams
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
        if (decompressed) {
          parseTextOperators(decompressed);
        }
      }
    }

    return extractedChunks.join("\n");
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

    // Auto-detect plain text or JSON uploaded as PDF
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
        // Continue to regular extraction
      }
    }

    // 1. Primary Offline Stream & Flate Text Extractor (100% offline, zero worker dependency, zero crashes)
    let extractedText = extractTextFromPdfBuffer(pdfBuffer);

    // 2. Secondary: If extracted text is short, try pdf-parse in isolated try/catch
    if (!extractedText || extractedText.trim().length < 15) {
      try {
        // @ts-ignore
        const { PDFParse } = await import("pdf-parse").catch(() => ({ PDFParse: null }));
        if (PDFParse) {
          const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
          const textResult = await parser.getText().catch(() => null);
          await parser.destroy().catch(() => {});
          const candidateText = typeof textResult === "string" ? textResult : textResult?.text || "";
          if (candidateText && candidateText.trim().length > extractedText.trim().length) {
            extractedText = candidateText;
          }
        }
      } catch (pdfParseErr) {
        console.warn("Secondary PDFParse notice:", pdfParseErr);
      }
    }

    // If text was extracted, parse SBAR clinical structure
    let localParsed: ParsedSbarResult | null = null;
    if (extractedText && extractedText.trim().length > 10) {
      try {
        localParsed = parseSbarFileContent(extractedText);
      } catch (parseErr) {
        console.warn("SBAR content parsing error:", parseErr);
      }
    }

    // If conditions or family members were detected, return immediately!
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

    // 3. Optional Gemini AI Cloud Parser (if configured)
    if (process.env.GEMINI_API_KEY) {
      try {
        const hasText = extractedText && extractedText.trim().length > 20;
        const prompt = hasText
          ? `Extract all chronic conditions and family medical history from this SBAR text into JSON:
${extractedText.slice(0, 6000)}

JSON Schema:
{
  "conditions": [{"name": string, "diagnosedDate": string, "status": "active" | "managed", "notes": string, "medications": [{"medicineName": string, "dosage": string, "reasonForChange": string}]}],
  "familyHistory": [{"relation": string, "condition": string, "ageOfOnset": number | null, "notes": string}]
}`
          : `Extract all chronic conditions and family medical history from this SBAR PDF into JSON:
{
  "conditions": [{"name": string, "diagnosedDate": string, "status": "active" | "managed", "notes": string, "medications": [{"medicineName": string, "dosage": string, "reasonForChange": string}]}],
  "familyHistory": [{"relation": string, "condition": string, "ageOfOnset": number | null, "notes": string}]
}`;

        const messages = hasText
          ? [
              {
                role: "user" as const,
                parts: [{ kind: "text" as const, text: prompt }],
              },
            ]
          : [
              {
                role: "user" as const,
                parts: [
                  {
                    kind: "inlineData" as const,
                    mimeType: "application/pdf",
                    data: inlineData.data.replace(/\s+/g, ""),
                  },
                  {
                    kind: "text" as const,
                    text: prompt,
                  },
                ],
              },
            ];

        // Guarded promise with catch to prevent any unhandled rejection
        const aiPromise = generateStructuredJson<ParsedSbarResult>({
          systemInstruction: "You extract structured clinical SBAR data. Return strict JSON only.",
          messages,
        }).catch((err) => {
          console.warn("Gemini SBAR call notice:", err?.message || err);
          return { data: null };
        });

        const timeoutPromise = new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 8000)
        );

        const { data } = await Promise.race([aiPromise, timeoutPromise]);

        if (
          data &&
          ((data.conditions && data.conditions.length > 0) ||
            (data.familyHistory && data.familyHistory.length > 0))
        ) {
          return NextResponse.json({
            status: "ok",
            provider: hasText ? "gemini_text_fast" : "gemini_pdf",
            result: data,
            rawText: extractedText,
          });
        }
      } catch (geminiError) {
        console.warn("Gemini PDF parsing skipped or unavailable:", geminiError);
      }
    }

    // If text was extracted, return whatever was found along with the raw text so user can review
    if (extractedText && extractedText.trim().length > 10) {
      return NextResponse.json({
        status: "ok",
        provider: "local_pdf_text",
        result: localParsed || { conditions: [], familyHistory: [] },
        rawText: extractedText,
      });
    }

    // If zero text could be extracted, it is a scanned image-only PDF
    return NextResponse.json(
      {
        error: "This PDF contains scanned images or raster graphics with no selectable text. Please upload a PDF with digital text, or copy and paste the report text into the box below.",
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

