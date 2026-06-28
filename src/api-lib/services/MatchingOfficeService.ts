import { adminDb } from "../../lib/firebase-admin.js";
import { runComprehensiveMatch } from "../ai/matchingEngine.js";
import { normalizeSkills } from "../utils/matching.js";
import { EventDispatcher } from "../../events/EventDispatcher.js";
import { EventTypes } from "../../lib/events/EventTypes.js";

export class MatchingOfficeService {
    
    /**
     * Process a new or updated requirement.
     * Matches the requirement against all eligible candidates in the pool.
     */
    static async processRequirement(requirementId: string, tenantId: string) {
        if (!adminDb) return;
        
        console.log(`[MatchingOffice] Processing Requirement: ${requirementId}`);
        
        // 1. Load Requirement
        const reqDoc = await adminDb.collection('requirements_public').doc(requirementId).get();
        if (!reqDoc.exists) {
            console.error(`[MatchingOffice] Requirement ${requirementId} not found.`);
            return;
        }
        
        const reqData = reqDoc.data()!;
        const reqSkills = normalizeSkills(reqData.skills || []);
        const jdObject = { skills: reqSkills };
        
        // 2. Load Candidate Pool (scoped to tenant/org if needed, but here we assume global pool for matching)
        const poolSnapshot = await adminDb.collection('candidatePool')
            .where('status', '==', 'AVAILABLE')
            .get();
            
        console.log(`[MatchingOffice] Evaluating ${poolSnapshot.size} candidates against ${requirementId}`);
        
        const matchesBatch = adminDb.batch();
        let matchCount = 0;
        
        for (const doc of poolSnapshot.docs) {
            const cand = doc.data();
            
            // Execute match
            const matchResult = await runComprehensiveMatch(jdObject, cand);
            
            if (matchResult.overallScore >= 60) {
                const matchId = `${requirementId}_${doc.id}`;
                const matchRef = adminDb.collection('candidate_matches').doc(matchId);
                
                matchesBatch.set(matchRef, {
                    requirementId,
                    candidateId: doc.id,
                    tenantId: tenantId || reqData.tenantId || 'system',
                    matchScore: matchResult.overallScore,
                    matchBand: matchResult.matchBand,
                    tier: matchResult.tier,
                    breakdown: matchResult.breakdown,
                    explanation: matchResult.explanation,
                    skillsMatched: matchResult.skillsMatched,
                    skillsMissing: matchResult.skillsMissing,
                    updatedAt: new Date().toISOString(),
                    status: 'ACTIVE'
                });
                matchCount++;
            }
        }
        
        if (matchCount > 0) {
            await matchesBatch.commit();
            console.log(`[MatchingOffice] Committed ${matchCount} matches for ${requirementId}`);
            
            // Notify via Event Bus
            await EventDispatcher.getInstance().publish({
                id: `evt_${Date.now()}`,
                type: EventTypes.CANDIDATE_MATCHED,
                timestamp: new Date().toISOString(),
                tenantId: tenantId,
                payload: {
                    requirementId,
                    matchCount
                }
            });
        }
    }

    /**
     * Process a new or updated candidate.
     * Matches the candidate against all open requirements.
     */
    static async processCandidate(candidateId: string, tenantId: string) {
        if (!adminDb) return;
        
        console.log(`[MatchingOffice] Processing Candidate: ${candidateId}`);
        
        // 1. Load Candidate
        const candDoc = await adminDb.collection('candidatePool').doc(candidateId).get();
        if (!candDoc.exists) {
            console.error(`[MatchingOffice] Candidate ${candidateId} not found.`);
            return;
        }
        
        const candData = candDoc.data()!;
        
        // 2. Load Open Requirements
        const reqSnapshot = await adminDb.collection('requirements_public')
            .where('status', '==', 'OPEN')
            .get();
            
        console.log(`[MatchingOffice] Evaluating ${candidateId} against ${reqSnapshot.size} requirements`);
        
        const matchesBatch = adminDb.batch();
        let matchCount = 0;
        
        for (const doc of reqSnapshot.docs) {
            const reqData = doc.data();
            const reqSkills = normalizeSkills(reqData.skills || []);
            const jdObject = { skills: reqSkills };
            
            // Execute match
            const matchResult = await runComprehensiveMatch(jdObject, candData);
            
            if (matchResult.overallScore >= 60) {
                const matchId = `${doc.id}_${candidateId}`;
                const matchRef = adminDb.collection('candidate_matches').doc(matchId);
                
                matchesBatch.set(matchRef, {
                    requirementId: doc.id,
                    candidateId: candidateId,
                    tenantId: tenantId || candData.tenantId || 'system',
                    matchScore: matchResult.overallScore,
                    matchBand: matchResult.matchBand,
                    tier: matchResult.tier,
                    breakdown: matchResult.breakdown,
                    explanation: matchResult.explanation,
                    skillsMatched: matchResult.skillsMatched,
                    skillsMissing: matchResult.skillsMissing,
                    updatedAt: new Date().toISOString(),
                    status: 'ACTIVE'
                });
                matchCount++;
            }
        }
        
        if (matchCount > 0) {
            await matchesBatch.commit();
            console.log(`[MatchingOffice] Committed ${matchCount} matches for candidate ${candidateId}`);
            
            // Notify via Event Bus
            await EventDispatcher.getInstance().publish({
                id: `evt_${Date.now()}`,
                type: EventTypes.CANDIDATE_MATCHED,
                timestamp: new Date().toISOString(),
                tenantId: tenantId,
                payload: {
                    candidateId,
                    matchCount
                }
            });
        }
    }
}
