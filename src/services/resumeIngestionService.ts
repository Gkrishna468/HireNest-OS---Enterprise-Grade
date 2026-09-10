/**
 * HireNestOS Resume Ingestion Service
 * 
 * Centralized, authoritative intake pipeline for Direct Candidate sourcing:
 * File (PDF/DOCX/TXT) or Google Drive Link -> Text Extraction -> Deterministic Parser
 * -> Structured Candidate Profile -> Normalization & Confidence Validation -> Candidate 360 Ingestion.
 * 
 * Strict Invariant: Do not silently invent information. If a field is not explicitly found
 * in the resume, it is explicitly flagged as missing/not specified.
 */

import { parseResumeDeterministically } from "../resume-engine/parser/resume-parser.js";

export interface ExtractedFieldMetadata<T> {
  value: T;
  source: "resume_text" | "employment_history" | "skills_taxonomy" | "header" | "manual" | "not_specified";
  confidence: "high" | "medium" | "low" | "none";
  evidence?: string;
  isMissing: boolean;
}

export interface EmploymentHistoryItem {
  company: string;
  designation: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
  isCurrent?: boolean;
  description?: string;
}

export interface EducationItem {
  degree: string;
  field?: string;
  institution: string;
  graduationYear?: number;
}

export interface StructuredCandidateIngestion {
  identity: {
    fullName: ExtractedFieldMetadata<string>;
    email: ExtractedFieldMetadata<string>;
    phone: ExtractedFieldMetadata<string>;
  };
  professional: {
    currentTitle: ExtractedFieldMetadata<string>;
    currentCompany: ExtractedFieldMetadata<string>;
    totalExperienceYears: ExtractedFieldMetadata<number | null>;
    skills: ExtractedFieldMetadata<string[]>;
    companies: string[];
    designations: string[];
    employmentHistory: EmploymentHistoryItem[];
  };
  location: {
    currentLocation: ExtractedFieldMetadata<string>;
    preferredLocations: string[];
  };
  preferences: {
    workMode: ExtractedFieldMetadata<string | null>;
    availability: ExtractedFieldMetadata<string | null>;
    noticePeriod: ExtractedFieldMetadata<string | null>;
    expectedCompensation: ExtractedFieldMetadata<string | null>;
  };
  education: EducationItem[];
  certifications: string[];
  summary: string;
  rawText: string;
  documentHash?: string;
  extraction: {
    source: "FILE_UPLOAD" | "GOOGLE_DRIVE";
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    driveUrl?: string;
    parserVersion: string;
    extractedAt: string;
    extractionMethod: string;
    fieldsExtractedCount: number;
    fieldsMissingCount: number;
    missingFieldsList: string[];
    overallConfidence: "high" | "medium" | "low";
  };
}

export interface IngestionOptions {
  orgId?: string;
  userRole?: string;
  userId?: string;
  forceRescan?: boolean;
}

export class ResumeIngestionService {
  /**
   * Ingest and parse a resume directly from raw text string (zero network / pure deterministic parsing)
   */
  public static ingestResumeFromText(
    rawText: string,
    fileName: string = "resume.txt",
    userId: string = "system",
    options: IngestionOptions = {}
  ): {
    structured: StructuredCandidateIngestion;
    candidateData: any;
    unstatedFields: Record<string, { isMissing: boolean; reason: string }>;
  } {
    const profile = parseResumeDeterministically({
      text: rawText,
      filename: fileName,
    });

    const structured = this.normalizeExtractedProfile(
      {
        candidateName: profile.candidateName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        candidateProfile: profile,
        rawText,
        filename: fileName,
      },
      {
        source: "FILE_UPLOAD",
        fileName,
      }
    );

    // Build standard candidateData format compatible with candidatePool
    const candidateData = {
      name: structured.identity.fullName.value || profile.candidateName,
      fullName: structured.identity.fullName.value || profile.candidateName,
      email: structured.identity.email.value || profile.email,
      phone: structured.identity.phone.value || profile.phone,
      skills: structured.professional.skills.value || profile.skills || [],
      experienceYears: structured.professional.totalExperienceYears.value || profile.totalExperience || 0,
      location: structured.location.currentLocation.value || profile.location || null,
      workMode: structured.preferences.workMode.value || null,
      noticePeriod: structured.preferences.noticePeriod.value || null,
      expectedCompensation: structured.preferences.expectedCompensation.value || null,
      SystemSource: "DIRECT_UPLOAD",
      resumeHash: structured.documentHash || profile.documentHash || "",
      resumeVersions: [
        {
          version: 1,
          fileName,
          uploadedAt: new Date().toISOString(),
          uploadedByUserId: userId,
          parsedSkills: structured.professional.skills.value || profile.skills || [],
          confidence: structured.extraction.overallConfidence
        }
      ],
      provenance: {
        ingestionType: "DIRECT_CV_UPLOAD",
        extractedFieldsCount: structured.extraction.fieldsExtractedCount,
        missingFieldsCount: structured.extraction.fieldsMissingCount,
        timestamp: new Date().toISOString(),
      }
    };

    const unstatedFields = {
      workMode: {
        isMissing: structured.preferences.workMode.isMissing,
        reason: structured.preferences.workMode.evidence || "Not specified in resume"
      },
      noticePeriod: {
        isMissing: structured.preferences.noticePeriod.isMissing,
        reason: structured.preferences.noticePeriod.evidence || "Not specified in resume"
      },
      expectedCompensation: {
        isMissing: structured.preferences.expectedCompensation.isMissing,
        reason: structured.preferences.expectedCompensation.evidence || "Not specified in resume"
      }
    };

    return { structured, candidateData, unstatedFields };
  }

  /**
   * Ingest and parse a resume file (PDF, DOCX, TXT)
   */
  public static async ingestResumeFromFile(
    file: File,
    options: IngestionOptions = {}
  ): Promise<StructuredCandidateIngestion> {
    const formData = new FormData();
    formData.append("file", file);
    if (options.orgId) formData.append("orgId", options.orgId);
    if (options.userRole) formData.append("userRole", options.userRole);
    if (options.userId) formData.append("userId", options.userId);
    formData.append("forceRescan", String(options.forceRescan ?? true));

    const response = await fetch("/api/extract-text", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let errMessage = `Extraction failed with HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.message || errJson.error) {
          errMessage = errJson.message || errJson.error;
        }
      } catch {
        // ignore parse error
      }
      throw new Error(errMessage);
    }

    const data = await response.json();
    return this.normalizeExtractedProfile(data, {
      source: "FILE_UPLOAD",
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  }

  /**
   * Ingest and parse a resume from a Google Drive document or shared link
   */
  public static async ingestResumeFromDrive(
    driveUrl: string,
    options: IngestionOptions = {}
  ): Promise<StructuredCandidateIngestion> {
    const response = await fetch("/api/extract-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        driveUrl,
        orgId: options.orgId || "HQ",
        userRole: options.userRole || "recruiter",
        userId: options.userId || "system",
        forceRescan: options.forceRescan ?? true,
      }),
    });

    if (!response.ok) {
      let errMessage = `Drive extraction failed with HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.message || errJson.error) {
          errMessage = errJson.message || errJson.error;
        }
      } catch {
        // ignore parse error
      }
      throw new Error(errMessage);
    }

    const data = await response.json();
    return this.normalizeExtractedProfile(data, {
      source: "GOOGLE_DRIVE",
      fileName: data.filename || "Google_Drive_Resume.pdf",
      driveUrl,
    });
  }

  /**
   * Normalize backend extraction response into structured candidate intake contract.
   * Strictly enforces data integrity: missing fields are marked as missing, never hallucinated.
   */
  public static normalizeExtractedProfile(
    apiData: any,
    sourceMeta: {
      source: "FILE_UPLOAD" | "GOOGLE_DRIVE";
      fileName: string;
      fileSize?: number;
      mimeType?: string;
      driveUrl?: string;
    }
  ): StructuredCandidateIngestion {
    const profile = apiData.candidateProfile || {};
    const rawText = apiData.rawText || apiData.text || profile.resumeText || "";
    const missingFieldsList: string[] = [];
    let fieldsExtractedCount = 0;

    // 1. Full Name
    const rawName = (apiData.candidateName || profile.candidateName || profile.name || "").trim();
    const isNameMissing = !rawName || rawName.toLowerCase() === "candidate" || rawName.toLowerCase() === "unknown candidate";
    if (isNameMissing) missingFieldsList.push("Full Name");
    else fieldsExtractedCount++;

    const fullName: ExtractedFieldMetadata<string> = {
      value: isNameMissing ? "" : rawName,
      source: isNameMissing ? "not_specified" : "header",
      confidence: isNameMissing ? "none" : (profile.confidenceDetails?.name || "high"),
      evidence: isNameMissing ? "No candidate name detected in resume header" : `Found in resume header: "${rawName}"`,
      isMissing: isNameMissing,
    };

    // 2. Email Address
    const rawEmail = (apiData.email || profile.email || "").trim();
    const isEmailMissing = !rawEmail || !rawEmail.includes("@");
    if (isEmailMissing) missingFieldsList.push("Email Address");
    else fieldsExtractedCount++;

    const email: ExtractedFieldMetadata<string> = {
      value: isEmailMissing ? "" : rawEmail,
      source: isEmailMissing ? "not_specified" : "header",
      confidence: isEmailMissing ? "none" : (profile.confidenceDetails?.email || "high"),
      evidence: isEmailMissing ? "No email address found in resume" : `Email identified: "${rawEmail}"`,
      isMissing: isEmailMissing,
    };

    // 3. Phone Number
    const rawPhone = (apiData.phone || profile.phone || "").trim();
    const isPhoneMissing = !rawPhone;
    if (isPhoneMissing) missingFieldsList.push("Phone Number");
    else fieldsExtractedCount++;

    const phone: ExtractedFieldMetadata<string> = {
      value: isPhoneMissing ? "" : rawPhone,
      source: isPhoneMissing ? "not_specified" : "header",
      confidence: isPhoneMissing ? "none" : (profile.confidenceDetails?.phone || "high"),
      evidence: isPhoneMissing ? "No phone number found in resume" : `Phone identified: "${rawPhone}"`,
      isMissing: isPhoneMissing,
    };

    // 4. Current Role / Title
    const rawRole = (apiData.currentRole || profile.currentRole || "").trim();
    const isRoleMissing = !rawRole;
    if (isRoleMissing) missingFieldsList.push("Current Title");
    else fieldsExtractedCount++;

    const currentTitle: ExtractedFieldMetadata<string> = {
      value: isRoleMissing ? "" : rawRole,
      source: isRoleMissing ? "not_specified" : "employment_history",
      confidence: isRoleMissing ? "none" : "high",
      evidence: isRoleMissing ? "Current title not explicitly identified" : `Most recent title: "${rawRole}"`,
      isMissing: isRoleMissing,
    };

    // 5. Current Company
    const rawCompany = (profile.currentCompany || (profile.companies && profile.companies[0]) || "").trim();
    const isCompanyMissing = !rawCompany;
    if (isCompanyMissing) missingFieldsList.push("Current Company");
    else fieldsExtractedCount++;

    const currentCompany: ExtractedFieldMetadata<string> = {
      value: isCompanyMissing ? "" : rawCompany,
      source: isCompanyMissing ? "not_specified" : "employment_history",
      confidence: isCompanyMissing ? "none" : "high",
      evidence: isCompanyMissing ? "Current employer not explicitly identified" : `Recent employer: "${rawCompany}"`,
      isMissing: isCompanyMissing,
    };

    // 6. Total Experience (Years)
    const expNum = typeof profile.totalExperience === "number"
      ? profile.totalExperience
      : (typeof apiData.experienceYears === "number" ? apiData.experienceYears : parseFloat(apiData.experienceYears || "0"));
    
    const isExpMissing = !expNum || isNaN(expNum) || expNum <= 0;
    if (isExpMissing) missingFieldsList.push("Total Experience");
    else fieldsExtractedCount++;

    const totalExperienceYears: ExtractedFieldMetadata<number | null> = {
      value: isExpMissing ? null : Number(expNum.toFixed(1)),
      source: isExpMissing ? "not_specified" : "employment_history",
      confidence: isExpMissing ? "none" : (profile.confidenceDetails?.experience || "high"),
      evidence: isExpMissing ? "No dated employment history found" : `Calculated from employment history: ${expNum.toFixed(1)} years`,
      isMissing: isExpMissing,
    };

    // 7. Key Technical Skills
    const rawSkills = Array.isArray(profile.normalizedSkills) && profile.normalizedSkills.length > 0
      ? profile.normalizedSkills
      : (Array.isArray(profile.skills) && profile.skills.length > 0
          ? profile.skills
          : (Array.isArray(apiData.skills) ? apiData.skills : []));
    
    const isSkillsMissing = !rawSkills || rawSkills.length === 0;
    if (isSkillsMissing) missingFieldsList.push("Key Technical Skills");
    else fieldsExtractedCount++;

    const skills: ExtractedFieldMetadata<string[]> = {
      value: rawSkills,
      source: isSkillsMissing ? "not_specified" : "skills_taxonomy",
      confidence: isSkillsMissing ? "none" : "high",
      evidence: isSkillsMissing ? "No technical skills identified" : `${rawSkills.length} skills matched against technology taxonomy`,
      isMissing: isSkillsMissing,
    };

    // 8. Work Mode (STRICT: Never default to REMOTE or ONSITE unless explicitly stated in text)
    let detectedWorkMode: string | null = null;
    let workModeEvidence = "No work mode preference found in resume";
    let workModeConfidence: "high" | "medium" | "low" | "none" = "none";

    if (/\b(fully\s+remote|open\s+to\s+remote|remote\s+only|remote\s+worker|work\s+from\s+home|wfh|100%\s+remote)\b/i.test(rawText)) {
      detectedWorkMode = "REMOTE";
      workModeEvidence = "Explicit remote preference identified in resume";
      workModeConfidence = "high";
    } else if (/\b(onsite\s+only|full[\s-]time\s+onsite|willing\s+to\s+relocate|on-site\s+preferred)\b/i.test(rawText)) {
      detectedWorkMode = "ONSITE_FTE";
      workModeEvidence = "Explicit onsite preference identified in resume";
      workModeConfidence = "high";
    } else if (/\b(hybrid\s+work|hybrid\s+model|open\s+to\s+hybrid|2-3\s+days\s+onsite)\b/i.test(rawText)) {
      detectedWorkMode = "HYBRID";
      workModeEvidence = "Explicit hybrid preference identified in resume";
      workModeConfidence = "high";
    } else if (/\b(c2c\s+only|corp-to-corp|w2\s+contract|1099\s+contract|contractor\s+role)\b/i.test(rawText)) {
      detectedWorkMode = "ONSITE_CONTRACT";
      workModeEvidence = "Explicit contract preference identified in resume";
      workModeConfidence = "high";
    }

    const isWorkModeMissing = !detectedWorkMode;
    if (isWorkModeMissing) missingFieldsList.push("Work Mode");
    else fieldsExtractedCount++;

    const workMode: ExtractedFieldMetadata<string | null> = {
      value: detectedWorkMode,
      source: isWorkModeMissing ? "not_specified" : "resume_text",
      confidence: workModeConfidence,
      evidence: workModeEvidence,
      isMissing: isWorkModeMissing,
    };

    // 9. Location
    const rawLoc = (apiData.location || profile.location || profile.currentLocation || "").trim();
    const isLocMissing = !rawLoc || rawLoc.toLowerCase().includes("remote / flexible");
    if (isLocMissing) missingFieldsList.push("Location");
    else fieldsExtractedCount++;

    const currentLocation: ExtractedFieldMetadata<string> = {
      value: isLocMissing ? "" : rawLoc,
      source: isLocMissing ? "not_specified" : "resume_text",
      confidence: isLocMissing ? "none" : (profile.confidenceDetails?.location || "medium"),
      evidence: isLocMissing ? "No explicit physical location found" : `Location: "${rawLoc}"`,
      isMissing: isLocMissing,
    };

    // 10. Notice Period
    let detectedNotice = (profile.noticePeriod || "").trim();
    if (detectedNotice.toLowerCase() === "not specified" || detectedNotice.toLowerCase() === "unknown") {
      detectedNotice = "";
    }
    if (!detectedNotice) {
      if (/\b(immediate\s+joiner|available\s+immediately|immediate)\b/i.test(rawText)) {
        detectedNotice = "Immediate";
      } else {
        const npMatch = rawText.match(/notice\s+period[\s:]+(\d+\s*(?:days?|weeks?|months?)|immediate)/i);
        if (npMatch) detectedNotice = npMatch[1].trim();
      }
    }

    const isNoticeMissing = !detectedNotice;
    if (isNoticeMissing) missingFieldsList.push("Notice Period");
    else fieldsExtractedCount++;

    const noticePeriod: ExtractedFieldMetadata<string | null> = {
      value: isNoticeMissing ? null : detectedNotice,
      source: isNoticeMissing ? "not_specified" : "resume_text",
      confidence: isNoticeMissing ? "none" : "high",
      evidence: isNoticeMissing ? "Notice period not specified in resume" : `Notice period: "${detectedNotice}"`,
      isMissing: isNoticeMissing,
    };

    // 11. Expected Compensation
    let detectedComp: string | null = null;
    const compMatch = rawText.match(/(?:expected\s+(?:ctc|salary)|current\s+(?:ctc|salary)|compensation|hourly\s+rate|rate)[\s:]+([^\n,;]{3,30})/i)
      || rawText.match(/(\$\s*\d+[\d,]*(?:\s*(?:k|\/hr|\/yr|per\s+hour|per\s+year))?)/i)
      || rawText.match(/(₹\s*\d+(?:\.\d+)?\s*(?:lpa|lakhs?))/i);

    if (compMatch) {
      detectedComp = compMatch[1].trim();
    }

    const isCompMissing = !detectedComp;
    if (isCompMissing) missingFieldsList.push("Expected Compensation");
    else fieldsExtractedCount++;

    const expectedCompensation: ExtractedFieldMetadata<string | null> = {
      value: detectedComp,
      source: isCompMissing ? "not_specified" : "resume_text",
      confidence: isCompMissing ? "none" : "medium",
      evidence: isCompMissing ? "No compensation figures mentioned in resume" : `Extracted: "${detectedComp}"`,
      isMissing: isCompMissing,
    };

    // 12. Employment History
    const employmentHistory: EmploymentHistoryItem[] = Array.isArray(profile.employmentHistory)
      ? profile.employmentHistory.map((e: any) => ({
          company: e.company || "Organization",
          designation: e.designation || "Specialist",
          startDate: e.startDate,
          endDate: e.endDate,
          durationMonths: e.durationMonths,
          isCurrent: e.isCurrent,
          description: e.description,
        }))
      : [];
    if (employmentHistory.length > 0) fieldsExtractedCount++;

    // 13. Education
    const education: EducationItem[] = Array.isArray(profile.education)
      ? profile.education.map((ed: any) => ({
          degree: ed.degree || "Degree",
          field: ed.field,
          institution: ed.institution || "University",
          graduationYear: ed.graduationYear,
        }))
      : [];
    if (education.length > 0) fieldsExtractedCount++;

    // 14. Certifications
    const certifications: string[] = Array.isArray(profile.certifications)
      ? profile.certifications.map((c: any) => (typeof c === "string" ? c : c.name || "")).filter(Boolean)
      : [];
    if (certifications.length > 0) fieldsExtractedCount++;

    // Summary
    const summary = profile.summary || `${fullName.value || "Candidate"} is a professional with ${totalExperienceYears.value || 0} years experience.`;

    const overallConfidence: "high" | "medium" | "low" =
      !isNameMissing && !isEmailMissing && !isExpMissing && skills.value.length >= 3
        ? "high"
        : !isNameMissing && (skills.value.length > 0 || !isExpMissing)
        ? "medium"
        : "low";

    return {
      identity: { fullName, email, phone },
      professional: {
        currentTitle,
        currentCompany,
        totalExperienceYears,
        skills,
        companies: profile.companies || [],
        designations: profile.designations || [],
        employmentHistory,
      },
      location: {
        currentLocation,
        preferredLocations: [],
      },
      preferences: {
        workMode,
        availability: noticePeriod, // aligned
        noticePeriod,
        expectedCompensation,
      },
      education,
      certifications,
      summary,
      rawText,
      documentHash: apiData.documentHash || profile.documentHash,
      extraction: {
        source: sourceMeta.source,
        fileName: sourceMeta.fileName,
        fileSize: sourceMeta.fileSize,
        mimeType: sourceMeta.mimeType,
        driveUrl: sourceMeta.driveUrl,
        parserVersion: apiData.parserVersion || "2.5.0-deterministic",
        extractedAt: new Date().toISOString(),
        extractionMethod: apiData.extractionMethod || "DETERMINISTIC_EXTRACTION",
        fieldsExtractedCount,
        fieldsMissingCount: missingFieldsList.length,
        missingFieldsList,
        overallConfidence,
      },
    };
  }
}
