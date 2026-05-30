const logAiUsage = async (metricName: string, orgId: string, model: string, tokenEstimate: number, method: string) => {
   console.log(`[AI USAGE] ${orgId} used ${tokenEstimate} tokens via ${method}`);
};

// Helper to extract years of experience using regex
function extractYearsOfExperience(text: string): number {
  const match = text.match(/(\d+)\+?\s*(?:vears?|yrs?|years?)\s*(?:of)?\s*(?:experience)?/i);
  return match ? parseInt(match[1], 10) : 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { jd, candidateProfile } = req.body;
  if (!jd || !candidateProfile) {
    return res.status(400).json({
        message: "Missing jd or candidateProfile parameters in request body",
    });
  }

  try {
    // ---------------------------------------------------------
    // DETERMINISTIC BUSINESS LOGIC - AI GATEWAY MOVED TO CLIENT
    // ---------------------------------------------------------
    
    // We are no longer using Gemini for Match Scoring. Rely entirely on deterministic heuristics.
    const jdLower = typeof jd === 'string' ? jd.toLowerCase() : JSON.stringify(jd).toLowerCase();
    const resumeLower = typeof candidateProfile === 'string' ? candidateProfile.toLowerCase() : JSON.stringify(candidateProfile).toLowerCase();

    // 1. Skill Match
    const techWords = [
      "react", "node", "typescript", "javascript", "python", "java", "c++", ".net",
      "aws", "azure", "gcp", "docker", "kubernetes", "sql", "linux", "agile",
      "css", "html", "api", "rest", "graphql", "microservices", "ruby", "go",
      "rust", "swift", "kotlin", "spring", "django", "flask", "vue", "angular",
      "mongodb", "postgresql", "mysql", "redis", "kafka", "rabbitmq"
    ];

    const requiredSkills = techWords.filter((word) => jdLower.includes(word));
    const foundSkills = requiredSkills.filter((word) => resumeLower.includes(word));
    const missingSkills = requiredSkills.filter((word) => !resumeLower.includes(word));
    
    let skillsScore = 50;
    if (requiredSkills.length > 0) {
      skillsScore = Math.min(100, Math.round((foundSkills.length / requiredSkills.length) * 100));
    } else if (foundSkills.length > 0) {
      skillsScore = 80; // Implicitly matched something, but no clear requirements
    }

    // 2. Experience Match
    const requiredExp = extractYearsOfExperience(jdLower);
    const candidateExp = extractYearsOfExperience(resumeLower);
    
    let experienceScore = 70; // baseline
    if (requiredExp > 0) {
      if (candidateExp >= requiredExp) {
        experienceScore = 100;
      } else if (candidateExp > 0) {
        experienceScore = Math.max(0, 100 - ((requiredExp - candidateExp) * 20)); // deduct 20% per missing year
      }
    } else if (candidateExp > 0) {
       experienceScore = 85; 
    }

    // 3. Location/Domain Match (Basic heuristics, normally geo-lookup or strict sector lists)
    const remoteKeywords = ['remote', 'work from home', 'wfh', 'telecommute'];
    const requiresRemote = remoteKeywords.some(k => jdLower.includes(k));
    const candidateWantsRemote = remoteKeywords.some(k => resumeLower.includes(k));
    
    let locationScore = 80;
    if (requiresRemote && candidateWantsRemote) locationScore = 100;
    else if (!requiresRemote && requiresRemote) locationScore = 60; 
    
    let domainScore = 75; // Average expected domain fit

    // Compute Total Deterministic Score
    const totalScore = Math.round((skillsScore * 0.5) + (experienceScore * 0.3) + (locationScore * 0.1) + (domainScore * 0.1));

    let recommendation = "CONSIDER";
    if (totalScore >= 80) recommendation = "STRONG_FIT";
    if (totalScore < 60) recommendation = "NOT_SUITABLE";

    const parsedData = {
      matchScore: totalScore,
      breakdown: {
        skillsScore,
        experienceScore,
        domainScore,
        locationScore,
        bonusScore: candidateExp > (requiredExp + 3) ? 10 : 0,
        totalScore,
      },
      summary: `Deterministic profile evaluation completed. Overall match scored at ${totalScore}%.`,
      strengths: foundSkills.length > 0
          ? foundSkills.map((s) => `Demonstrated proficiency in ${s.toUpperCase()}`)
          : ["General baseline capability mapped"],
      gaps: missingSkills.length > 0
          ? ["Lacks specialized critical technologies"]
          : ["No major technical gaps detected"],
      missingSkills: missingSkills,
      recruiterAssessment: recommendation === "STRONG_FIT"
          ? "High alignment on deterministic matching. Prioritize interview scheduling."
          : "Evaluate missing skills before progressing. Candidate lacks density in required stack.",
      recommendation: recommendation,
      nextSteps: missingSkills.length > 0
          ? `Request clarification on: ${missingSkills.slice(0, 3).join(', ')}`
          : "Proceed to technical assessment.",
      outreachDrafts: {
        founder: "Hey, reviewed your profile and noticed a strong alignment with our technical stack. Would love to have a quick chat about our roadmap.",
        professional: "Dear Candidate, Your technical qualifications correspond well with our open requirements. We would appreciate the opportunity to connect.",
        executive: "Reaching out regarding a strategic role that aligns with your expertise. Please let me know if you are open to a confidential briefing.",
        warm: "Hi! I'm helping build a great team and your background stood out. Would you be open to a casual chat to explore synergy?",
      },
    };

    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error("[DETAILED_MATCH_ERROR] Failed during deterministic matching:", error);
    return res.status(500).json({ error: error.message, message: "System error during deterministic match scoring." });
  }
}
