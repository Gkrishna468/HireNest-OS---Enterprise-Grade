import { adminDb } from "../../lib/firebase-admin.js";
import { CandidateMatchingService } from "../../services/CandidateMatchingService.js";
import { formatBudget } from "../../lib/currency.js";

export default async function handler(req: any, res: any) {
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication" });
  }

  const action = req.query.action || req.body?.action;
  if (!action) {
    return res.status(400).json({ error: "Missing action parameter" });
  }

  try {
    switch (action) {
      case "get-profile": {
        // 1. Fetch Candidate Profile from Single Source of Truth: candidatePool/{uid}
        const poolRef = adminDb.collection("candidatePool").doc(userId);
        const poolSnap = await poolRef.get();
        
        let poolData: any = null;
        if (poolSnap.exists) {
          poolData = poolSnap.data();
        } else {
          // Initialize canonical fallback in candidatePool
          poolData = {
            id: userId,
            uid: userId,
            name: req.user.name || req.user.displayName || "Candidate",
            email: req.user.email || "",
            location: "Remote / Flexible",
            headline: "Candidate Profile",
            skills: [],
            experience: "0 Years",
            experienceYears: 0,
            sourceType: "DIRECT_CANDIDATE",
            ownershipType: "DIRECT",
            vendorId: null,
            ownerType: "HIRENEST",
            ownerId: "GLOBAL_HQ",
            createdVia: "CANDIDATE_PORTAL",
            isDirectCandidate: true,
            pipelineStage: "Application Received",
            status: "ACTIVE",
            currentResumeVersion: 1,
            resumeVersions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await poolRef.set(poolData);
        }

        // Also fetch from candidate_resume_versions collection for double durability, merging them
        const versionsSnap = await adminDb
          .collection("candidate_resume_versions")
          .where("candidateUid", "==", userId)
          .limit(50)
          .get();

        const dbVersions = versionsSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());

        // Merge array-based versions on candidatePool document and collection versions
        const poolVersions = poolData.resumeVersions || [];
        const combinedVersionsMap = new Map();
        
        // Push pool-based versions
        poolVersions.forEach((v: any) => {
          combinedVersionsMap.set(v.version || v.versionId || v.fileName, {
            fileName: v.fileName,
            uploadedAt: v.uploadedAt,
            resumeText: v.resumeText || v.extractedText || "",
            skills: v.skills || [],
            experienceYears: v.experienceYears || 0,
            version: v.version || 1
          });
        });

        // Push subcollection-based versions
        dbVersions.forEach((v: any) => {
          combinedVersionsMap.set(v.version || v.versionId || v.fileName, {
            fileName: v.fileName,
            uploadedAt: v.uploadedAt,
            resumeText: v.resumeText || "",
            skills: v.skills || [],
            experienceYears: v.experienceYears || 0,
            version: v.version || 1
          });
        });

        const sortedCombinedVersions = Array.from(combinedVersionsMap.values()).sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

        // Fetch direct applications securely from adminDb bypassing client-side rule restrictions
        const appsSnap = await adminDb
          .collection("applications")
          .where("candidateUid", "==", userId)
          .get();
        const applicationsList = appsSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        }));

        return res.status(200).json({
          profile: poolData,
          resumeVersions: sortedCombinedVersions,
          applications: applicationsList
        });
      }

      case "update-profile": {
        const payload = req.body.profile;
        if (!payload) {
          return res.status(400).json({ error: "Missing profile payload" });
        }

        // Update candidatePool (Canonical)
        const poolRef = adminDb.collection("candidatePool").doc(userId);
        const updatedPool = {
          ...payload,
          id: userId,
          uid: userId,
          email: req.user.email || payload.email || "", // Preserve authenticated email
          experience: `${payload.experienceYears || 0} Years`,
          updatedAt: new Date().toISOString()
        };

        await poolRef.set(updatedPool, { merge: true });

        // Update candidate_profiles for backward compatibility
        const profileRef = adminDb.collection("candidate_profiles").doc(userId);
        await profileRef.set(updatedPool, { merge: true });

        return res.status(200).json({ success: true, profile: updatedPool });
      }

      case "update-resume": {
        const { fileName, resumeText, skills, experienceYears } = req.body;
        if (!fileName) {
          return res.status(400).json({ error: "Missing resume filename" });
        }

        const poolRef = adminDb.collection("candidatePool").doc(userId);
        const poolSnap = await poolRef.get();
        const currentPool = poolSnap.exists ? poolSnap.data() : {};

        const currentVersion = currentPool.currentResumeVersion || 0;
        const newVersionNum = currentVersion + 1;

        const newVersionObj = {
          version: newVersionNum,
          fileName,
          uploadedAt: new Date().toISOString(),
          resumeText: resumeText || "",
          extractedText: resumeText || "",
          skills: skills || [],
          experienceYears: experienceYears || 0
        };

        const existingVersions = currentPool.resumeVersions || [];
        const updatedVersions = [newVersionObj, ...existingVersions];

        const poolUpdates = {
          resumeFileName: fileName,
          resumeText: resumeText || "",
          parsedResumeText: resumeText || "",
          extractedText: resumeText || "",
          skills: skills || [],
          experience: `${experienceYears || 0} Years`,
          experienceYears: experienceYears || 0,
          currentResumeVersion: newVersionNum,
          resumeVersions: updatedVersions,
          resumeLastParsedAt: new Date().toISOString(),
          resumeProcessingStatus: "COMPLETED",
          resumeParserVersion: "v1.0.0",
          updatedAt: new Date().toISOString()
        };

        await poolRef.set(poolUpdates, { merge: true });

        // Sync to legacy profiles collection
        const profileRef = adminDb.collection("candidate_profiles").doc(userId);
        await profileRef.set({
          ...poolUpdates,
          id: userId,
          userId: userId,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Sync to individual version collection document for extra durability
        const versionId = `VER-${newVersionNum}-${Date.now().toString(36).toUpperCase()}`;
        await adminDb.collection("candidate_resume_versions").doc(versionId).set({
          id: versionId,
          versionId: versionId,
          candidateUid: userId,
          fileName,
          resumeText: resumeText || "",
          skills: skills || [],
          experienceYears: experienceYears || 0,
          uploadedAt: new Date().toISOString(),
          isCurrent: true,
          version: newVersionNum
        });

        return res.status(200).json({
          success: true,
          versionId,
          profileUpdates: {
            ...poolUpdates,
            currentResumeVersionId: versionId
          }
        });
      }

      case "apply": {
        const {
          requirementId,
          screenAvailability,
          screenOnsiteReady,
          screenCurrentCTC,
          screenExpectedCTC,
          screenExperienceYears,
          screenNotes,
          resumeOption, // "current" | "different"
          differentResume // optional custom resume snapshot
        } = req.body;

        if (!requirementId) {
          return res.status(400).json({ error: "Missing requirementId" });
        }

        // 1. Retrieve the Requirement details securely
        let reqRef = adminDb.collection("requirements_public").doc(requirementId);
        let reqSnap = await reqRef.get();
        if (!reqSnap.exists) {
          reqRef = adminDb.collection("requirements").doc(requirementId);
          reqSnap = await reqRef.get();
        }
        if (!reqSnap.exists) {
          return res.status(404).json({ error: "Requirement not found." });
        }
        const requirement = reqSnap.data();

        // 2. Load the candidate's existing profile
        const profileRef = adminDb.collection("candidate_profiles").doc(userId);
        const profileSnap = await profileRef.get();
        const profile = profileSnap.exists ? profileSnap.data() : {};

        const candEmail = req.user.email || profile.email || "";
        const candName = req.user.name || req.user.displayName || profile.name || "Candidate";
        const candPhone = profile.phone || "Not provided";

        // Determine resume snapshot details
        let finalResumeFileName = profile.resumeFileName || "Direct_Resume.pdf";
        let finalResumeText = profile.resumeText || "";
        let finalSkills = profile.skills || [];
        let finalExpYears = screenExperienceYears || profile.experienceYears || 0;
        let versionId = profile.currentResumeVersionId || "DEFAULT";

        if (resumeOption === "different" && differentResume) {
          finalResumeFileName = differentResume.fileName || "Custom_Resume.pdf";
          finalResumeText = differentResume.resumeText || "";
          finalSkills = differentResume.skills || [];
          finalExpYears = differentResume.experienceYears || finalExpYears;

          // Save custom resume snapshot into version history as well!
          versionId = `VER-CUSTOM-${Date.now().toString(36).toUpperCase()}`;
          await adminDb.collection("candidate_resume_versions").doc(versionId).set({
            id: versionId,
            versionId: versionId,
            candidateUid: userId,
            fileName: finalResumeFileName,
            resumeText: finalResumeText,
            skills: finalSkills,
            experienceYears: finalExpYears,
            uploadedAt: new Date().toISOString(),
            isCurrent: false,
            scope: "APPLICATION_SPECIFIC",
            requirementId
          });
        }

        // 3. Duplicate and Vendor Ownership check
        let ownershipConflictDetected = false;
        let existingVendorOwnerId = "";

        if (candEmail) {
          const poolCheckSnap = await adminDb
            .collection("candidatePool")
            .where("email", "==", candEmail)
            .limit(1)
            .get();

          if (!poolCheckSnap.empty) {
            const existingCand = poolCheckSnap.docs[0].data();
            if (existingCand.ownerType === "VENDOR" || existingCand.vendorId) {
              ownershipConflictDetected = true;
              existingVendorOwnerId = existingCand.vendorId || existingCand.ownerId || "VENDOR_NETWORK";
            }
          }
        }

        // 4. Invoke the fitment engine
        const evaluated = CandidateMatchingService.evaluateFitment(
          {
            skills: finalSkills,
            experienceYears: finalExpYears,
            location: profile.location || "Remote",
            preferredWorkMode: screenOnsiteReady?.includes("Yes") ? "ONSITE" : (profile.preferredWorkMode || "Hybrid")
          },
          requirement
        );

        const calculatedFitment = evaluated.score;
        const fitmentEvaluationSnapshot = {
          score: evaluated.score,
          tier: evaluated.tier,
          evaluatedAt: new Date().toISOString(),
          skillsOverlap: evaluated.skillsOverlap,
          missingSkills: evaluated.missingSkills,
          requiredSkills: requirement.skills || [],
          onsiteFitment: screenOnsiteReady?.includes("Yes") ? "PASS" : "REQUIRES_REVIEW",
          experienceFitment: evaluated.hardGateVerdict === "PASS" ? "PASS" : "MARGINAL",
          recommendation: evaluated.tier === "STRONG" ? "STRONG_CANDIDATE" : "POTENTIAL_MATCH"
        };

        // 5. Update Candidate Pool Master
        const masterRef = adminDb.collection("candidatePool").doc(userId);
        await masterRef.set({
          id: userId,
          uid: userId,
          name: candName,
          email: candEmail,
          phone: candPhone,
          skills: finalSkills,
          experience: `${finalExpYears} Years`,
          location: profile.location || "Remote",
          headline: profile.headline || "Candidate Profile",
          sourceType: "DIRECT_CANDIDATE",
          ownershipType: "DIRECT",
          vendorId: null,
          ownerType: "HIRENEST",
          ownerId: "GLOBAL_HQ",
          createdVia: "CANDIDATE_PORTAL",
          isDirectCandidate: true,
          ownershipConflict: ownershipConflictDetected,
          conflictingVendorId: existingVendorOwnerId || null,
          conflictEscalationStatus: ownershipConflictDetected ? "PENDING_ADMIN_RESOLUTION" : "CLEAN",
          status: "ACTIVE",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 6. Create Direct Application Entity
        const appId = `HN-APP-${Date.now().toString(36).toUpperCase()}`;
        const applicationDoc = {
          id: appId,
          applicationId: appId,
          candidateId: userId,
          candidateUid: userId,
          candidateName: candName,
          candidateEmail: candEmail,
          candidatePhone: candPhone,
          requirementId: requirement.id,
          jobTitle: requirement.title || requirement.role || "Software Role",
          jobLocation: requirement.location || requirement.workMode || "Onsite",
          workMode: requirement.workMode || "Onsite",
          status: "UNDER_REVIEW",
          applicationStatus: "UNDER_REVIEW",
          sourceType: "DIRECT_CANDIDATE",
          ownershipType: "DIRECT",
          vendorId: null,
          ownerType: "HIRENEST",
          ownerId: "GLOBAL_HQ",
          createdVia: "CANDIDATE_PORTAL",
          ownershipConflict: ownershipConflictDetected,
          conflictingVendorId: existingVendorOwnerId || null,
          resumeVersion: versionId,
          resumeFileName: finalResumeFileName,
          resumeTextSnapshot: finalResumeText,
          submittedAt: new Date().toISOString(),
          submittedBy: candName,
          requirementSnapshot: {
            id: requirement.id,
            title: requirement.title || requirement.role,
            workMode: requirement.workMode,
            location: requirement.location,
            skills: requirement.skills || [],
            experience: requirement.experience || "3-6 Years",
            budget: formatBudget(requirement.budget || requirement.rate, "Industry Standard"),
            description: (requirement.description || "").slice(0, 500)
          },
          candidateSnapshot: {
            name: candName,
            email: candEmail,
            phone: candPhone,
            location: profile.location || "Remote",
            experienceYears: finalExpYears,
            skills: finalSkills,
            headline: profile.headline || "Candidate Profile"
          },
          fitmentScore: calculatedFitment,
          fitmentEvaluation: fitmentEvaluationSnapshot,
          screeningAnswers: {
            availability: screenAvailability || "Immediate (within 15 days)",
            onsiteReadiness: screenOnsiteReady || "Yes",
            currentCTC: screenCurrentCTC || "Disclosed in discussion",
            expectedCTC: screenExpectedCTC || "Competitive",
            experienceYears: finalExpYears,
            notes: screenNotes || "Direct Portal Submission"
          },
          createdAt: new Date().toISOString()
        };

        await adminDb.collection("applications").doc(appId).set(applicationDoc);

        // 7. Mirror Submission for Global HQ Recruiter & Match Queues
        const submissionDoc = {
          id: appId,
          submissionId: appId,
          candidateId: userId,
          candidateUid: userId,
          candidateName: candName,
          candidateEmail: candEmail,
          candidateSkills: finalSkills,
          requirementId: requirement.id,
          requirementTitle: requirement.title || requirement.role,
          status: "UNDER_REVIEW",
          pipelineStage: "Application Received",
          sourceType: "DIRECT_CANDIDATE",
          ownershipType: "DIRECT",
          vendorId: null,
          ownerType: "HIRENEST",
          ownerId: "GLOBAL_HQ",
          createdVia: "CANDIDATE_PORTAL",
          fitmentScore: calculatedFitment,
          matchScore: calculatedFitment,
          aiMatchScore: calculatedFitment,
          ownershipConflict: ownershipConflictDetected,
          conflictingVendorId: existingVendorOwnerId || null,
          submittedAt: new Date().toISOString()
        };
        await adminDb.collection("submissions").doc(appId).set(submissionDoc);

        // 8. Create Recruiter Notification
        await adminDb.collection("notifications").add({
          type: "DIRECT_CANDIDATE_APPLICATION",
          title: `New Direct Application: ${candName}`,
          message: `${candName} applied directly for ${requirement.title || requirement.role} (${requirement.workMode}) with ${calculatedFitment}% fitment.`,
          applicationId: appId,
          candidateId: userId,
          requirementId: requirement.id,
          sourceType: "DIRECT_CANDIDATE",
          ownershipType: "DIRECT",
          vendorId: null,
          ownershipConflict: ownershipConflictDetected,
          createdAt: new Date().toISOString()
        });

        return res.status(200).json({
          success: true,
          appId,
          fitmentScore: calculatedFitment,
          conflict: ownershipConflictDetected
        });
      }

      default:
        return res.status(400).json({ error: "Unsupported action" });
    }
  } catch (err: any) {
    console.error(`[CandidatePortalAPI] Action '${action}' failed:`, err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
