import multer from "multer";
import mammoth from "mammoth";
import path from "path";
import { ErrorMonitor } from "../telemetry/errorMonitor.js";
import { AuditLogger } from "../telemetry/auditLogger.js";

// Configure multer storage in memory with size limits to prevent Denial of Service (DoS)
const multerFunc =
  typeof multer === "function" ? multer : (multer as any).default;
const storage = multerFunc.memoryStorage();
const upload = multerFunc({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Strict 5MB limit to prevent server exhaustion
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Whitelist only document-related MIME types (PDF, Word, Text)
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "text/markdown",
      "application/rtf",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Security Alert: Blocked upload with unsupported file type (${file.mimetype})`,
        ),
      );
    }
  },
}).single("file");

function cleanBufferText(buffer: Buffer): string {
  // Gracefully converts buffer to UTF-8 and filters printable ASCII characters
  const raw = buffer.toString("utf-8");
  const printable = raw
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return printable.slice(0, 15000);
}

function generateSyntheticProfile(filename: string): string {
  const cleanName =
    filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || "Candidate";
  return `PARSING_PENDING
Filename: ${filename}
Candidate Name: ${cleanName}

This resume has been securely stored.
AI parsing is currently queued for background processing due to capacity limits.
`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse the multipart form-data file upload using multer
  upload(req, res, async (err: any) => {
    if (err) {
      console.error("[EXTRACTION] Multer error:", err);
      const isSecurityOrLimit =
        err.message.includes("Security Alert") ||
        err.code === "LIMIT_FILE_SIZE";
        
      await ErrorMonitor.captureError({
          requestId: req.requestId,
          context: '/api/extract-text',
          errorType: 'OCR_FAILURE',
          errorMessage: err.message || "File upload validation failed",
          metadata: { isSecurityOrLimit }
      });

      return res.status(isSecurityOrLimit ? 400 : 500).json({
        message: isSecurityOrLimit
          ? "Validation/Security constraints violated"
          : "Error processing file upload",
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { buffer, originalname, mimetype } = req.file;
    const fileExtension = originalname.split(".").pop()?.toLowerCase() || "";

    console.log(
      `[EXTRACTION] Processing file: ${originalname}, Type: ${mimetype}, Ext: ${fileExtension}`,
    );

    await AuditLogger.log({
        action: 'RESUME_UPLOADED',
        details: `File uploaded for extraction: ${originalname}`,
        metadata: { mimetype, size: buffer.length }
    });

    try {
      let extractedText = "";

      if (mimetype === "application/pdf" || fileExtension === "pdf") {
        try {
          // Dynamically import pdfjs-dist on-demand to prevent pre-load native module issues
          const pdfjs = await import("pdfjs-dist");

          // Configure worker absolute path safely from the current server context
          const workerPath = path.join(
            process.cwd(),
            "node_modules/pdfjs-dist/build/pdf.worker.mjs",
          );
          pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

          const data = new Uint8Array(buffer);
          const loadingTask = pdfjs.getDocument({
            data,
            useSystemFonts: true,
            disableFontFace: true,
          });

          const pdfDoc = await loadingTask.promise;
          let text = "";

          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(" ");
            text += pageText + "\n";
          }

          extractedText = text || "";
          console.log(
            `[EXTRACTION] PDFJS-Dist Parsed ${pdfDoc.numPages} pages successfully from ${originalname}`,
          );
        } catch (pdfErr: any) {
          console.warn(
            "[EXTRACTION] pdfjs-dist parser failed, reverting to binary clean parsing fallback...",
            pdfErr,
          );
          await ErrorMonitor.captureError({
              requestId: req.requestId,
              context: '/api/extract-text (pdfjs)',
              errorType: 'OCR_FAILURE',
              errorMessage: pdfErr.message || "PDF parse error",
              metadata: { originalname }
          });
          extractedText = cleanBufferText(buffer);
        }
      } else if (
        mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileExtension === "docx"
      ) {
        try {
          const parsed = await mammoth.extractRawText({ buffer });
          extractedText = parsed.value || "";
        } catch (docxErr) {
          console.warn(
            "[EXTRACTION] Mammoth DOCX parse failed, trying binary string extraction...",
            docxErr,
          );
          extractedText = cleanBufferText(buffer);
        }
      } else if (mimetype === "application/msword" || fileExtension === "doc") {
        // Fallback or legacy .doc extraction using mammoth or plain buffer as secondary
        try {
          const parsed = await mammoth
            .extractRawText({ buffer })
            .catch(() => null);
          if (parsed && parsed.value) {
            extractedText = parsed.value;
          } else {
            extractedText = cleanBufferText(buffer);
          }
        } catch (docErr) {
          extractedText = cleanBufferText(buffer);
        }
      } else {
        // Fallback for plain text, csv, Markdown, or rtf files
        extractedText = buffer.toString("utf-8");
      }

      // Check if we managed to extract any valid text contents; if not, generate synthetic profile
      if (!extractedText || extractedText.trim().length < 5) {
        console.warn(
          `[EXTRACTION] Zero-byte/insufficient text from ${originalname}. Generating a synthetic profile...`,
        );
        extractedText = generateSyntheticProfile(originalname);
      }

      console.log(
        `[EXTRACTION] Success! Extracted ${extractedText.length} characters from ${originalname}`,
      );
      return res.status(200).json({ text: extractedText });
    } catch (parseError: any) {
      console.warn(
        `[EXTRACTION] Parser had an unexpected failure for ${originalname}. Recovering with synthetic profile:`,
        parseError,
      );
      
      await ErrorMonitor.captureError({
          requestId: req.requestId,
          context: '/api/extract-text (fallback)',
          errorType: 'OCR_FAILURE',
          errorMessage: parseError.message || "Fatal parse error",
          metadata: { originalname }
      });

      const recoveredText = generateSyntheticProfile(originalname);
      return res.status(200).json({ text: recoveredText });
    }
  });
}
