/**
 * HireNestOS Job Description Parsing Service & JD Quality Gate
 * Authoritative, deterministic extractor for comprehensive Job Descriptions.
 * Adheres strictly to the Fitment Engine v2.0 Quality Gate invariants:
 * - Never returns or tolerates placeholder strings ("Processing Pending", "Will update shortly")
 * - If JD extraction is incomplete, halts matching with MATCH STATUS: BLOCKED
 */

import { extractSkills, normalizeSkillName } from "../resume-engine/parser/skills.js";

export interface StructuredJobDescription {
  role: string;
  skills: string[];
  mandatorySkills: string[];
  preferredSkills: string[];
  secondarySkills?: string[];
  experience: {
    minimumYears: number;
    maximumYears?: number;
    raw?: string;
  };
  minExperience?: number;
  architecture: string[];
  scaleRequirements: string[];
  operational: {
    workMode: "Remote" | "Hybrid" | "Onsite" | string;
    schedule: string;
    estOverlap: boolean;
  };
  certifications: string[];
  complete: boolean;
  status: "COMPLETE" | "INCOMPLETE";
  rawText?: string;
  extractedAt: string;
}

export class JdParsingService {
  /**
   * JD Quality Gate:
   * Validates whether a requirement document or parsed JD is complete and ready for scoring.
   * If it contains placeholder strings or empty skills, flags it as INCOMPLETE.
   */
  public static isJdExtractionIncomplete(reqOrJd: any): { incomplete: boolean; reason?: string; placeholderTokens?: string[] } {
    if (!reqOrJd) {
      return { incomplete: true, reason: "Requirement record is missing or empty." };
    }

    const skills: string[] = Array.isArray(reqOrJd.skills) ? reqOrJd.skills.map((s: any) => String(s).trim()) : [];
    const mandatorySkills: string[] = Array.isArray(reqOrJd.mandatorySkills) ? reqOrJd.mandatorySkills.map((s: any) => String(s).trim()) : [];
    const combined = [...skills, ...mandatorySkills];

    // Explicit placeholder string check
    const placeholderPatterns = [
      /processing\s*pending/i,
      /will\s*update\s*shortly/i,
      /extraction\s*in\s*progress/i,
      /pending\s*extraction/i,
      /to\s*be\s*updated/i,
      /^pending$/i,
      /^tbd$/i,
    ];

    const matchedPlaceholders = combined.filter(skill => 
      placeholderPatterns.some(pattern => pattern.test(skill))
    );

    if (matchedPlaceholders.length > 0) {
      return {
        incomplete: true,
        reason: "Required JD skill extraction incomplete (contains unparsed placeholder strings 'Processing Pending' or 'Will update shortly').",
        placeholderTokens: matchedPlaceholders,
      };
    }

    // Must have at least 1 extracted skill
    if (combined.length === 0) {
      return {
        incomplete: true,
        reason: "Requirement contains 0 extracted technical skills. Extraction incomplete.",
      };
    }

    // Check status flag if explicitly set
    if (reqOrJd.jdExtraction?.complete === false || reqOrJd.jdExtraction?.status === "INCOMPLETE") {
      return {
        incomplete: true,
        reason: "Requirement metadata marks extraction as INCOMPLETE.",
      };
    }

    return { incomplete: false };
  }

  /**
   * Deterministic Role Extraction with specialized focus on modern architectures
   */
  public static extractRole(text: string): string {
    const rolesPriority = [
      "Microsoft Fabric Architect",
      "Fabric Data Architect",
      "Lead Microsoft Fabric Architect",
      "Cloud Data Architect",
      "Principal Data Architect",
      "Data Architect",
      "Senior Microsoft Fabric Engineer",
      "Fabric Data Engineer",
      "Lead Data Engineer",
      "Senior Data Engineer",
      "Data Engineer",
      "Azure Data Engineer",
      "Full Stack Engineer",
      "Full Stack Developer",
      "Senior Software Engineer",
      "Software Engineer",
      "DevOps Architect",
      "Cloud Architect",
      "Technical Lead",
    ];

    const lowerText = text.toLowerCase();
    for (const r of rolesPriority) {
      if (lowerText.includes(r.toLowerCase())) {
        return r;
      }
    }

    // Heuristic: Check the first 3 lines
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 3 && l.length < 70);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^(job description|role|title|position):?\s*/i, "").trim();
      if (firstLine.length > 3 && !firstLine.includes("http")) {
        return firstLine;
      }
    }

    return "Technical Specialist";
  }

  /**
   * Deterministic Experience Extraction
   */
  public static extractExperience(text: string): { minimumYears: number; maximumYears?: number; raw: string } {
    const expRegexes = [
      /(?:min(?:imum)?|at least)\s*(\d{1,2})\+?\s*(?:years?|yrs?)/i,
      /(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\+?\s*(?:years?|yrs?)/i,
      /(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant|overall|total|experience)?/i,
    ];

    for (const re of expRegexes) {
      const m = text.match(re);
      if (m) {
        if (m[2] && !isNaN(parseInt(m[2], 10))) {
          return {
            minimumYears: parseInt(m[1], 10),
            maximumYears: parseInt(m[2], 10),
            raw: m[0],
          };
        }
        return {
          minimumYears: parseInt(m[1], 10),
          raw: m[0],
        };
      }
    }

    return { minimumYears: 0, raw: "Not specified" };
  }

  /**
   * Extract Architectural Focus Areas
   */
  public static extractArchitecture(text: string): string[] {
    const architectureCategories = [
      { label: "Lakehouse vs Warehouse", pattern: /lakehouse\s*(?:vs|\/|and)\s*warehouse|lakehouse\s*architecture|fabric\s*lakehouse/i },
      { label: "Partitioning Strategy", pattern: /partitioning\s*strategy|data\s*partitioning|table\s*partitioning|v-order/i },
      { label: "Pipeline Architecture", pattern: /pipeline\s*architecture|data\s*pipeline\s*design|scheduled\s*pipelines|orchestration/i },
      { label: "Direct Lake Mode", pattern: /direct\s*lake|directlake/i },
      { label: "Capacity Management & CU Optimization", pattern: /capacity\s*management|cu\s*optimization|capacity\s*units|f\s*sku/i },
      { label: "Medallion Architecture", pattern: /medallion\s*architecture|bronze\s*silver\s*gold/i },
      { label: "Data Modeling", pattern: /dimensional\s*modeling|star\s*schema|snowflake\s*schema|data\s*modeling/i },
    ];

    const found: string[] = [];
    for (const item of architectureCategories) {
      if (item.pattern.test(text)) {
        found.push(item.label);
      }
    }

    return found;
  }

  /**
   * Extract Scale & Complexity Indicators
   */
  public static extractScale(text: string): string[] {
    const scalePatterns = [
      { label: "1000+ Databases / Large Scale Multi-Database", pattern: /1000\+?\s*(?:databases?|dbs?)|thousands\s*of\s*databases?|multi-database\s*scale/i },
      { label: "Petabyte / High Throughput Ingestion", pattern: /petabyte|terabytes?|high\s*throughput|large-scale\s*ingestion/i },
      { label: "Enterprise Multi-Tenant / Cross-Workspace", pattern: /multi-tenant|cross-workspace|enterprise-scale/i },
    ];

    const found: string[] = [];
    for (const item of scalePatterns) {
      if (item.pattern.test(text)) {
        found.push(item.label);
      }
    }

    return found;
  }

  /**
   * Extract Operational & Schedule Constraints
   */
  public static extractOperational(text: string): { workMode: "Remote" | "Hybrid" | "Onsite"; schedule: string; estOverlap: boolean } {
    let workMode: "Remote" | "Hybrid" | "Onsite" = "Remote";
    if (/hybrid/i.test(text)) workMode = "Hybrid";
    else if (/onsite|on-site|in-office/i.test(text)) workMode = "Onsite";
    else if (/remote/i.test(text)) workMode = "Remote";

    let schedule = "Standard";
    if (/11\s*(?:am|a\.m\.)\s*(?:-|to)\s*8\s*(?:pm|p\.m\.)\s*ist/i.test(text)) {
      schedule = "11:00 AM – 8:00 PM IST";
    } else if (/ist/i.test(text) && /\d+\s*(?:am|pm)/i.test(text)) {
      schedule = "IST Working Hours";
    }

    const estOverlap = /est\s*overlap|us\s*overlap|eastern\s*(?:time|overlap)/i.test(text);

    return { workMode, schedule, estOverlap };
  }

  /**
   * Extract Certifications
   */
  public static extractCertifications(text: string): string[] {
    const certPatterns = [
      { label: "Microsoft Fabric Certification (DP-600)", pattern: /dp-600|fabric\s*certification|microsoft\s*certified\s*fabric/i },
      { label: "Azure Data Engineer (DP-203)", pattern: /dp-203|azure\s*data\s*engineer/i },
      { label: "Databricks Certified Data Engineer", pattern: /databricks\s*certified/i },
      { label: "AWS Certified Data Analytics / Solutions Architect", pattern: /aws\s*certified/i },
    ];

    const found: string[] = [];
    for (const c of certPatterns) {
      if (c.pattern.test(text)) {
        found.push(c.label);
      }
    }
    return found;
  }

  /**
   * Complete, End-to-End Structured Job Description Extractor
   */
  public static parseJdComplete(jdText: string, fallbackRole?: string): StructuredJobDescription {
    if (!jdText || jdText.trim().length === 0) {
      return {
        role: fallbackRole || "Unknown Role",
        skills: [],
        mandatorySkills: [],
        preferredSkills: [],
        secondarySkills: [],
        experience: { minimumYears: 0, raw: "Not specified" },
        minExperience: 0,
        architecture: [],
        scaleRequirements: [],
        operational: { workMode: "Remote", schedule: "Standard", estOverlap: false },
        certifications: [],
        complete: false,
        status: "INCOMPLETE",
        extractedAt: new Date().toISOString(),
      };
    }

    const detectedRole = this.extractRole(jdText);
    const role = (detectedRole !== "Unknown Role" ? detectedRole : fallbackRole) || "Unknown Role";
    const exp = this.extractExperience(jdText);
    const architecture = this.extractArchitecture(jdText);
    const scale = this.extractScale(jdText);
    const operational = this.extractOperational(jdText);
    const certifications = this.extractCertifications(jdText);

    // Extract skills using the controlled taxonomy
    const { skills, normalizedSkills } = extractSkills(jdText);

    // Differentiate mandatory vs preferred
    // In technical JDs, skills in "Must Have" or top requirements are mandatory
    const mustHaveSectionMatch = jdText.match(/(?:must have|mandatory|key requirements|required skills|core skills):?([\s\S]*?)(?:nice to have|preferred|secondary|good to have|responsibilities|$)/i);
    const mandatoryFromSection: string[] = [];
    if (mustHaveSectionMatch && mustHaveSectionMatch[1]) {
      const sectionSkills = extractSkills(mustHaveSectionMatch[1]);
      mandatoryFromSection.push(...sectionSkills.normalizedSkills);
    }

    let mandatorySkills: string[] = [];
    let preferredSkills: string[] = [];

    if (mandatoryFromSection.length > 0) {
      mandatorySkills = Array.from(new Set(mandatoryFromSection));
      preferredSkills = normalizedSkills.filter(s => !mandatorySkills.includes(s));
    } else {
      // Top 5 canonical skills are primary/mandatory, remainder preferred
      mandatorySkills = normalizedSkills.slice(0, 5);
      preferredSkills = normalizedSkills.slice(5);
    }

    // Additional architecture items as technical skills if relevant
    if (architecture.length > 0) {
      if (architecture.some(a => a.includes("Lakehouse")) && !normalizedSkills.includes("Lakehouse")) {
        mandatorySkills.push("Lakehouse");
      }
      if (architecture.some(a => a.includes("Direct Lake")) && !normalizedSkills.includes("Direct Lake")) {
        preferredSkills.push("Direct Lake");
      }
    }

    const allSkills = Array.from(new Set([...mandatorySkills, ...preferredSkills, ...skills]));

    // Quality determination: Must have recognized skills and not be empty
    const complete = allSkills.length > 0 && role !== "Unknown Role";

    return {
      role,
      skills: allSkills,
      mandatorySkills,
      preferredSkills,
      secondarySkills: preferredSkills,
      experience: exp,
      minExperience: exp.minimumYears,
      architecture,
      scaleRequirements: scale,
      operational,
      certifications,
      complete,
      status: complete ? "COMPLETE" : "INCOMPLETE",
      rawText: jdText,
      extractedAt: new Date().toISOString(),
    };
  }
}
