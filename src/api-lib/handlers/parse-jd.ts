import crypto from "crypto";
import { adminDb } from "../../lib/firebase-admin.js";
import { extractSkills } from "../../resume-engine/parser/skills.js";

// Deterministic Role Extraction
function extractRoleDeterministically(text: string): string {
  const commonRoles = [
    "Software Engineer", "Senior Software Engineer", "Full Stack Developer", "Frontend Developer", "Backend Developer",
    "DevOps Engineer", "Data Scientist", "Data Engineer", "Product Manager", "Project Manager",
    "QA Engineer", "SDET", "System Administrator", "Cloud Architect", "UI/UX Designer",
    "Technical Lead", "Engineering Manager", "CTO", "CIO", "CEO"
  ];
  
  const textLower = text.toLowerCase();
  for (const role of commonRoles) {
    if (textLower.includes(role.toLowerCase())) {
      return role;
    }
  }
  
  // Fallback heuristic: Try to find something that looks like a title on the first few lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 50);
  if (lines.length > 0) {
      return lines[0];
  }
  
  return "Software Engineer";
}

// Deterministic Skill Extraction using controlled skills taxonomy
function extractSkillsDeterministically(text: string): string[] {
  const extracted = extractSkills(text);
  const combined = Array.from(new Set([...(extracted.normalizedSkills || []), ...(extracted.skills || [])]));
  return combined.slice(0, 10);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { jdText } = req.body;
  if (!jdText) {
    return res
      .status(400)
      .json({ message: "Missing jdText parameter in request body" });
  }

  const orgId = req.headers["x-org-id"] || "system";

  try {
    // 1. Check Hash Cache
    const normalizedText = jdText.replace(/\s+/g, " ").trim();
    const hash = crypto
      .createHash("sha256")
      .update(normalizedText)
      .digest("hex");
    let cachedDoc = null;

    if (adminDb) {
      try {
        const cacheRef = adminDb.collection("jd_cache").doc(hash);
        cachedDoc = await cacheRef.get();
      } catch (e) {
        console.error("[CACHE_ERR]", e);
      }
    }

    if (cachedDoc && cachedDoc.exists) {
      console.log(`[PARSE_JD] Cache hit for org ${orgId}`);
      return res.status(200).json(cachedDoc.data());
    }

    // 2. Deterministic Parsing
    const title = extractRoleDeterministically(jdText);
    const skills = extractSkillsDeterministically(jdText);
    
    if (skills.length === 0) {
        skills.push("Communication", "Problem Solving"); // Default fallbacks
    }

    const parsedData = { title, skills };

    // Save to Cache
    if (adminDb && parsedData.title) {
      try {
        await adminDb
          .collection("jd_cache")
          .doc(hash)
          .set({
            ...parsedData,
            embeddingStatus: "unavailable",
            cachedAt: new Date().toISOString(),
          });
      } catch (e) {}
    }

    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error("[JD_PARSER_ERROR] Failed to parse Job Description:", error);

    // Graceful fallback values
    return res.status(200).json({
      title: "Extracted Role",
      skills: ["Processing Pending", "Will update shortly"],
    });
  }
}
