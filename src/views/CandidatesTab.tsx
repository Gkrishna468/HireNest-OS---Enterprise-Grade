import React, { useEffect, useState, ChangeEvent } from "react";
import { Badge } from "../lib/Badge";
import {
  Activity,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  AlertTriangle,
  Briefcase,
  Bot,
  Shield,
  Send,
  X,
  Plus,
  Upload,
  MapPin,
  ShieldAlert,
  Fingerprint,
  Users,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { generateIdentityHash, checkAndClaimOwnership } from "../lib/ownershipVault";
import {
  db,
  auth,
  storage,
  handleFirestoreError,
  OperationType,
} from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  where,
  updateDoc,
  deleteDoc,
  limit,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { parseBulkResumes } from "../services/aiService";
import { publishEvent } from "../lib/eventEngine";

import CandidateSubmissionModal from "../components/CandidateSubmissionModal";
import { EmptyState } from "../components/EmptyState";

const getSkillsArray = (skills: any): string[] => {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  return [];
};

import { ClientCandidatePipeline } from "./workspaces/ClientCandidatePipeline";

const STAGES = [
  "Processing",
  "Added",
  "Matched",
  "Submitted",
  "Interviewing",
  "Offer",
  "Placed",
];

export default function CandidatesTab() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidatesIds, setSelectedCandidatesIds] = useState<string[]>(
    [],
  );
  const [candidateSubmissions, setCandidateSubmissions] = useState<any[]>([]);
  const [globalSubmissions, setGlobalSubmissions] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    skills: "",
    resumeText: "",
    experience: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [mappingResult, setMappingResult] = useState<any | null>(null);
  const [isMapping, setIsMapping] = useState(false);
  const [editingName, setEditingName] = useState<{ id: string; name: string } | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [vendorMap, setVendorMap] = useState<Record<string, string>>({});
  const [processingStats, setProcessingStats] = useState<{
    show: boolean;
    total: number;
    processing: number;
    parsed: number;
    matched: number;
  } | null>(null);
  const isAdmin =
    userRole.includes("admin") ||
    userRole === "super_admin" ||
    userRole === "ops_admin";

  const handleNameSave = async (candId: string) => {
    if (!editingName || !editingName.name.trim()) return;
    try {
      setIsSavingName(true);
      const newName = editingName.name.trim();
      const candRef = doc(db, "candidatePool", candId);
      const candSnap = await getDoc(candRef);
      
      await updateDoc(candRef, {
        name: newName,
        fullName: newName,
        status: "UPLOADED", // Optionally advance status if needed
        isNameManuallyEdited: true,
        updatedAt: serverTimestamp(),
      });

      if (candSnap.exists()) {
         const data = candSnap.data();
         const candHash = await generateIdentityHash(data.email || "", data.phone !== "No Phone Provided" ? data.phone || "" : "");
         if (candHash) {
             try {
                await updateDoc(doc(db, "candidate_identity", candHash), {
                    candidateName: newName
                });
             } catch(e) { }
             try {
                const octq = query(collection(db, "ownership_claims"), where("candidateHash", "==", candHash));
                const octsnap = await getDocs(octq);
                await Promise.all(octsnap.docs.map(octDoc => updateDoc(doc(db, "ownership_claims", octDoc.id), {
                   candidateName: newName
                })));
             } catch(e) { }
         }
      }

      // Update submissions as well so it populates across workspaces
      const subQuery = query(
        collection(db, "submissions"),
        where("candidateId", "==", candId)
      );
      const subSnap = await getDocs(subQuery);
      const updatePromises = subSnap.docs.map((subDoc) =>
        updateDoc(doc(db, "submissions", subDoc.id), {
          name: newName,
          candidateName: newName,
          updatedAt: serverTimestamp(),
        })
      );
      await Promise.all(updatePromises);

      const oldName = candSnap.exists() ? candSnap.data().name : "Unknown Name";

      // Create Immutable Candidate Change Log (especially for ABAC and Ownership Ledger reconciliation)
      try {
        const changeLogId = `LOG-${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, "candidate_change_log", changeLogId), {
          logId: changeLogId,
          candidateId: candId,
          field: "fullName",
          oldValue: oldName,
          newValue: newName,
          editedBy: userRole,
          editedAt: serverTimestamp(),
        });
      } catch (logErr) {
        console.warn("Failed to write to candidate_change_log:", logErr);
      }

      await publishEvent({
        type: "info",
        title: "Candidate Name Corrected",
        message: `Candidate name changed from ${oldName} to ${newName} by ${userRole}`,
        recipients: ["GLOBAL_ADMIN", userRole.includes("vendor") ? userOrgId || "GLOBAL_VENDOR" : "GLOBAL_VENDOR"],
      });
      setEditingName(null);
    } catch (err) {
      console.error("Failed to update candidate name:", err);
      handleFirestoreError(err, OperationType.UPDATE, "candidatePool");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteCandidate = async (candId: string) => {
    if (!isAdmin) {
      // Inline notification handled via UI typically, but just return to prevent execution
      return;
    }

    // Automatically confirmed
    try {
      await deleteDoc(doc(db, "candidatePool", candId));
      setSelectedCandidate(null);
    } catch (e: any) {
      console.error("Failed to delete candidate: " + e.message);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      if (!auth.currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        let orgId = "ORG-GLOBAL-HQ";
        let role = "admin";

        if (userDoc.exists()) {
          const userData = userDoc.data();
          orgId = userData.organizationId || "ORG-GLOBAL-HQ";
          role = userData.role || "guest";
        }

        // Apply super admin logic
        const superAdmins = [
          "gopal@hirenestworkforce.com",
          "gopalkrishna0046@gmail.com",
        ];
        if (
          auth.currentUser.email &&
          superAdmins.includes(auth.currentUser.email.toLowerCase())
        ) {
          role = "super_admin";
          orgId = "ORG-GLOBAL-HQ";
        }

        setUserOrgId(orgId);
        setUserRole(role);

        // Load active jobs for mapping (limited to prevent real-time explosion)
        const jobsQuery = query(
          collection(db, "requirements_public"),
          where("status", "==", "PUBLISHED"),
          limit(50),
        );
        onSnapshot(
          jobsQuery,
          (snap) => {
            setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.GET,
              "requirements_public_mapping",
            );
          },
        );

        // Initial load from API
        try {
          const res = await fetch(
            `/api/candidates?orgId=${orgId}&role=${role}`,
          );
          if (res.ok) {
            const data = await res.json();
            setCandidates(data.candidates || []);
          }
        } catch (e) {
          console.warn("Initial API load failed");
        }

        // Real-time listener WITH STRICT LIMITS
        if (orgId) {
          const isAdminUser =
            role === "admin" ||
            role === "super_admin" ||
            role === "ops_admin" ||
            role === "hq_admin";
          const isClientUser = role.includes("client");

          const q = isAdminUser
            ? query(collection(db, "candidatePool"), limit(100))
            : isClientUser
              ? null
              : query(
                  collection(db, "candidatePool"),
                  where("vendorId", "==", orgId),
                  limit(100),
                );

          if (!q) {
            setCandidates([]);
          } else {
            unsubscribe = onSnapshot(
              q,
              (snap) => {
                setCandidates(
                  snap.docs.map((d) => ({ id: d.id, ...d.data() })),
                );
              },
              (error: any) => {
                handleFirestoreError(error, OperationType.GET, "candidatePool");
              },
            );
          }

          let qSub = null;
          if (isAdminUser) {
             qSub = query(collection(db, "submissions"), limit(500));
          } else if (isClientUser) {
             qSub = query(collection(db, "submissions"), where("clientId", "==", orgId), limit(500));
          } else {
             qSub = query(collection(db, "submissions"), where("vendorOrgId", "==", orgId), limit(500));
          }

          if (qSub) {
             onSnapshot(qSub, snap => {
                setGlobalSubmissions(snap.docs.map(d => ({id: d.id, ...d.data()})));
             });
          }

          try {
            const usersSnap = await getDocs(collection(db, "users"));
            const vMap: Record<string, string> = {};
            usersSnap.docs.forEach((d) => {
              const data = d.data();
              if (data.organizationId && data.name) {
                vMap[data.organizationId] = data.name;
              }
            });
            setVendorMap(vMap);
          } catch (e) {
            console.warn("Failed to fetch users for vendor map");
          }
        }
      } catch (err: any) {
        console.warn("Auth initialization logic failed:", err.message);
      }
    };

    init();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedCandidate) {
      setCandidateSubmissions([]);
      return;
    }

    const unsubs: any[] = [];
    const loadSubmissions = async () => {
      try {
        const id = selectedCandidate.originalId || selectedCandidate.id || selectedCandidate.candidateId;
        let qId = query(
          collection(db, "submissions"),
          where("candidateId", "==", id),
        );

        const isClientUser = userRole.includes("client");
        const isVendorUser =
          userRole.includes("vendor") ||
          userRole.includes("recruiter") ||
          userRole.includes("independent");

        if (isClientUser) {
          qId = query(
            collection(db, "submissions"),
            where("candidateId", "==", id),
            where("clientId", "==", userOrgId),
          );
        } else if (isVendorUser && !isAdmin) {
          qId = query(
            collection(db, "submissions"),
            where("candidateId", "==", id),
            where("vendorId", "==", userOrgId),
          );
        }

        // Listen to submissions via candidateId
        const unsub = onSnapshot(qId, (snap) => {
          setCandidateSubmissions(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        });
        unsubs.push(unsub);
      } catch (err) {
        console.warn("Error subscribing to candidate submissions", err);
      }
    };
    loadSubmissions();

    return () => unsubs.forEach((u) => u());
  }, [selectedCandidate]);

  const checkDuplicate = (email: string, phone: string, currentId?: string) => {
    if (!email && !phone) return null;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.replace(/\D/g, "");

    for (const c of candidates) {
      if (c.id === currentId || c.candidateId === currentId) continue;

      const cEmail = c.primaryEmail || c.email;
      const cPhone = c.phoneHash || c.phone;

      if (
        normalizedEmail &&
        cEmail &&
        cEmail.trim().toLowerCase() === normalizedEmail
      ) {
        return { candidate: c, type: "email", value: cEmail };
      }

      if (
        normalizedPhone &&
        cPhone &&
        cPhone.replace(/\D/g, "") === normalizedPhone
      ) {
        return { candidate: c, type: "phone", value: cPhone };
      }
    }
    return null;
  };

  const handleMergeDuplicate = async (dupCand: any) => {
    if (!dupCand.duplicateOf) {
      console.warn("Missing reference to the original candidate.");
      return;
    }

    // Automatically confirmed
    try {
      const origRef = doc(db, "candidatePool", dupCand.duplicateOf);
      const origSnap = await getDoc(origRef);

      if (origSnap.exists()) {
        const origData = origSnap.data();

        // Merge skills
        const origSkills = getSkillsArray(origData.skills);
        const dupSkills = getSkillsArray(dupCand.skills);
        const mergedSkills = Array.from(new Set([...origSkills, ...dupSkills]));

        // Update original document with merged details
        const mergedData: any = {
          skills: mergedSkills,
          updatedAt: serverTimestamp(),
        };

        // Fill in empty fields in original candidate if duplicate has them
        if (!origData.phone && dupCand.phone) mergedData.phone = dupCand.phone;
        if (!origData.linkedin && dupCand.linkedin)
          mergedData.linkedin = dupCand.linkedin;
        if (!origData.experience && dupCand.experience)
          mergedData.experience = dupCand.experience;
        if (!origData.location && dupCand.location)
          mergedData.location = dupCand.location;

        // Append resume text if both exist
        if (dupCand.resumeText && dupCand.resumeText !== origData.resumeText) {
          mergedData.resumeText =
            (origData.resumeText || "") +
            "\n\n=== Merged Context ===\n" +
            dupCand.resumeText;



        }

        await updateDoc(origRef, mergedData);
      }

      // Delete the duplicate candidate document
      const candRef = doc(
        db,
        "candidatePool",
        dupCand.id || dupCand.candidateId,
      );
      await deleteDoc(candRef);

      setSelectedCandidate(null);
    } catch (e: any) {
      console.error("Error merging duplicate: " + e.message);
    }
  };

  const handleVerifyAsSeparate = async (dupCand: any) => {
    try {
      const candRef = doc(
        db,
        "candidatePool",
        dupCand.id || dupCand.candidateId,
      );
      await updateDoc(candRef, {
        pipelineStage: "Added",
        isDuplicate: false,
        duplicateOf: "",
        duplicateOfName: "",
        duplicateReason: "",
        updatedAt: serverTimestamp(),
      });
      setSelectedCandidate(null);
    } catch (e: any) {
      console.error("Error verifying candidate: " + e.message);
    }
  };

  const handleIgnoreDuplicate = async (dupCand: any) => {
    // Automatically confirmed
    try {
      const candRef = doc(
        db,
        "candidatePool",
        dupCand.id || dupCand.candidateId,
      );
      await deleteDoc(candRef);
      setSelectedCandidate(null);
    } catch (e: any) {
      console.error("Error discarding candidate: " + e.message);
    }
  };

  const handleAddCandidate = async () => {
    if (!formData.name || !formData.email) {
      alert("Name and Email are required.");
      return;
    }
    if (!userOrgId) {
      alert("Organization session sync pending. Please try again in a moment.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCandId = "CAND-" + Math.random().toString(36).substr(2, 9);
      let isDupe = false;
      const dMatch = checkDuplicate(formData.email, formData.phone);

      // Candidate Ownership Vault Logic
      let candHash = null;
      if (formData.email || formData.phone) {
        candHash = await generateIdentityHash(formData.email, formData.phone);
      }

      if (dMatch) {
         isDupe = true;
         finalCandId = dMatch.candidate.candidateId || dMatch.candidate.id;
         // Merging logic instead of creating new duplicate doc
         await updateDoc(doc(db, "candidatePool", finalCandId), {
           updatedAt: serverTimestamp(),
           resumeText: formData.resumeText ? 
              ((dMatch.candidate.resumeText || "") + "\n\n=== Merged Context ===\n" + formData.resumeText) : dMatch.candidate.resumeText,




         });
         
         if (candHash) {
           const vaultResult = await checkAndClaimOwnership(candHash, userOrgId, formData.name, "Manual Form Onboarding", formData.email, formData.phone);
           if (!vaultResult.success) {
             alert(`Ownership Vault: Active claim held by another vendor. Dispute ${vaultResult.disputeId} generated.`);
           } else {
             alert("Merged candidate into existing profile successfully.");
           }
         }
      } else {
         const initialCandidate = {
           ...formData,
           fullName: formData.name,
           primaryEmail: formData.email,
           phoneHash: formData.phone,
           skills: getSkillsArray(formData.skills),
           candidateId: finalCandId,
           vendorId: userOrgId,
           pipelineStage: "Added",
           isDuplicate: false,
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp(),
         };
         await setDoc(doc(db, "candidatePool", finalCandId), initialCandidate);
         
         if (candHash) {
           await checkAndClaimOwnership(candHash, userOrgId, formData.name, "Manual Form Onboarding", formData.email, formData.phone);
         }
         alert("Candidate successfully onboarded. Intelligence processing in background.");
      }

      setIsSubmitting(false);
      setShowAddForm(false);

      // AI ENRICHMENT: Trigger background processing if intelligence is available via resume text
      if (formData.resumeText) {
        enrichCandidate(finalCandId, formData.resumeText);
      }

      setFormData({
        name: "",
        email: "",
        phone: "",
        linkedin: "",
        skills: "",
        resumeText: "",
        experience: "",
      });

    } catch (e: any) {
      alert("Manual onboarding failed: " + e.message);
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkText.trim() || !userOrgId) return;
    setIsBulkProcessing(true);
    try {
      const splitResumes = bulkText
        .split("---")
        .map((r) => r.trim())
        .filter((r) => r.length > 10);

      let count = 0;
      for (const text of splitResumes) {
        const candId = "CAND-" + Math.random().toString(36).substr(2, 9);

        await setDoc(doc(db, "candidatePool", candId), {
          name: "Pending Distillation",
          email: `pending@${candId}.local`,
          candidateId: candId,
          vendorId: userOrgId,
          pipelineStage: "Added",
          distillationStatus: "PROCESSING",
          source: "Bulk Text Paste",
          resumeText: text,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Process inline using the AI proxy
        enrichCandidate(candId, text);
        count++;
      }

      setBulkText("");
      setShowBulkUpload(false);

      setProcessingStats({
        show: true,
        total: count,
        processing: count,
        parsed: 0,
        matched: 0,
      });
    } catch (e: any) {
      alert("Bulk upload failed: " + (e.message || "Unknown error"));
    }
    setIsBulkProcessing(false);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    let combinedExtractedText = bulkText;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
        const tempName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ");

        // Simulate Front-end Extraction so user sees immediate results in the textarea
        // Because Firebase Storage might block unauthorized uploads, we bypass it,
        // and instead post directly to our backend extraction pipeline to read the text.
        const formData = new FormData();
        formData.append("file", file);
        let extText = `[Parse Failure Fallback]
The resume text for ${tempName} could not be fully extracted. Please review the original document manually.`;

        try {
          const res = await fetch("/api/extract-text", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) extText = data.text;
          }
        } catch (e) {
          console.warn("Extraction failed, skipping text extraction", e);
        }

        // --- ADD DEDUPLICATION BEFORE SAVING ---
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest(
          "SHA-256",
          encoder.encode(extText),
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const resumeHash = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        try {
          const { getDocs, query, collection, where } =
            await import("firebase/firestore");
          const existingUserQ = query(
            collection(db, "candidatePool"),
            where("resumeHash", "==", resumeHash),
          );
          const existingDocs = await getDocs(existingUserQ);
          if (!existingDocs.empty) {
            console.warn(
              `File ${file.name} is a duplicate submission (resume matched exactly). Skipping.`,
            );
            continue; // Skip this duplicate fully
          }
        } catch (e) {}
        // ----------------------------------------

        if (combinedExtractedText)
          combinedExtractedText += `

---

${extText}`;
        else combinedExtractedText = extText;

        // Create lightweight QUEUED candidate in Firestore
        await setDoc(doc(db, "candidatePool", candId), {
          fullName: tempName,
          name: tempName,
          primaryEmail: "pending@extraction.io",
          email: "pending@extraction.io",
          candidateId: candId,
          vendorId: userOrgId,
          sourceOrganizations: [userOrgId],
          pipelineStage: "Candidate Added",
          source: "Bulk Upload",
          resumeText: extText,
          resumeHash: resumeHash,
          fileName: file.name,
          status: "QUEUED",
          distillationStatus: "PROCESSING",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Process inline using the AI proxy
        enrichCandidate(candId, extText);

        successCount++;
      } catch (err: any) {
        console.error("File upload failed", err);
        failCount++;
      }
    }

    setBulkText("");
    setIsBulkProcessing(false);
    setShowBulkUpload(false);

    if (failCount > 0) {
      setProcessingStats((prev) =>
        prev
          ? {
              ...prev,
              show: true,
              total: successCount,
              processing: successCount,
              parsed: 0,
              matched: 0,
            }
          : null,
      );
      if (successCount === 0) setProcessingStats(null);
    } else {
      setProcessingStats({
        show: true,
        total: successCount,
        processing: successCount,
        parsed: 0,
        matched: 0,
      });
    }
  };

  const enrichCandidate = async (candId: string, text: string) => {
    try {
      console.log(`[OS INTELLIGENCE] Queueing profile for ${candId}...`);

      await updateDoc(doc(db, "candidatePool", candId), {
        distillationStatus: "PROCESSING",
      });

      // Use the existing proxy method to call the API
      const parsedResults = await parseBulkResumes([text]);
      const result =
        parsedResults && parsedResults.length > 0 ? parsedResults[0] : null;

      if (result && result.name && result.name !== "Pending Distillation") {
        let updatePayload: any = {
          ...result,
          fullName: result.name, // Map to new schema
          name: result.name, // Legacy
          primaryEmail: result.email, // Map to new schema
          phoneHash: result.phone, // Map to new schema
          distillationStatus: "COMPLETED",
          updatedAt: serverTimestamp(),
        };
        // Do not override user original data if it exists (for manual form updates)
        if (result.name === "Unnamed Candidate") {
          delete updatePayload.name;
          delete updatePayload.fullName;
        }

        // Update basic payload
        let resolvedCandId = candId;

        // IDENTITY RESOLUTION ENGINE & OWNERSHIP VAULT
        try {
          if (
            result.email &&
            result.email !== "No Email Provided" &&
            result.email !== "" &&
            !result.email.includes("pending@")
          ) {
            const { query, collection, where, getDocs, deleteDoc, getDoc } =
              await import("firebase/firestore");
              
            const candSnap = await getDoc(doc(db, "candidatePool", candId));
            const submissionVendorId = candSnap.exists() ? candSnap.data().vendorId : "UNKNOWN_VENDOR";

            const candHash = await generateIdentityHash(result.email, result.phone !== "No Phone Provided" ? result.phone : "");
            
            if (candHash) {
                const vaultResult = await checkAndClaimOwnership(candHash, submissionVendorId, result.name, "Bulk Upload AI Parse", result.email, result.phone !== "No Phone Provided" ? result.phone : "");
                
                if (!vaultResult.success) {
                   // This vendor doesn't own the candidate, flag as dispute!
                   updatePayload.pipelineStage = "Added";
                   updatePayload.isDuplicate = true;
                   updatePayload.status = "DISPUTED";
                   updatePayload.duplicateReason = `Ownership Vault: Active claim held by another vendor. Dispute ${vaultResult.disputeId} generated.`;
                   // Skip legacy merge so we don't pollute the actual owner's candidate pool record
                } else {
                   // Legacy Identity resolution for UI consolidation
                   const q = query(
                     collection(db, "candidatePool"),
                     where("email", "==", result.email),
                   );
                   const snap = await getDocs(q);
                   const duplicates = snap.docs.filter((d) => d.id !== candId);
       
                   if (duplicates.length > 0) {
                     const primary = duplicates[0];
                     resolvedCandId = primary.id;
                     console.log(
                       `[IDENTITY RESOLUTION] Merging duplicate upload for ${result.email} into existing primary ID: ${resolvedCandId}`,
                     );
                     // Update the primary instead
                     await updateDoc(doc(db, "candidatePool", resolvedCandId), {
                       resumeText:
                         updatePayload.resumeText || primary.data().resumeText,
                       updatedAt: serverTimestamp(),
                     });
                     // Delete the ghost duplicate
                     await deleteDoc(doc(db, "candidatePool", candId));
                     updatePayload = null; // Prevent update of the deleted document
                   }
                }
            }
          }
        } catch (idErr) {
          console.warn("Identity Resolution Error:", idErr);
        }

        if (updatePayload) {
          await updateDoc(
            doc(db, "candidatePool", resolvedCandId),
            updatePayload,
          );

          await publishEvent({
            type: "success",
            title: "Candidate Parsed",
            message: `Intelligence extraction complete for ${result.name}`,
            recipients: ["GLOBAL_ADMIN", "GLOBAL_CLIENT", "GLOBAL_VENDOR"],
          });
        }

        // Update stats
        setProcessingStats((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            processing: Math.max(0, prev.processing - 1),
            parsed: prev.parsed + 1,
          };
        });

        // Phase 4 - Historical Submission Repair
        try {
          const { query, collection, where, getDocs } =
            await import("firebase/firestore");
          const subsRef = collection(db, "submissions");
          const q = query(subsRef, where("candidateId", "==", resolvedCandId));
          const snap = await getDocs(q);
          for (const sDoc of snap.docs) {
            await updateDoc(doc(db, "submissions", sDoc.id), {
              candidateName: result.name,
              name: result.name,
              skills: result.skills || sDoc.data().skills,
              email: result.email || sDoc.data().email,
              phone: result.phone || sDoc.data().phone,
            });
          }
        } catch (e) {
          console.error("Failed to repair history", e);
        }
      } else {
        await updateDoc(doc(db, "candidatePool", candId), {
          distillationStatus: "FAILED",
        });
      }
    } catch (err: any) {
      console.error("Failed to queue enrichment:", err);

      await updateDoc(doc(db, "candidatePool", candId), {
        distillationStatus: "FAILED",
      });
    }
  };

  const isClient = userRole === "client" || userRole?.startsWith("client_");

  const handleMapToJob = async (jobId: string) => {
    if (!selectedCandidate || !jobId) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    if (
      !selectedCandidate.resumeText &&
      (!selectedCandidate.skills || selectedCandidate.skills.length === 0)
    ) {
      alert(
        "INTELLIGENCE GAP ERROR: AI mapping requires resume text or detailed skills. Please update the candidate profile first.",
      );
      setSelectedJobId("");
      return;
    }

    setIsMapping(true);
    setMappingResult(null);
    setSelectedJobId(jobId);

    try {
      const resumeToUse =
        selectedCandidate.resumeText ||
        `Skills: ${getSkillsArray(selectedCandidate.skills).join(", ")}`;
      const res = await fetch("/api/match-candidates-detailed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: job.description,
          candidateProfile: resumeToUse,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMappingResult(data);
        
        // 1. Create submission via Orchestrator
        const { SubmissionOrchestrator } = await import("../lib/workflows/SubmissionOrchestrator");
        const dbId = selectedCandidate.originalId || selectedCandidate.id;
        await SubmissionOrchestrator.submitCandidate({
          candidateData: {
            id: dbId,
            name: selectedCandidate.fullName || selectedCandidate.name || "Unknown",
            email: selectedCandidate.primaryEmail || selectedCandidate.email,
          },
          requirementId: jobId,
          clientId: job.clientId || "HQ",
          vendorId: userOrgId || "HQ",
          submitterId: userRole || "vendor",
          initialStatus: "MATCHED",
          matchScore: data.matchScore || 0
        });

        // 2. Update Candidate Pool
        const { updateDoc, doc, serverTimestamp, arrayUnion } = await import("firebase/firestore");
        await updateDoc(doc(db, "candidatePool", dbId), {
          canonicalRequirementId: jobId,
          mappedJobId: jobId,
          clientId: job.clientId,
          matchScore: data.matchScore,
          matchData: data,
          activePipelines: arrayUnion(jobId),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      alert("Mapping error: " + err.message);
    } finally {
      setIsMapping(false);
    }
  };

  const finalizeDeal = async () => {
    if (!selectedCandidate || !selectedJobId || !mappingResult) return;
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return;

    const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
    const candidateDbId = selectedCandidate.originalId || selectedCandidate.id;

    try {
      const { setDoc, doc, updateDoc, serverTimestamp, collection, addDoc } = await import("firebase/firestore");
      const dealPayload = {
        id: roomId,
        requirementId: selectedJobId,
        candidateId: candidateDbId,
        vendorId: userOrgId,
        clientId: job.clientId,
        candidateName: selectedCandidate.name,
        jobTitle: job.title || "Strategic Role",
        experience: selectedCandidate.experience || "Not Specified",
        status: "ACTIVE",
        currentStage: "shortlisted",
        identitiesRevealed: false,
        createdAt: serverTimestamp(),
        matchData: mappingResult,
      };

      await setDoc(doc(db, "dealRooms", roomId), dealPayload);

      // Submission Orchestrator handles Identity, Ownership, Submission, Ledger
      const { SubmissionOrchestrator } = await import("../lib/workflows/SubmissionOrchestrator");
      const resp = await SubmissionOrchestrator.submitCandidate({
        candidateData: {
          id: candidateDbId,
          name: selectedCandidate.name || selectedCandidate.fullName,
          email: selectedCandidate.email || selectedCandidate.primaryEmail,
        },
        requirementId: selectedJobId,
        clientId: job.clientId,
        vendorId: userOrgId || "HQ",
        submitterId: "HQ_System",
        initialStatus: "SUBMITTED",
        matchScore: mappingResult?.matchScore || 0
      });
      
      if (!resp.success) {
        console.error("Orchestrator failed", resp.message);
      }
      
      await updateDoc(doc(db, "candidatePool", candidateDbId), {
        activeDealId: roomId,
        updatedAt: serverTimestamp(),
      });
      
      await addDoc(collection(db, "notifications"), {
        id: `NOTIF-${Date.now()}`,
        recipientId: job.clientId,
        title: "New Submission",
        text: `A candidate has been submitted for ${job.title}. Deal Room DR-${roomId.slice(0, 6)} is now active.`,
        read: false,
        type: "DEAL_ROOM",
        createdAt: serverTimestamp(),
      });
      
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className="flex h-screen bg-slate-50 relative">
      <div className="p-8 pb-32">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Candidates</h1>
        <p className="text-slate-500 mb-8">AI Studio Data Integrity Check Mode Active. UI temporarily simplified.</p>

      {/* OS Processing Stats Overlay */}
      {processingStats && processingStats.show && (
        <div className="fixed bottom-8 right-8 bg-slate-900 shadow-2xl rounded-2xl p-6 border border-slate-800 w-80 z-50 text-white flex flex-col gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <Activity
                size={16}
                className={
                  processingStats.processing > 0
                    ? "text-indigo-400 animate-spin"
                    : "text-emerald-400"
                }
              />
              <h3 className="font-black text-sm uppercase tracking-wider">
                {processingStats.total} Resumes Received
              </h3>
            </div>
            <button
              onClick={() => setProcessingStats(null)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-300">
              <span>Processing</span>
              <span
                className={
                  processingStats.processing > 0
                    ? "text-indigo-400"
                    : "text-slate-500"
                }
              >
                {processingStats.processing}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-1000"
                style={{
                  width: `${(processingStats.processing / processingStats.total) * 100}%`,
                }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-300 pt-1">
              <span>Parsed</span>
              <span
                className={
                  processingStats.parsed > 0
                    ? "text-emerald-400"
                    : "text-slate-500"
                }
              >
                {processingStats.parsed}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{
                  width: `${(processingStats.parsed / processingStats.total) * 100}%`,
                }}
              ></div>
            </div>

            {/* Note: Matching happens automatically in background via JobsTab */}
          </div>

          {processingStats.processing === 0 && (
            <div className="mt-2 text-[10px] text-emerald-400/80 font-mono text-center bg-emerald-900/30 p-2 rounded border border-emerald-900/50">
              ALL PROCESSES COMPLETED
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
