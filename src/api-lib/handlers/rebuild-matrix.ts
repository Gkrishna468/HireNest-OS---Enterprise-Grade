import { adminDb } from '../../lib/firebase-admin.js';
import { AIGateway } from '../services/AIGateway.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!adminDb) return res.status(503).json({ success: false, error: "Firebase Service Account configuration is missing. Cannot perform rebuild in client fallback mode." });

  try {
    const { role } = req.body;
    if (role !== 'adminHQ') {
      return res.status(403).json({ error: 'Only Admin HQ can perform a hard matrix rebuild.' });
    }

    let deletedMatchesCount = 0;
    
    // First, delete all existing ai_matches records using collectionGroup
    // This ensures orphaned match documents (where the candidate was deleted) are also purged.
    const allMatchesSnapshot = await adminDb.collectionGroup('ai_matches').get();
    for (const matchDoc of allMatchesSnapshot.docs) {
      await matchDoc.ref.delete();
      deletedMatchesCount++;
    }

    // Now re-read active requirements
    const reqsSnapshot = await adminDb.collection('requirements_public').get();
    const requirements = reqsSnapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

    // Fetch all submissions to know who is already submitted
    const subsSnapshot = await adminDb.collection('submissions').get();
    const submissions = subsSnapshot.docs.map((d: any) => d.data());

    // Fetch active candidates
    const candidatesSnapshot = await adminDb.collection('candidatePool').get();

    let matchUpdatesCount = 0;

    for (const candDoc of candidatesSnapshot.docs) {
      const cand = { id: candDoc.id, ...candDoc.data() as any };

      // Validate candidate status
      const isArchived = cand.status === 'archived' || cand.isArchived;
      const isDeleted = cand.status === 'deleted' || cand.isDeleted;
      const isBlacklisted = cand.status === 'blacklisted' || cand.isBlacklisted;
      
      if (isArchived || isDeleted || isBlacklisted) {
        continue;
      }

      const candidateSummary = `Name: ${cand.fullName || cand.name}
Role: ${cand.role || 'Undefined'}
Skills: ${(cand.skills || []).join(', ')}
Experience: ${cand.experience || 'N/A'}
Resume: ${cand.resumeText ? cand.resumeText.slice(0, 1500) : 'N/A'}`;

      for (const reqObj of requirements) {
        // Skip if already in client submission for this requirement
        const hasSubmission = submissions.some(
          (sub: any) =>
            (sub.requirementId === reqObj.id || sub.reqId === reqObj.id) && 
            (sub.candidateId === cand.id || sub.candidateId === cand.candidateId)
        );

        if (hasSubmission) {
          continue; 
        }

        const jdSummary = `Title: ${reqObj.title}
Skills: ${(reqObj.skills || []).join(', ')}
Experience: ${reqObj.experience || reqObj.yearsOfExperience || 'N/A'}`;

        const prompt = `You are a recruitment AI.
Score the match between this Candidate and this Job Description out of 100.
Also provide a 1-sentence summary of the fit.

Job Description:
${jdSummary}

Candidate:
${candidateSummary}

Return JSON strictly in this format:
{"matchScore": 85, "summary": "Strong fit based on React and Node.js experience.", "strengths": ["skill 1"], "missingSkills": ["skill 2"], "breakdown": {"skillsScore": 90, "experienceScore": 80, "domainScore": 80, "locationScore": 100}}`;

        try {
          const aiResponse = await AIGateway.analyze({
              prompt: prompt,
              modelPreference: 'fast',
              schema: true
          });
          const resultJson = aiResponse.data || {};
          const mScore = resultJson.matchScore || 0;
          
          if (mScore > 0) {
             const matchResult = {
                requirementId: reqObj.id,
                matchScore: mScore,
                summary: resultJson.summary || 'AI Matrix Rebuild Completed',
                strengths: resultJson.strengths || [],
                missingSkills: resultJson.missingSkills || [],
                breakdown: resultJson.breakdown || { skillsScore: mScore, experienceScore: mScore, domainScore: mScore, locationScore: mScore },
                lastScanned: new Date().toISOString()
             };
             
             await adminDb.collection('candidatePool').doc(cand.id).collection('ai_matches').doc(reqObj.id).set(matchResult);
             matchUpdatesCount++;
          }
        } catch (genErr) {
          console.error('AI Gen Error for candidate:', cand.id, genErr);
        }
      }
    }

    return res.status(200).json({ success: true, deletedMatchesCount, matchUpdatesCount });
  } catch (e: any) {
    console.error('Matrix Rebuild Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
