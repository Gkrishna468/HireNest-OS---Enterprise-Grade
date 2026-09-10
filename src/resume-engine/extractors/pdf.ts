/**
 * HireNestOS Deterministic PDF Extractor
 * Uses pdfjs-dist legacy build for native text extraction with automatic fallback to JPEG-carving page OCR.
 */

import { ExtractionMethod } from "../types.js";

// Polyfill DOMMatrix for Node.js environments when running pdfjs-dist
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length >= 6) {
        this.a = this.m11 = Number(init[0]) || 0;
        this.b = this.m12 = Number(init[1]) || 0;
        this.c = this.m21 = Number(init[2]) || 0;
        this.d = this.m22 = Number(init[3]) || 0;
        this.e = this.m41 = Number(init[4]) || 0;
        this.f = this.m42 = Number(init[5]) || 0;
        this.isIdentity = (this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0);
      }
    }
    multiply(other: any) { return this; }
    translate(tx = 0, ty = 0) { return this; }
    scale(sx = 1, sy = sx) { return this; }
    rotate(angle = 0) { return this; }
    transformPoint(point: any) { return point; }
    inverse() { return this; }
  };
}

export interface PDFExtractionResult {
  text: string;
  method: ExtractionMethod;
  ocrUsed: boolean;
  pages: number;
  confidence: number;
}

async function extractEmbeddedJpegsFromPDF(buffer: Buffer): Promise<string> {
  let ocrCombinedText = "";
  try {
    const { performOCR } = await import("./ocr.js");
    let pos = 0;
    const jpegs: Buffer[] = [];
    while (pos < buffer.length - 2) {
      // Find SOI (Start of Image)
      if (buffer[pos] === 0xFF && buffer[pos+1] === 0xD8 && buffer[pos+2] === 0xFF) {
        const start = pos;
        let end = -1;
        // Search for EOI (End of Image)
        for (let i = start + 2; i < buffer.length - 1; i++) {
          if (buffer[i] === 0xFF && buffer[i+1] === 0xD9) {
            end = i + 2;
            break;
          }
        }
        if (end !== -1 && (end - start) > 10240) { // minimum 10KB to ignore tiny embedded vector shapes
          jpegs.push(buffer.subarray(start, end));
          pos = end;
          if (jpegs.length >= 5) break; // limit to 5 images max
        } else {
          pos++;
        }
      } else {
        pos++;
      }
    }

    for (let i = 0; i < jpegs.length; i++) {
      console.log(`[PDF_EXTRACTOR] Performing OCR on carved JPEG image ${i+1}/${jpegs.length}...`);
      const res = await performOCR(jpegs[i]);
      if (res.text && res.text.trim().length > 10) {
        ocrCombinedText += res.text + "\n";
      }
    }
  } catch (err: any) {
    console.warn("[PDF_EXTRACTOR] JPEG-carving OCR failed:", err?.message || err);
  }
  return ocrCombinedText.trim();
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  let rawText = "";
  let pageCount = 1;
  let ocrUsed = false;
  let method: ExtractionMethod = "PDF_TEXT";
  let confidence = 0.95;

  try {
    // Dynamically import legacy entry point of pdfjs-dist to prevent DOMMatrix/canvas errors
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    } as any);

    const pdfDocument = await loadingTask.promise;
    pageCount = pdfDocument.numPages;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || "")
        .join(" ");
      pageTexts.push(pageText);
    }

    rawText = pageTexts.join("\n").trim();
  } catch (pdfErr: any) {
    console.warn("[PDF_EXTRACTOR] Primary pdfjs-dist legacy failed:", pdfErr?.message || pdfErr);
  }

  // Fallback to embedded JPEG carving OCR when text is empty/sparse (scanned PDFs)
  if (!rawText || rawText.length < 40) {
    console.log(`[PDF_EXTRACTOR] Sparse native text extracted (${rawText.length} chars). Running JPEG-carving OCR fallback...`);
    const carvedOcrText = await extractEmbeddedJpegsFromPDF(buffer);
    if (carvedOcrText && carvedOcrText.length > rawText.length) {
      rawText = carvedOcrText;
      ocrUsed = true;
      method = "IMAGE_OCR";
      confidence = 0.85;
    }
  }

  // Final absolute fallback: strip non-printable ASCII
  if (!rawText || rawText.length < 5) {
    const raw = buffer.toString("utf-8");
    const printable = raw
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n")
      .trim();
    if (printable.length >= 20) {
      rawText = printable.slice(0, 15000);
      method = "TEXT_UTF8";
      confidence = 0.4;
    }
  }

  return {
    text: rawText,
    method,
    ocrUsed,
    pages: pageCount,
    confidence,
  };
}
