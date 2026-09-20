import { adminDb } from "../../lib/firebase-admin.js";
import { AIGateway } from "./AIGateway.js";
import { CandidateEvidenceEngine, ScreeningStatus } from "./CandidateEvidenceEngine.js";

export interface InterviewRound {
  number: number;
  name: string;
  focus: string;
}

export const INTERVIEW_ROUNDS: InterviewRound[] = [
  { number: 1, name: "Fundamentals & Core Tech Skills", focus: "Baseline technical competencies" },
  { number: 2, name: "JD-Specific Scenarios", focus: "Critical alignment with Job Description needs" },
  { number: 3, name: "Resume Verification", focus: "In-depth project validation and integrity check" },
  { number: 4, name: "Behavioral & Situational Problems", focus: "Problem-solving under realistic constraints" },
  { number: 5, name: "Communication, Structure & Clarity", focus: "Synthesis and structured technical articulation" }
];

export interface AnswerEvaluation {
  question: string;
  answer: string;
  roundNumber: number;
  roundName: string;
  accuracyScore: number; // 0-100
  communicationScore: number; // 0-100
  technicalCorrectness: boolean;
  notes: string;
  indicators: {
    positive: string[];
    negative: string[];
  };
  suggestedNextDifficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface CommunicationAssessment {
  relevance: number; // 0-100
  structure: number;
  clarity: number;
  completeness: number;
  technicalArticulation: number;
  explainExamples: number;
  conciseness: number;
  consistency: number;
  overallCommScore: number;
}

export interface AIInterviewSession {
  id: string;
  candidateId: string;
  requirementId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  currentRound: number;
  currentQuestionIndex: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  voiceChoice?: string;
  transcript: AnswerEvaluation[];
  createdAt: string;
  updatedAt: string;
  currentQuestion?: string;
}

export interface AIInterviewReport {
  sessionId: string;
  candidateId: string;
  requirementId: string;
  technicalCompetenceScore: number; // 0-100
  integrityScore: number; // 0-100 (checking anomalies in project answers)
  communicationScore: number; // 0-100
  overallRecommendation: "STRONG_PASS" | "PASS_WITH_RESERVATIONS" | "FAIL";
  positiveIndicators: string[];
  negativeIndicators: string[];
  detailedCommAssessment: CommunicationAssessment;
  recruiterBriefing: string;
  transcript: AnswerEvaluation[];
  completedAt: string;
}

export class AIInterviewService {
  
  /**
   * Starts a new AI Interview session and generates the first question
   */
  public static async startSession(candidateId: string, requirementId: string, voiceChoice: string = "Standard Male"): Promise<AIInterviewSession> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    const sessionId = `int-sess-${candidateId}-${requirementId}-${Date.now()}`;

    // 1. Resolve JD and resume
    const resolvedReq = await CandidateEvidenceEngine.resolveTargetRequirement(candidateId, requirementId);
    if (!resolvedReq) throw new Error("Unable to resolve requirement / job description for interview.");

    const candDoc = await adminDb.collection("candidatePool").doc(candidateId).get();
    if (!candDoc.exists) throw new Error("Candidate not found");
    const cand = candDoc.data() || {};
    const resumeText = cand?.parsedData?.rawText || cand?.resumeText || cand?.text || "";

    // 2. Generate the first question (Round 1: Fundamentals)
    const prompt = `You are HireNestOS's expert AI technical interviewer.
You are initiating an automated screening interview for:
- Candidate Name: ${cand.name || "Candidate"}
- Role Title: ${resolvedReq.title}
- Target Job Description:
${resolvedReq.jdText.substring(0, 2000)}

- Candidate Resume summary:
${resumeText.substring(0, 3000)}

This is Round 1: "${INTERVIEW_ROUNDS[0].name}" (${INTERVIEW_ROUNDS[0].focus}).
Draft an engaging, specific, and realistic first technical interview question at "MEDIUM" difficulty level.
Keep the greeting extremely professional, conversational, and direct. Do not say 'Here is your first question'. Speak as a human interviewer.
Return a valid JSON object matching this schema:
{
  "greeting": "A warm introductory professional greeting welcoming them to HireNestOS Screening Interview",
  "question": "The actual technical question checking baseline core technical competencies"
}`;

    const response = await AIGateway.processChat({
      prompt,
      feature: "interview_question_generation",
      level: 1,
      agent: "AIInterviewService",
      temperature: 0.6,
      systemInstruction: "You are the primary AI Interviewer for HireNestOS. Be direct, highly professional, and encouraging.",
      isAuthorizedUserAction: true,
      schema: {
        type: "object",
        properties: {
          greeting: { type: "string" },
          question: { type: "string" }
        },
        required: ["greeting", "question"]
      }
    });

    const parsed = JSON.parse(response.response);
    const firstQuestionCombined = `${parsed.greeting}\n\n${parsed.question}`;

    const session: AIInterviewSession = {
      id: sessionId,
      candidateId,
      requirementId,
      status: "IN_PROGRESS",
      currentRound: 1,
      currentQuestionIndex: 0,
      difficulty: "MEDIUM",
      voiceChoice,
      transcript: [],
      currentQuestion: parsed.question,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save session
    await adminDb.collection("ai_interview_sessions").doc(sessionId).set(session);

    // Update candidate state in candidatePool
    await CandidateEvidenceEngine.transitionState(
      sessionId,
      candidateId,
      requirementId,
      "AI_SCREENING_COMPLETED",
      "AI_INTERVIEW_IN_PROGRESS" as ScreeningStatus,
      "Dynamic AI Screening Interview session started."
    );

    return session;
  }

  /**
   * Evaluates the candidate's answer, adjusts difficulty, and either proceeds to next question or completes interview
   */
  public static async submitAnswer(sessionId: string, candidateAnswer: string): Promise<{ session: AIInterviewSession; nextQuestion?: string; report?: AIInterviewReport }> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    // 1. Fetch active session
    const sessDoc = await adminDb.collection("ai_interview_sessions").doc(sessionId).get();
    if (!sessDoc.exists) throw new Error("Interview session not found");
    const session = sessDoc.data() as AIInterviewSession;

    if (session.status === "COMPLETED") {
      throw new Error("This interview session has already been completed.");
    }

    const currentRoundIndex = session.currentRound - 1;
    const currentRound = INTERVIEW_ROUNDS[currentRoundIndex];
    const currentQuestion = session.currentQuestion || "Please introduce yourself and explain your core expertise.";

    // 2. Fetch requirement and candidate info for evaluation context
    const resolvedReq = await CandidateEvidenceEngine.resolveTargetRequirement(session.candidateId, session.requirementId);
    const candDoc = await adminDb.collection("candidatePool").doc(session.candidateId).get();
    const cand = candDoc?.data() || {};
    const resumeText = cand?.parsedData?.rawText || cand?.resumeText || cand?.text || "";

    // 3. Evaluate the candidate's answer with Gemini
    const evaluationPrompt = `You are HireNestOS's AI Interview Evaluation Engine.
Evaluate the candidate's answer to the question asked in Round ${session.currentRound}: "${currentRound.name}".

CONTEXT:
- Candidate: ${cand.name || "Candidate"}
- Target Job: ${resolvedReq?.title}
- Stated Skills / Projects on Resume:
${resumeText.substring(0, 1500)}

EVALUATION DETAILS:
- Question Asked: "${currentQuestion}"
- Candidate Answer: "${candidateAnswer}"

CRITICAL BIAS MITIGATION MANDATE:
You must EXPLICITLY IGNORE: gender, accent, age, appearance, ethnicity, voice attractiveness, speech style unrelated to communication effectiveness.
You must strictly base your assessment on objective observable communication and technical characteristics: Clarity, Structure, Relevance, Completeness, Technical articulation, Ability to explain reasoning, Response consistency.

Analyze the answer for technical accuracy, logic, clarity, and articulation.
Identify positive indicators (clear examples, sound architectural rationale, structured reasoning) and negative indicators (hedging, logical contradictions, generic definitions without practical details).
Determine if the difficulty level for the next question should be adjusted ("EASY" if they struggled heavily, "MEDIUM" if they met baseline, "HARD" if they demonstrated exceptional depth).

Return valid JSON matching this schema:
{
  "accuracyScore": number (0-100 indicating technical accuracy and understanding),
  "communicationScore": number (0-100 indicating articulation and clarity),
  "technicalCorrectness": boolean,
  "notes": "Brief qualitative description of their answer",
  "indicators": {
    "positive": string[] (1-3 positive aspects of their answer),
    "negative": string[] (1-3 areas of concern or weaknesses)
  },
  "suggestedNextDifficulty": "EASY" | "MEDIUM" | "HARD"
}`;

    const evalResponse = await AIGateway.processChat({
      prompt: evaluationPrompt,
      feature: "basic_screening",
      level: 1,
      agent: "AIInterviewService",
      temperature: 0.1,
      systemInstruction: "You are HireNestOS's interview evaluator. Be exceptionally precise, objective, and analytical.",
      isAuthorizedUserAction: true,
      schema: {
        type: "object",
        properties: {
          accuracyScore: { type: "number" },
          communicationScore: { type: "number" },
          technicalCorrectness: { type: "boolean" },
          notes: { type: "string" },
          indicators: {
            type: "object",
            properties: {
              positive: { type: "array", items: { type: "string" } },
              negative: { type: "array", items: { type: "string" } }
            },
            required: ["positive", "negative"]
          },
          suggestedNextDifficulty: { type: "string" }
        },
        required: ["accuracyScore", "communicationScore", "technicalCorrectness", "notes", "indicators", "suggestedNextDifficulty"]
      }
    });

    const parsedEval = JSON.parse(evalResponse.response);

    const answerEval: AnswerEvaluation = {
      question: currentQuestion,
      answer: candidateAnswer,
      roundNumber: session.currentRound,
      roundName: currentRound.name,
      accuracyScore: parsedEval.accuracyScore,
      communicationScore: parsedEval.communicationScore,
      technicalCorrectness: parsedEval.technicalCorrectness,
      notes: parsedEval.notes,
      indicators: parsedEval.indicators,
      suggestedNextDifficulty: parsedEval.suggestedNextDifficulty
    };

    session.transcript.push(answerEval);
    session.currentQuestionIndex++;

    // 4. Decide next step (Round Transition or Completion)
    // 5 total rounds, 1 question per round is highly interactive, elegant, and prevents candidate fatigue!
    const nextRoundNumber = session.currentRound + 1;

    if (nextRoundNumber > 5) {
      // INTERVIEW COMPLETED! Compile overall report
      session.status = "COMPLETED";
      session.updatedAt = new Date().toISOString();
      await adminDb.collection("ai_interview_sessions").doc(sessionId).set(session);

      const report = await this.compileInterviewReport(session, resolvedReq?.jdText || "", resumeText);

      // Save report
      await adminDb.collection("ai_interview_reports").doc(sessionId).set(report);

      // Save compiled interview assessment onto the corresponding ai_screening and candidatePool documents
      try {
        const scrSnap = await adminDb.collection("ai_screenings")
          .where("candidateId", "==", session.candidateId)
          .where("requirementId", "==", session.requirementId)
          .limit(1)
          .get();
        if (!scrSnap.empty) {
          const scrDoc = scrSnap.docs[0];
          await scrDoc.ref.set({
            aiInterviewTranscriptAssessment: {
              sessionId,
              completed: true,
              overallScore: report.technicalCompetenceScore,
              communicationScore: report.communicationScore,
              recommendation: report.overallRecommendation,
              keyTakeaways: report.positiveIndicators,
            }
          }, { merge: true });
        }

        // Also update CandidatePool document directly
        await adminDb.collection("candidatePool").doc(session.candidateId).set({
          aiInterviewTranscriptAssessment: {
            sessionId,
            completed: true,
            overallScore: report.technicalCompetenceScore,
            communicationScore: report.communicationScore,
            recommendation: report.overallRecommendation,
            keyTakeaways: report.positiveIndicators,
          }
        }, { merge: true });
        console.log(`[AIInterviewService] Synced assessment feedback to screening & candidate pool for candidate ${session.candidateId}`);
      } catch (err: any) {
        console.error("[AIInterviewService] Failed to sync assessment to candidate records:", err.message);
      }

      // Determine final state based on Pass recommendations
      const finalStatus: ScreeningStatus = report.overallRecommendation === "FAIL" ? "AI_INTERVIEW_COMPLETED" : "AI_INTERVIEW_REVIEW_REQUIRED";
      
      await CandidateEvidenceEngine.transitionState(
        sessionId,
        session.candidateId,
        session.requirementId,
        "AI_INTERVIEW_IN_PROGRESS" as ScreeningStatus,
        finalStatus,
        `AI Interview complete. Recommendation: ${report.overallRecommendation} (Tech competence score: ${report.technicalCompetenceScore}%).`
      );

      return { session, report };
    } else {
      // Transition to next round and generate next question adaptively
      const nextRound = INTERVIEW_ROUNDS[nextRoundNumber - 1];
      const nextDifficulty = parsedEval.suggestedNextDifficulty || "MEDIUM";

      const questionPrompt = `You are HireNestOS's adaptive technical interviewer.
The candidate has completed Round ${session.currentRound}: "${currentRound.name}".
Stated resume projects:
${resumeText.substring(0, 1500)}

Previous Round Answers Transcript:
${JSON.stringify(session.transcript.map(t => ({ q: t.question, a: t.answer, accuracy: t.accuracyScore })))}

You are transitioning to Round ${nextRoundNumber}: "${nextRound.name}" (${nextRound.focus}).
The target difficulty for this next question is "${nextDifficulty}" based on their previous accuracy score of ${parsedEval.accuracyScore}%.
Draft a brilliant, direct, and conversational interview question tailored specifically to this round and their stated skill context.
Do not introduce yourself or use generic phrases. Speak naturally.
Return a valid JSON object matching this schema:
{
  "transitionText": "Brief natural transition bridge closing the prior round and leading to this round",
  "question": "The specific technical question for Round ${nextRoundNumber}"
}`;

      const questionResponse = await AIGateway.processChat({
        prompt: questionPrompt,
        feature: "interview_question_generation",
        level: 1,
        agent: "AIInterviewService",
        temperature: 0.5,
        systemInstruction: "You are the adaptive HireNestOS interviewer. Ask authentic, deep questions to evaluate candidate suitability.",
        isAuthorizedUserAction: true,
        schema: {
          type: "object",
          properties: {
            transitionText: { type: "string" },
            question: { type: "string" }
          },
          required: ["transitionText", "question"]
        }
      });

      const parsedQ = JSON.parse(questionResponse.response);
      const nextQuestionCombined = `${parsedQ.transitionText}\n\n${parsedQ.question}`;

      session.currentRound = nextRoundNumber;
      session.difficulty = nextDifficulty;
      session.currentQuestion = parsedQ.question;
      session.updatedAt = new Date().toISOString();

      await adminDb.collection("ai_interview_sessions").doc(sessionId).set(session);

      return { session, nextQuestion: nextQuestionCombined };
    }
  }

  /**
   * Compiles final comprehensive analytical report with comm assessments
   */
  private static async compileInterviewReport(session: AIInterviewSession, jdText: string, resumeText: string): Promise<AIInterviewReport> {
    const prompt = `You are HireNestOS's principal Senior AI Recruiter and Human Capital Auditor.
The candidate has completed their adaptive AI interview.
Construct a complete evaluation report based on the candidate's full transcript.

JOB DESCRIPTION CONTEXT:
${jdText.substring(0, 1500)}

RESUME BACKGROUND:
${resumeText.substring(0, 1500)}

INTERVIEW TRANSCRIPT:
${JSON.stringify(session.transcript)}

CRITICAL BIAS MITIGATION MANDATE:
Your scoring engine must EXPLICITLY IGNORE: gender, accent, age, appearance, ethnicity, voice attractiveness, speech style unrelated to communication effectiveness.
You must strictly base your assessment on objective observable communication and technical characteristics: Clarity, Structure, Relevance, Completeness, Technical articulation, Ability to explain reasoning, Response consistency.

Conduct a comprehensive analysis across the 8 key communication factors (each scored 0-100):
1. **Relevance**: Did they answer the exact questions asked?
2. **Structure**: Was their explanation logically framed (STAR method, etc.)?
3. **Clarity**: Is their vocabulary/delivery clean and easy to understand?
4. **Completeness**: Did they cover both high-level design and specific implementation constraints?
5. **Technical Articulation**: Use of professional/domain-accurate terminology.
6. **Ability to Explain Examples**: Concrete project context provided.
7. **Conciseness**: Avoidance of circular explanations or fluff.
8. **Response Consistency**: No contradictions with their resume or earlier round statements.

Also compute:
- Overall Technical Competence score (average accuracy across rounds 1, 2, 4).
- Integrity/Verification score (deducting heavily if they contradicted their resume projects, failed Round 3 resume checks, or gave highly suspicious/synthesized answers).
- Comm score (average across the 8 comm factors).

Return valid JSON matching this schema:
{
  "technicalCompetenceScore": number,
  "integrityScore": number,
  "communicationScore": number,
  "overallRecommendation": "STRONG_PASS" | "PASS_WITH_RESERVATIONS" | "FAIL",
  "positiveIndicators": string[] (List of 3-5 major positive technical or soft-skill takeaways),
  "negativeIndicators": string[] (List of 1-4 concerns, anomalies, or areas to drill into),
  "detailedCommAssessment": {
    "relevance": number,
    "structure": number,
    "clarity": number,
    "completeness": number,
    "technicalArticulation": number,
    "explainExamples": number,
    "conciseness": number,
    "consistency": number,
    "overallCommScore": number
  },
  "recruiterBriefing": "A highly professional, scannable executive recruiter briefing (3-4 sentences) summarizing the outcome and specific recommendation details"
}`;

    const reportResponse = await AIGateway.processChat({
      prompt,
      feature: "decision_support",
      level: 2, // Gemini 3.7 Flash for final structured intelligence
      agent: "AIInterviewService",
      temperature: 0.1,
      systemInstruction: "You are the ultimate analytical evaluation engine for HireNestOS. Produce highly precise reports with strict schema conformity.",
      isAuthorizedUserAction: true,
      schema: {
        type: "object",
        properties: {
          technicalCompetenceScore: { type: "number" },
          integrityScore: { type: "number" },
          communicationScore: { type: "number" },
          overallRecommendation: { type: "string" },
          positiveIndicators: { type: "array", items: { type: "string" } },
          negativeIndicators: { type: "array", items: { type: "string" } },
          detailedCommAssessment: {
            type: "object",
            properties: {
              relevance: { type: "number" },
              structure: { type: "number" },
              clarity: { type: "number" },
              completeness: { type: "number" },
              technicalArticulation: { type: "number" },
              explainExamples: { type: "number" },
              conciseness: { type: "number" },
              consistency: { type: "number" },
              overallCommScore: { type: "number" }
            },
            required: ["relevance", "structure", "clarity", "completeness", "technicalArticulation", "explainExamples", "conciseness", "consistency", "overallCommScore"]
          },
          recruiterBriefing: { type: "string" }
        },
        required: [
          "technicalCompetenceScore",
          "integrityScore",
          "communicationScore",
          "overallRecommendation",
          "positiveIndicators",
          "negativeIndicators",
          "detailedCommAssessment",
          "recruiterBriefing"
        ]
      }
    });

    const parsedReport = JSON.parse(reportResponse.response);

    const report: AIInterviewReport = {
      sessionId: session.id,
      candidateId: session.candidateId,
      requirementId: session.requirementId,
      technicalCompetenceScore: parsedReport.technicalCompetenceScore,
      integrityScore: parsedReport.integrityScore,
      communicationScore: parsedReport.communicationScore,
      overallRecommendation: parsedReport.overallRecommendation,
      positiveIndicators: parsedReport.positiveIndicators,
      negativeIndicators: parsedReport.negativeIndicators,
      detailedCommAssessment: parsedReport.detailedCommAssessment,
      recruiterBriefing: parsedReport.recruiterBriefing,
      transcript: session.transcript,
      completedAt: new Date().toISOString(),
    };

    return report;
  }
}
