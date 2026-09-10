import multer from "multer";
import { ErrorMonitor } from "../telemetry/errorMonitor.js";
import { AuditLogger } from "../telemetry/auditLogger.js";
import { ResumeProcessingPipeline } from "../../resume-engine/pipeline/ResumeProcessingPipeline.js";
import { adminDb } from "../../lib/firebase-admin.js";

// Configure multer storage in memory with size limits to prevent Denial of Service (DoS)
const multerFunc =
  typeof multer === "function" ? multer : (multer as any).default;
const storage = multerFunc.memoryStorage();
const upload = multerFunc({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Whitelist document-related MIME types and images for OCR
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/rtf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/octet-stream", // generic fallback check by extension
    ];

    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    const allowedExtensions = ["pdf", "docx", "doc", "txt", "md", "csv", "rtf", "png", "jpg", "jpeg", "webp"];

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Security Alert: Blocked upload with unsupported file type (${file.mimetype || ext})`,
        ),
      );
    }
  },
}).single("file");

function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchGoogleDriveContent(fileId: string): Promise<{ buffer?: Buffer; text?: string; filename: string; mimeType: string }> {
  // 1. First attempt: If it's a Google Doc, export as plain text
  try {
    const docExportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
    const docRes = await fetch(docExportUrl, { redirect: "follow" });
    if (docRes.ok) {
      const text = await docRes.text();
      if (text && !text.includes("<!DOCTYPE html>") && text.length > 50) {
        return { text, filename: "Google_Doc_Resume.txt", mimeType: "text/plain" };
      }
    }
  } catch {
    // Continue to binary download attempt
  }

  // 2. Second attempt: Direct file download
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(downloadUrl, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Google Drive download failed with HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const html = await res.text();
    if (html.includes("ServiceLogin") || html.includes("accounts.google.com")) {
      throw new Error("Google Drive file is private. Please set link sharing to 'Anyone with the link can view' or upload the resume file directly.");
    }
    const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
    if (confirmMatch) {
      const confirmRes = await fetch(`${downloadUrl}&confirm=${confirmMatch[1]}`, { redirect: "follow" });
      if (confirmRes.ok) {
        const arrayBuf = await confirmRes.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuf),
          filename: "Google_Drive_Resume.pdf",
          mimeType: confirmRes.headers.get("content-type") || "application/pdf"
        };
      }
    }
    throw new Error("Unable to download file from Google Drive. Please verify the link is publicly viewable, or upload the file directly.");
  }

  const arrayBuf = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuf),
    filename: "Google_Drive_Resume.pdf",
    mimeType: contentType || "application/pdf",
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const executePipeline = async (filePayload: {
    buffer?: Buffer;
    text?: string;
    originalname: string;
    mimetype: string;
    fileSize: number;
    resumeUrl?: string | null;
  }) => {
    const { originalname, mimetype, buffer, text: directText, fileSize, resumeUrl } = filePayload;
    const requestId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const forceRescan = req.query?.forceRescan === "true" || req.body?.forceRescan === "true" || req.body?.forceRescan === true;
    const orgId = req.headers?.["x-org-id"] || req.body?.orgId || "HQ";
    const userRole = req.user?.role || req.body?.userRole || "recruiter";
    const userId = req.user?.uid || req.body?.userId || "system";

    console.log(
      `[EXTRACTION] [${requestId}] Ingesting "${originalname}" (${mimetype}, ${fileSize} bytes, forceRescan: ${forceRescan})...`,
    );

    // Non-blocking Audit Logging
    try {
      await AuditLogger.log({
        action: "RESUME_UPLOADED",
        details: `File uploaded for extraction: ${originalname}`,
        metadata: { mimetype, size: fileSize, requestId, forceRescan }
      });
    } catch (auditError: any) {
      console.warn(`[EXTRACTION] [${requestId}] Audit logging failed; continuing cleanly:`, auditError?.message || auditError);
    }

    try {
      // Execute Deterministic Pipeline (Zero AI dependency)
      const pipelineResult = await ResumeProcessingPipeline.processResume({
        buffer,
        text: directText,
        filename: originalname,
        mimeType: mimetype,
        candidateId: req.body?.candidateId,
        orgId,
        userRole,
        userId,
        forceRescan,
        adminDb,
        resumeUrl: resumeUrl || req.body?.resumeUrl || null,
        resumeFileName: req.body?.resumeFileName || originalname,
      });

      if (!pipelineResult.success) {
        return res.status(422).json({
          success: false,
          message: pipelineResult.error || "Extraction process failed",
          error: pipelineResult.error,
          text: "",
          requestId,
          filename: originalname,
          status: pipelineResult.status,
          stage: pipelineResult.stage,
          extractionMethod: pipelineResult.extractionMethod,
          processingId: pipelineResult.processingId,
        });
      }

      console.log(
        `[EXTRACTION] [${requestId}] Success! Candidate: "${pipelineResult.candidateName}", Method: ${pipelineResult.extractionMethod}, Skills: ${pipelineResult.skillsFound}, Status: ${pipelineResult.status}`,
      );

      return res.status(200).json({
        success: true,
        text: pipelineResult.candidateProfile?.resumeText || "",
        rawText: pipelineResult.candidateProfile?.resumeText || "",
        requestId,
        filename: originalname,
        processingId: pipelineResult.processingId,
        ledgerId: pipelineResult.processingId,
        candidateId: pipelineResult.candidateId,
        status: pipelineResult.status,
        stage: pipelineResult.stage,
        candidateName: pipelineResult.candidateName,
        email: pipelineResult.email,
        phone: pipelineResult.phone,
        location: pipelineResult.location,
        skillsFound: pipelineResult.skillsFound,
        skills: pipelineResult.skills,
        experienceYears: pipelineResult.experienceYears,
        currentRole: pipelineResult.currentRole,
        extractionMethod: pipelineResult.extractionMethod,
        ocrUsed: pipelineResult.ocrUsed,
        textLength: pipelineResult.textLength,
        confidence: pipelineResult.ledgerEntry?.confidence || 0.95,
        parserVersion: pipelineResult.parserVersion,
        startedAt: pipelineResult.startedAt,
        completedAt: pipelineResult.completedAt,
        timeline: pipelineResult.timeline,
        requiresManualReview: pipelineResult.requiresManualReview,
        candidateProfile: pipelineResult.candidateProfile,
      });

    } catch (parseError: any) {
      console.error(
        `[EXTRACTION] [${requestId}] Extraction exception for "${originalname}":`,
        parseError?.message || parseError,
      );

      try {
        await ErrorMonitor.captureError({
          requestId,
          context: `/api/extract-text`,
          errorType: "OCR_FAILURE",
          errorMessage: parseError?.message || "Extraction process failed",
          metadata: { originalname, mimetype, fileSize, stack: parseError?.stack }
        });
      } catch {
        // Non-blocking telemetry
      }

      return res.status(422).json({
        ok: false,
        success: false,
        error: {
          code: "EXTRACTION_FAILED",
          message: parseError?.message || "Extraction process failed",
        },
        message: parseError?.message || "Document text extraction encountered an error.",
        requestId,
        filename: originalname,
      });
    }
  };

  // If request is JSON (e.g. for Google Drive URL or raw text)
  const isJson = req.headers?.["content-type"]?.includes("application/json");
  if (isJson) {
    const driveUrl = req.body?.driveUrl || req.query?.driveUrl;
    const directText = req.body?.text;

    if (driveUrl) {
      const driveId = extractDriveFileId(driveUrl);
      if (!driveId) {
        return res.status(400).json({
          success: false,
          message: "Invalid Google Drive URL. Please supply a valid link containing a document or file ID.",
          error: "Invalid Drive URL",
        });
      }

      try {
        const driveContent = await fetchGoogleDriveContent(driveId);
        return await executePipeline({
          buffer: driveContent.buffer,
          text: driveContent.text,
          originalname: driveContent.filename,
          mimetype: driveContent.mimeType,
          fileSize: driveContent.buffer ? driveContent.buffer.length : (driveContent.text?.length || 0),
          resumeUrl: driveUrl,
        });
      } catch (driveErr: any) {
        return res.status(422).json({
          success: false,
          message: driveErr.message || "Failed to retrieve document from Google Drive",
          error: driveErr.message,
        });
      }
    }

    if (directText) {
      return await executePipeline({
        text: directText,
        originalname: req.body?.filename || "Resume.txt",
        mimetype: "text/plain",
        fileSize: Buffer.byteLength(directText, "utf8"),
      });
    }

    return res.status(400).json({
      success: false,
      message: "No file, Google Drive URL, or text was provided in the request body",
      error: "Missing payload",
    });
  }

  // Handle multipart form-data
  upload(req, res, async (err: any) => {
    if (err) {
      console.error("[EXTRACTION_ERROR] Multer file upload failed:", err.message);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload validation failed",
        error: err.message,
      });
    }

    if (!req.file) {
      const driveUrl = req.body?.driveUrl || req.query?.driveUrl;
      const directText = req.body?.text;

      if (driveUrl) {
        const driveId = extractDriveFileId(driveUrl);
        if (!driveId) {
          return res.status(400).json({
            success: false,
            message: "Invalid Google Drive URL",
            error: "Invalid Drive URL",
          });
        }
        try {
          const driveContent = await fetchGoogleDriveContent(driveId);
          return await executePipeline({
            buffer: driveContent.buffer,
            text: driveContent.text,
            originalname: driveContent.filename,
            mimetype: driveContent.mimeType,
            fileSize: driveContent.buffer ? driveContent.buffer.length : (driveContent.text?.length || 0),
            resumeUrl: driveUrl,
          });
        } catch (driveErr: any) {
          return res.status(422).json({
            success: false,
            message: driveErr.message || "Failed to retrieve Google Drive document",
            error: driveErr.message,
          });
        }
      }

      if (directText) {
        return await executePipeline({
          text: directText,
          originalname: req.body?.filename || "Resume.txt",
          mimetype: "text/plain",
          fileSize: Buffer.byteLength(directText, "utf8"),
        });
      }

      return res.status(400).json({
        success: false,
        message: "No file was provided in the request body",
        error: "Missing file payload",
      });
    }

    const { originalname, mimetype, buffer, size: fileSize } = req.file;
    return await executePipeline({
      buffer,
      originalname,
      mimetype,
      fileSize,
      resumeUrl: req.body?.resumeUrl || null,
    });
  });
}
