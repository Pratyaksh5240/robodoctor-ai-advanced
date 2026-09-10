import { NextRequest, NextResponse } from "next/server";
import { generateStructuredJson } from "@/lib/ai-health-assistant/googleAiClient";
import { dataUrlToInlineData } from "@/lib/ai-health-assistant/media";
import { parseSbarFileContent, ParsedSbarResult } from "@/lib/sbarImport";
// @ts-ignore
import { PDFParse } from "pdf-parse";
import zlib from "zlib";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

export const runtime = "nodejs";

let workerConfigured = false;
function initPdfWorker() {
  if (workerConfigured) return;
  try {
    const localWorker = path.resolve(process.cwd(), "node_modules/pdf-parse/dist/worker/pdf.worker.mjs");
    if (fs.existsSync(localWorker)) {
      PDFParse.setWorker(pathToFileURL(localWorker).href);
      workerConfigured = true;
      return;
    }
  } catch (err) {
    console.warn("Local worker path resolution:", err);
  }

  try {
    PDFParse.setWorker("https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/web/pdf.worker.mjs");
    workerConfigured = true;
  } catch (err) {
    console.warn("CDN worker resolution:", err);
  }
}

/**
 * Secondary 100% offline fallback text extractor for PDFs.
 * Scans uncompressed and zlib-compressed PDF stream objects for text strings (Tj and TJ).
 */
function extractFallbackPdfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");
    const extractedChunks: string[] = [];

    // 1. Direct uncompressed text operators: (text) Tj
    const tjRegex = /\(((?:\\\(|\\\)|[^)])+)\)\s*T[jd]/g;
    let match;
    while ((match = tjRegex.exec(raw)) !== null) {
      const decoded = match[1]
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\r/g, "\r")
        .replace(/\\n/g, "\n");
      if (decoded.trim().length > 1) {
        extractedChunks.push(decoded.trim());
      }
    }

    // 2. FlateDecode compressed stream decompactor
    if (extractedChunks.length < 5) {
      const streamStartRegex = /stream[\r\n]+/g;
      let streamMatch;
      while ((streamMatch = streamStartRegex.exec(raw)) !== null) {
        const startIndex = streamMatch.index + streamMatch[0].length;
        const endIndex = raw.indexOf("endstream", startIndex);
        if (endIndex > startIndex) {
          const streamBuf = buffer.subarray(startIndex, endIndex);
          try {
            const decompressed = zlib.inflateSync(streamBuf).toString("utf-8");
            let subMatch;
            const subRegex = /\(((?:\\\(|\\\)|[^)])+)\)\s*T[jd]/g;
            while ((subMatch = subRegex.exec(decompressed)) !== null) {
              const decoded = subMatch[1]
                .replace(/\\([()\\])/g, "$1")
                .replace(/\\r/g, "\r")
                .replace(/\\n/g, "\n");
              if (decoded.trim().length > 1) {
                extractedChunks.push(decoded.trim());
              }
            }
          } catch {
            // Chunk was not a valid zlib Flate stream
          }
        }
      }
    }

    return extractedChunks.join("\n");
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { fileDataUrl?: string };

    if (!payload.fileDataUrl?.trim()) {
      return NextResponse.json(
        { error: "A base64 PDF data URL is required." },
        { status: 400 }
      );
    }

    const inlineData = dataUrlToInlineData(payload.fileDataUrl);
    const pdfBuffer = Buffer.from(inlineData.data, "base64");

    if (pdfBuffer.length < 10) {
      return NextResponse.json(
        { error: "The uploaded file is empty or corrupted." },
        { status: 400 }
      );
    }

    // 1. Primary High-Reliability Local PDF Parser (100% offline, zero external API dependencies)
    let extractedText = "";
    try {
      initPdfWorker();
      const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const textResult = await parser.getText();
      await parser.destroy().catch(() => {});
      extractedText = typeof textResult === "string" ? textResult : textResult?.text || "";
    } catch (localError) {
      console.warn("Local PDFParse error, trying secondary stream fallback:", localError);
    }

    // 2. Secondary Offline Stream Scanner (if primary parser was blocked or produced empty output)
    if (!extractedText || extractedText.trim().length < 10) {
      const fallbackText = extractFallbackPdfText(pdfBuffer);
      if (fallbackText && fallbackText.trim().length > extractedText.trim().length) {
        extractedText = fallbackText;
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

    // 3. Optional Gemini AI Cloud Parser (fast text prompt if text was extracted, or multimodal if scanned)
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
                    data: inlineData.data,
                  },
                  {
                    kind: "text" as const,
                    text: prompt,
                  },
                ],
              },
            ];

        // 8-second fast timeout promise
        const aiPromise = generateStructuredJson<ParsedSbarResult>({
          systemInstruction: "You extract structured clinical SBAR data. Return strict JSON only.",
          messages,
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
    return NextResponse.json(
      { error: error?.message || "Failed to process SBAR PDF upload." },
      { status: 500 }
    );
  }
}
