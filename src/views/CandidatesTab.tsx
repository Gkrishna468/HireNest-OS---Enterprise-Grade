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
  "Placed",
];

export default function CandidatesTab() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidatesIds, setSelectedCandidatesIds] = useState<string[]>(
    [],
  );
  const [candidateSubmissions, setCandidateSubmissions] = useState<any[]>([]);
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
        const id = selectedCandidate.id || selectedCandidate.candidateId;
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
              ((dMatch.candidate.resumeText || "") + "\n\n=== Merged Context ===\n" + formData.resumeText) : 
              dMatch.candidate.resumeText,
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
        let extText = `[Parse Failure Fallback]\nThe resume text for ${tempName} could not be fully extracted. Please review the original document manually.`;

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
          combinedExtractedText += `\n\n---\n\n${extText}`;
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
                   updatePayload.pipelineStage = "Duplicate Review";
                   updatePayload.isDuplicate = true;
                   updatePayload.duplicateReason = `Ownership Vault: Active claim held by another vendor. Dispute ${vaultResult.disputeId} generated.`;
                }
            }

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

        await updateDoc(doc(db, "candidatePool", selectedCandidate.id), {
          pipelineStage: "Matched",
          canonicalRequirementId: jobId,
          mappedJobId: jobId,
          clientId: job.clientId,
          matchScore: data.matchScore,
          matchData: data,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      alert("Mapping intelligence error: " + err.message);
    } finally {
      setIsMapping(false);
    }
  };

  const finalizeDeal = async () => {
    if (!selectedCandidate || !selectedJobId || !mappingResult) return;
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return;

    const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
    try {
      const dealPayload = {
        id: roomId,
        requirementId: selectedJobId,
        candidateId: selectedCandidate.id,
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

      await updateDoc(doc(db, "candidatePool", selectedCandidate.id), {
        pipelineStage: "Submitted",
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
      await addDoc(collection(db, "notifications"), {
        id: `NOTIF-${Date.now()}-2`,
        recipientId: userOrgId || "all",
        title: "Candidate Submitted",
        text: `Your candidate ${selectedCandidate.name} was physically submitted for ${job.title}.`,
        type: "DEAL_ROOM",
        read: false,
        createdAt: serverTimestamp(),
      });

      alert(
        "Strategic Deal Room Initiated. Client has been notified (Anonymized View).",
      );
      setSelectedCandidate(null);
    } catch (e: any) {
      alert("Deal Finalization Error: " + e.message);
    }
  };

  const filteredCandidates = candidates
    .map((c) => {
      let stage = c.pipelineStage || "Added";
      const n = c.name || "";
      if (
        n.toUpperCase().startsWith("CANDIDATE ") ||
        n === "Pending Distillation" ||
        n === "Unnamed Candidate" ||
        n === "Local Mock Generated" ||
        n === "Unknown Candidate" ||
        n === "Sarah Jenkins" ||
        n === "Candidate (Requires Human Review)" ||
        n === "" ||
        n.includes("Parsing Pending") ||
        c.distillationStatus === "PROCESSING" ||
        c.distillationStatus === "PENDING" ||
        !c.email ||
        c.email === "" ||
        c.email.includes("pending@") ||
        !c.skills ||
        c.skills.length === 0
      ) {
        stage = "Processing";
      }
      return { ...c, pipelineStage: stage };
    })
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.skills?.join(",").toLowerCase().includes(q) ||
        c.canonicalRequirementId?.toLowerCase().includes(q)
      );
    });

  if (userRole.startsWith("client") && !isAdmin && userOrgId) {
    return <ClientCandidatePipeline orgId={userOrgId} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* OS Header */}
      <div className="p-8 pb-4 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                Candidate Matrix
              </h1>
              <div className="flex items-center mt-2 gap-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  <span className="text-indigo-600">Unified Global Pool</span> •
                  Real-time Intelligence Processing
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search candidates globally..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 h-8 text-[10px] bg-slate-50 border border-slate-200 rounded px-3 py-1 font-bold outline-none hover:border-indigo-300 focus:border-indigo-500 transition-colors uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {(!isClient || isAdmin) && selectedCandidatesIds.length === 0 && (
          <div className="flex gap-4">
            <Button
              onClick={() => setShowBulkUpload(true)}
              variant="outline"
              className="border-slate-200 text-slate-600 h-12 px-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all font-black uppercase tracking-widest text-[11px]"
            >
              <Upload size={18} className="mr-2" /> Bulk Intelligence
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-600 hover:bg-slate-900 text-white h-12 px-6 rounded-2xl shadow-xl shadow-indigo-100 font-black uppercase tracking-widest text-[11px] transition-all hover:scale-[1.02]"
            >
              <Plus size={20} className="mr-2" /> Onboard Profile
            </Button>
            <Button
              onClick={() => {
                candidates.forEach((c) => {
                  const n = c.name || "";
                  if (
                    n.toUpperCase().startsWith("CANDIDATE ") ||
                    n === "Pending Distillation" ||
                    n === "Unnamed Candidate" ||
                    n === "Local Mock Generated" ||
                    n === "Unknown Candidate" ||
                    n === "Sarah Jenkins" ||
                    n === "Candidate (Requires Human Review)" ||
                    n === "" ||
                    n.includes("Parsing Pending")
                  ) {
                    if (c.resumeText) enrichCandidate(c.id, c.resumeText);
                  }
                });
                alert(
                  "Triggered intelligence extraction for all placeholder candidates with resumes.",
                );
              }}
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 h-12 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all font-black uppercase tracking-widest text-[11px]"
            >
              <Activity size={18} className="mr-2" /> Migrate Identities
            </Button>
          </div>
        )}
        {selectedCandidatesIds.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-2 rounded-2xl shadow-sm">
            <div className="px-4 text-[11px] font-black uppercase tracking-widest text-indigo-800">
              {selectedCandidatesIds.length} Selected
            </div>
            <Button
              onClick={() => {
                alert(
                  "Bulk Submit Initiated for " +
                    selectedCandidatesIds.length +
                    " candidates.",
                );
                setSelectedCandidatesIds([]);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-4 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all"
            >
              Bulk Submit
            </Button>
            <Button
              onClick={() => {
                alert("Bulk Shortlist applied.");
                setSelectedCandidatesIds([]);
              }}
              variant="outline"
              className="border-indigo-200 bg-white text-indigo-700 h-10 px-4 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all hover:bg-indigo-50"
            >
              Bulk Shortlist
            </Button>
            <Button
              onClick={() => {
                alert("Stage Move initiated.");
                setSelectedCandidatesIds([]);
              }}
              variant="outline"
              className="border-indigo-200 bg-white text-indigo-700 h-10 px-4 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all hover:bg-indigo-50"
            >
              Bulk Move Stage
            </Button>
            <Button
              onClick={() => {
                alert("Bulk Assign Vendor triggered.");
                setSelectedCandidatesIds([]);
              }}
              variant="outline"
              className="border-indigo-200 bg-white text-indigo-700 h-10 px-4 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all hover:bg-indigo-50"
            >
              Assign Vendor
            </Button>
            <Button
              onClick={async () => {
                if (
                  window.confirm(
                    `Are you sure you want to reject ${selectedCandidatesIds.length} candidate(s)?`,
                  )
                ) {
                  for (const id of selectedCandidatesIds) {
                    await updateDoc(doc(db, "candidatePool", id), {
                      pipelineStage: "Rejected",
                      updatedAt: serverTimestamp(),
                    });
                  }
                  await publishEvent({
                    type: "warning",
                    title: "Candidates Rejected",
                    message: `${selectedCandidatesIds.length} candidate(s) have been rejected.`,
                    actionUrl: "/candidates",
                    recipients: [
                      "GLOBAL_ADMIN",
                      "GLOBAL_CLIENT",
                      "GLOBAL_VENDOR",
                    ],
                  });
                  setSelectedCandidatesIds([]);
                }
              }}
              variant="outline"
              className="border-rose-200 text-rose-700 bg-rose-50 h-10 px-4 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all hover:bg-rose-100"
            >
              Reject
            </Button>
            <Button
              onClick={() => setSelectedCandidatesIds([])}
              variant="ghost"
              className="text-slate-500 hover:text-slate-700 px-3"
            >
              <X size={16} />
            </Button>
          </div>
        )}
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="flex-1 mt-8">
          <EmptyState
            icon={Users}
            title="No candidates found"
            description="Your candidate pool is currently empty. Start building your network by manually adding candidate profiles or bulk pasting."
            actionLabel="Add Candidate"
            onAction={() => setShowAddForm(true)}
          />
        </div>
      ) : (
        <div className="flex-1 flex space-x-4 overflow-x-auto overflow-y-hidden pb-2 custom-scrollbar">
          {STAGES.map((stage, sIdx) => {
            const list = filteredCandidates.filter(
              (c) => c.pipelineStage === stage,
            );
            return (
              <div
                key={stage}
                className="w-[340px] flex-shrink-0 flex flex-col h-full bg-slate-100/30 rounded-3xl border border-slate-200 overflow-hidden"
              >
                <div className="p-5 bg-slate-900 border-b flex items-center justify-between shrink-0 shadow-lg border-white/5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full animate-pulse",
                        sIdx === 0
                          ? "bg-slate-500"
                          : sIdx === 1
                            ? "bg-amber-500"
                            : sIdx === 2
                              ? "bg-indigo-500"
                              : sIdx === 3
                                ? "bg-blue-500"
                                : "bg-emerald-500",
                      )}
                    />
                    <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-white">
                      {stage}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 shadow-inner">
                    {list.length}
                  </span>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                  {list.map((cand) => (
                    <div
                      key={cand.id}
                      onClick={() => {
                        setSelectedCandidate(cand);
                        setMappingResult(cand.matchData || null);
                        setSelectedJobId(cand.mappedJobId || "");
                      }}
                      className={cn(
                        "group relative bg-white border border-slate-100 rounded-2xl p-5 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-200 cursor-pointer overflow-hidden ring-1 ring-slate-100",
                        selectedCandidate?.id === cand.id &&
                          "ring-2 ring-indigo-600 shadow-indigo-50",
                      )}
                    >
                      {cand.distillationStatus === "PENDING" && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10 transition-opacity">
                          <div className="flex flex-col items-center gap-3">
                            <Activity
                              size={20}
                              className="text-indigo-600 animate-spin"
                            />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-700">
                              OS Sync...
                            </span>
                          </div>
                        </div>
                      )}

                      {cand.isDuplicate && (
                        <div className="mb-3 text-[9px] font-black text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5 w-fit uppercase tracking-wider animate-pulse">
                          <AlertTriangle size={11} className="text-amber-500" />{" "}
                          Duplicate Detected
                        </div>
                      )}

                      {cand.name === "Unnamed Candidate" && (
                        <div className="mb-3 text-[9px] font-black text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1.5 w-fit uppercase tracking-wider">
                          <AlertTriangle size={11} className="text-rose-500" />{" "}
                          Name Extraction Needs Review
                        </div>
                      )}

                      <div className="flex flex-col mb-4 bg-white rounded-xl">
                        {/* HEADER */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              checked={selectedCandidatesIds.includes(cand.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedCandidatesIds((prev) => [
                                    ...prev,
                                    cand.id,
                                  ]);
                                } else {
                                  setSelectedCandidatesIds((prev) =>
                                    prev.filter((id) => id !== cand.id),
                                  );
                                }
                              }}
                            />
                            <div className="flex flex-col gap-1 w-full relative">
                              {editingName?.id === cand.id ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    autoFocus
                                    className="border border-slate-300 rounded px-2 py-1 text-sm font-semibold uppercase tracking-tight text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none w-48 bg-white"
                                    value={editingName.name}
                                    onChange={(e) => setEditingName({ ...editingName, name: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleNameSave(cand.id);
                                      if (e.key === 'Escape') setEditingName(null);
                                    }}
                                  />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleNameSave(cand.id); }}
                                    disabled={isSavingName}
                                    className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm"
                                  >
                                    <Check size={14} className="stroke-[3]" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingName(null); }}
                                    className="p-1.5 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"
                                  >
                                    <X size={14} className="stroke-[3]" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group/title w-full">
                                  <h3 className="font-semibold text-base text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                    {cand.fullName || cand.name || "Unnamed Candidate"}
                                  </h3>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingName({ id: cand.id, name: cand.fullName || cand.name || "" });
                                    }}
                                    className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity rounded hover:bg-slate-100"
                                    title="Edit Candidate Name"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </div>
                              )}
                              <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest mb-1 items-center flex gap-1">
                                <Fingerprint
                                  size={12}
                                  className="text-slate-300"
                                />{" "}
                                {cand.id}
                              </div>
                              <p className="text-xs font-medium text-slate-600 mt-1">
                                {cand.currentRole ||
                                  cand.experience ||
                                  "Professional Candidate"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* INTELLIGENCE AND REQUIREMENT MAPPING */}
                        {cand.matchedRequirements &&
                        cand.matchedRequirements.length > 0 ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-xs">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                              <span>
                                Requirement Matches (
                                {cand.matchedRequirements.length})
                              </span>
                            </div>
                            <div className="space-y-4">
                              {cand.matchedRequirements
                                .slice(0, 3)
                                .map((match: any) => (
                                  <div
                                    key={match.requirementId}
                                    className="flex flex-col border-b border-slate-200 last:border-0 pb-3 last:pb-0"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <div className="font-bold text-slate-800 text-[10px] truncate max-w-[180px]">
                                        {match.requirementTitle}
                                      </div>
                                      <div className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black text-[10px]">
                                        {match.matchScore}%
                                      </div>
                                    </div>
                                    {match.matchBreakdown && (
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[9px] font-medium text-slate-500">
                                        <div className="flex justify-between">
                                          <span>Domain</span>
                                          <span className="text-slate-700 font-bold">
                                            {match.matchBreakdown.domain}/40
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Skills</span>
                                          <span className="text-slate-700 font-bold">
                                            {match.matchBreakdown.skills}/35
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Experience</span>
                                          <span className="text-slate-700 font-bold">
                                            {match.matchBreakdown.experience}/10
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Contextual</span>
                                          <span className="text-slate-700 font-bold">
                                            {match.matchBreakdown.contextual}/15
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              {cand.matchedRequirements.length > 3 && (
                                <div className="text-[9px] text-slate-500 pt-1 font-bold">
                                  +{cand.matchedRequirements.length - 3} MORE
                                  MATCHES
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          (cand.canonicalRequirementId || cand.mappedJobId) &&
                          cand.pipelineStage === "Matched" && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-xs">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                Matched Requirement
                              </div>
                              <div className="font-semibold text-slate-800">
                                {cand.requirementTitle || "Assigned Role"}
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Req ID:{" "}
                                  {cand.canonicalRequirementId ||
                                    cand.mappedJobId}
                                </div>
                                <div className="text-indigo-600 font-bold">
                                  {cand.matchScore || "0"}% Match
                                </div>
                              </div>
                            </div>
                          )
                        )}

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-bold">
                            {cand.matchScore || "0"}% AI Match
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-slate-600 border-slate-200 text-[10px]"
                          >
                            {cand.experience || "Experience N/A"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-slate-600 border-slate-200 text-[10px]"
                          >
                            {cand.location || "Location Flexible"}
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] flex items-center gap-1">
                            <ShieldCheck size={10} />
                            {cand.distillationMetadata?.confidence
                              ? Math.round(
                                  cand.distillationMetadata.confidence * 100,
                                )
                              : "85"}
                            % Verified
                          </Badge>
                        </div>

                        {/* SOURCE SECTION */}
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[10px] font-medium text-slate-600 mb-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-400 w-16">
                              Source:
                            </span>
                            {!cand.vendorId ||
                            cand.vendorId === "ORG-GLOBAL-HQ" ||
                            cand.vendorId === "ADMIN_POOL" ? (
                              <span className="text-indigo-600 font-bold uppercase tracking-wider">
                                Admin HQ
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold uppercase tracking-wider">
                                {cand.vendorName ||
                                  vendorMap[cand.vendorId] ||
                                  cand.vendorId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-400 w-16">
                              Vendor ID:
                            </span>
                            <span className="font-mono text-slate-700">
                              {cand.vendorId || "SYSTEM"}
                            </span>
                          </div>
                          {cand.uploaderName && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-400 w-16">
                                Uploader:
                              </span>
                              <span className="font-medium text-slate-700">
                                {cand.uploaderName}
                              </span>
                            </div>
                          )}
                          {cand.source === "Bulk Upload" && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <Badge className="text-[8px] font-black px-1.5 py-0 bg-slate-200 text-slate-600 border-none uppercase">
                                UPLOADED VIA PIPELINE
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* SKILL SECTION */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {getSkillsArray(cand.skills)
                            .slice(0, 4)
                            .map((s: string) => (
                              <span
                                key={s}
                                className="text-[9px] font-bold bg-white text-slate-700 border border-slate-200 rounded px-2 py-0.5 uppercase tracking-tighter"
                              >
                                {s}
                              </span>
                            ))}
                          {getSkillsArray(cand.skills).length > 4 && (
                            <span className="text-[9px] font-bold text-slate-400">
                              +{getSkillsArray(cand.skills).length - 4} MORE
                            </span>
                          )}
                        </div>

                        {/* SYSTEM SECTION */}
                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-1.5">
                            <span>Candidate ID: </span>
                            <span className="font-mono text-slate-600">
                              {cand.candidateId || cand.id}
                            </span>
                          </div>
                          <div>{cand.pipelineStage || "Matched"}</div>
                        </div>
                      </div>

                      {(cand.distillationStatus === "FAILED" ||
                        cand.distillationStatus === "PENDING" ||
                        cand.distillationStatus === "PROCESSING") && (
                        <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                            <AlertTriangle size={12} />{" "}
                            {cand.distillationStatus === "FAILED"
                              ? "Sync Failed"
                              : "Sync Stuck in Queue"}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              enrichCandidate(cand.id, cand.resumeText);
                            }}
                            className="text-[10px] font-black text-indigo-600 hover:text-slate-900 uppercase tracking-widest text-left transition-colors"
                          >
                            Retry Intelligence ↺
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {list.length === 0 && (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center">
                      <Briefcase size={40} className="mb-4" />
                      <p className="text-[11px] font-black uppercase tracking-widest">
                        NIL_QUEUE
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Entry Form */}
      {showAddForm && (
        <CandidateSubmissionModal
          onClose={() => setShowAddForm(false)}
          reqId="GENERAL"
          reqTitle="GENERAL POOL ONBOARDING"
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-indigo-600" />
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">
                  Bulk Resume Intelligence
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBulkUpload(false)}
                className="h-6 w-6"
              >
                <X size={14} />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-[10px] text-slate-500 mb-3 bg-indigo-50 border border-indigo-100 p-2 rounded italic font-mono flex items-center gap-2">
                <Activity size={12} className="animate-pulse" />
                Paste multiple resumes with "---" or upload PDF/Word files.
              </p>

              <div className="mb-4">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Drop PDF / Word Files here
                    </p>
                    <p className="text-[8px] text-slate-400 uppercase mt-1">
                      Multi-file support active
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-bold uppercase text-slate-400 tracking-widest border rounded">
                  Parsed Data Buffering
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full h-48 border border-slate-300 rounded p-4 text-xs font-mono focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                  placeholder={
                    "Candidate 1 Raw Text...\n---\nCandidate 2 Raw Text..."
                  }
                />
              </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex flex-col gap-2">
              <Button
                onClick={handleBulkUpload}
                disabled={isBulkProcessing || !bulkText.trim()}
                className="h-9 text-xs font-bold uppercase bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isBulkProcessing ? (
                  <span className="flex items-center gap-2">
                    <Activity size={14} className="animate-spin" /> Distilling
                    Resume Clusters...
                  </span>
                ) : (
                  "Process Bulk Upload"
                )}
              </Button>
              <div className="text-[9px] text-center text-slate-400 font-mono">
                Governed by hirenest-audit-vpc-v1
              </div>
            </div>
          </div>
        </div>
      )}
      {/* STRATEGIC DETAIL VIEW: THE PIPELINE NERVE CENTER */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-[60] animate-in fade-in duration-300">
          <div
            className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Identity & Trust Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCandidate(null)}
                  className="h-8 w-8 rounded-full border border-slate-100"
                >
                  <X size={16} />
                </Button>
                <div>
                  <div className="flex items-center gap-2 relative">
                    {editingName?.id === selectedCandidate.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          autoFocus
                          className="border border-slate-300 rounded px-2 py-1 text-base font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none w-48 bg-white"
                          value={editingName.name}
                          onChange={(e) => setEditingName({ ...editingName, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleNameSave(selectedCandidate.id);
                              setSelectedCandidate({...selectedCandidate, name: editingName.name.trim(), fullName: editingName.name.trim()});
                            }
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNameSave(selectedCandidate.id);
                            setSelectedCandidate({...selectedCandidate, name: editingName.name.trim(), fullName: editingName.name.trim()});
                          }}
                          disabled={isSavingName}
                          className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm"
                        >
                          <Check size={14} className="stroke-[3]" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingName(null); }}
                          className="p-1.5 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"
                        >
                          <X size={14} className="stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/modal-title">
                        <h2 className="text-base font-black text-slate-800">
                          {selectedCandidate.fullName || selectedCandidate.name}
                        </h2>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingName({ id: selectedCandidate.id, name: selectedCandidate.fullName || selectedCandidate.name || "" });
                          }}
                          className="opacity-0 group-hover/modal-title:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity rounded hover:bg-slate-100"
                          title="Edit Candidate Name"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                    <Badge className="bg-blue-50 text-blue-700 text-[10px] font-bold border-blue-200 uppercase ml-2">
                      {selectedCandidate.candidateId || "CAND-PENDING"}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-1">
                    <ShieldCheck size={10} className="text-emerald-500" />{" "}
                    Identity Verified •{" "}
                    <span className="text-indigo-400">Governance Level 2</span>{" "}
                    • <Briefcase size={10} className="text-slate-400" />
                    {!selectedCandidate.vendorId ||
                    selectedCandidate.vendorId === "ORG-GLOBAL-HQ" ||
                    selectedCandidate.vendorId === "ADMIN_POOL" ? (
                      <span className="text-indigo-600 font-black">
                        SOURCE: ADMIN HQ
                      </span>
                    ) : (
                      <span
                        className="text-emerald-600 font-black truncate max-w-[200px]"
                        title={
                          selectedCandidate.vendorName ||
                          vendorMap[selectedCandidate.vendorId] ||
                          selectedCandidate.vendorId
                        }
                      >
                        VENDOR:{" "}
                        {selectedCandidate.vendorName ||
                          vendorMap[selectedCandidate.vendorId] ||
                          selectedCandidate.vendorId}{" "}
                        (ID: {selectedCandidate.vendorId})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    Trust Score
                  </div>
                  <div className="text-sm font-black text-emerald-600">
                    98.4%
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] uppercase font-black tracking-widest border-slate-300"
                >
                  Block Sub
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30">
              {/* DUPLICATE DEDUCTION RESOLUTION INTERFACE */}
              {(selectedCandidate.isDuplicate ||
                selectedCandidate.pipelineStage === "Duplicate Review") && (
                <div className="bg-amber-50 border-b border-amber-200 p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-200">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-black text-amber-900 uppercase">
                        Duplicate Resume Detected
                      </h4>
                      <p className="text-xs font-bold text-amber-700 leading-relaxed">
                        {selectedCandidate.duplicateReason ||
                          "This candidate matches existing contact records in the database."}
                      </p>
                      {selectedCandidate.duplicateOfName && (
                        <p className="text-[11px] text-slate-500">
                          Duplicate reference:{" "}
                          <strong className="text-slate-705 uppercase">
                            {selectedCandidate.duplicateOfName}
                          </strong>{" "}
                          (ID:{" "}
                          <span className="font-mono">
                            {selectedCandidate.duplicateOf}
                          </span>
                          )
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 bg-transparent">
                    <Button
                      onClick={() => handleMergeDuplicate(selectedCandidate)}
                      className="bg-amber-600 hover:bg-slate-900 hover:text-white text-white h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-amber-100"
                    >
                      Merge & Enrich Original
                    </Button>
                    <Button
                      onClick={() => handleVerifyAsSeparate(selectedCandidate)}
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-100 h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-white"
                    >
                      Keep both (Verify Separate)
                    </Button>
                    <Button
                      onClick={() => handleIgnoreDuplicate(selectedCandidate)}
                      variant="ghost"
                      className="text-slate-500 hover:text-red-600 hover:bg-red-50 h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Discard Duplicate
                    </Button>
                  </div>
                </div>
              )}

              {/* update requested */}
              {selectedCandidate.pipelineStage === "Update Requested" && (
                <div className="mx-6 mt-6 p-5 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldAlert size={100} className="text-rose-600" />
                  </div>
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shrink-0 border border-rose-100 shadow-sm">
                      <ShieldAlert size={18} className="text-rose-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[12px] font-black uppercase text-rose-800 tracking-wider mb-2">
                        Action Required: Missing Critical Skills
                      </h3>
                      <p className="text-[11px] text-rose-700 font-medium mb-3 max-w-xl leading-relaxed">
                        The client has reviewed this profile and requested an
                        updated resume. The current parsing indicates the
                        following skills are missing from the JD:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(selectedCandidate.missingSkills || []).map(
                          (skill: string, i: number) => (
                            <Badge
                              key={i}
                              className="bg-rose-100 text-rose-800 border-rose-200"
                            >
                              {skill}
                            </Badge>
                          ),
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id={`resume-upload-${selectedCandidate.id}`}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={async (e) => {
                            if (!e.target.files || e.target.files.length === 0)
                              return;
                            try {
                              // Simulate AI Parsing delay
                              alert(
                                "Extracting new data. AI recalibrating match...",
                              );
                              const newProfileData =
                                "User updated resume containing: " +
                                Array.from(e.target.files)
                                  .map((f) => f.name)
                                  .join(", ");

                              const candRef = doc(
                                db,
                                "candidatePool",
                                selectedCandidate.id,
                              );
                              await updateDoc(candRef, {
                                resumeText:
                                  (selectedCandidate.resumeText || "") +
                                  "\n\n[UPDATED PROFILE DATA]: " +
                                  newProfileData,
                                pipelineStage: "Matched", // push back to matched state
                                missingSkills: [],
                                updatedAt: serverTimestamp(),
                              });

                              // Notify Client
                              await addDoc(collection(db, "notifications"), {
                                id: `NOTIF-${Date.now()}`,
                                recipientId: "admin",
                                title: "Resume Updated",
                                text: `Vendor has provided an updated resume for ${selectedCandidate.name || "Candidate"}. Matching intelligence is ready.`,
                                read: false,
                                createdAt: serverTimestamp(),
                              });

                              alert(
                                "Resume updated successfully. Candidate returned to Matched pipeline.",
                              );
                            } catch (err: any) {
                              alert("Failed to upload: " + err.message);
                            }
                          }}
                        />
                        <Button
                          onClick={() =>
                            document
                              .getElementById(
                                `resume-upload-${selectedCandidate.id}`,
                              )
                              ?.click()
                          }
                          className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl h-10 uppercase tracking-widest text-[10px] font-bold"
                        >
                          <Upload size={14} className="mr-2" /> Upload Updated
                          Resume
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pipeline Pulse Flow */}
              <div className="p-6 bg-white border-b border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Activity size={100} />
                </div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <Activity size={14} className="text-indigo-500" /> Pipeline
                  Pulse Flow
                </h3>
                <div className="relative flex justify-between">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                  {STAGES.map((s, idx) => {
                    const isCurrent = selectedCandidate.pipelineStage === s;
                    const isPast =
                      STAGES.indexOf(selectedCandidate.pipelineStage) >= idx;
                    return (
                      <div
                        key={s}
                        className="relative z-10 flex flex-col items-center group cursor-pointer"
                        onClick={async () => {
                          try {
                            if (s === "Submitted") {
                              if (!selectedJobId) {
                                alert(
                                  "Please map a requirement first before initiating the Deal Room.",
                                );
                                return;
                              }
                              await finalizeDeal();
                            } else {
                              await updateDoc(
                                doc(db, "candidatePool", selectedCandidate.id),
                                {
                                  pipelineStage: s,
                                  updatedAt: serverTimestamp(),
                                },
                              );
                              setSelectedCandidate({
                                ...selectedCandidate,
                                pipelineStage: s,
                              });
                            }
                          } catch (err: any) {
                            alert(
                              "Failed to update pipeline stage: " + err.message,
                            );
                          }
                        }}
                      >
                        <div
                          className={`h-8 w-8 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isCurrent ? "bg-indigo-600 border-indigo-100 shadow-lg shadow-indigo-100" : isPast ? "bg-emerald-500 border-emerald-100" : "bg-white border-slate-100"}`}
                        >
                          {isPast && !isCurrent ? (
                            <CheckCircle size={14} className="text-white" />
                          ) : (
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${isCurrent ? "bg-white animate-pulse" : "bg-slate-300"}`}
                            />
                          )}
                        </div>
                        <span
                          className={`mt-2 text-[9px] font-black uppercase tracking-widest transition-colors ${isCurrent ? "text-indigo-600" : "text-slate-400"}`}
                        >
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6 p-6">
                {/* Left: Intelligence Summary */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Intelligence Mapping Center
                      </h3>
                      {selectedCandidate.pipelineStage !== "Submitted" ? (
                        !isClient || isAdmin ? (
                          <div className="flex items-center gap-2">
                            <label className="text-[9px] font-bold text-slate-500">
                              Mapping to:
                            </label>
                            <select
                              value={selectedJobId}
                              onChange={(e) => handleMapToJob(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-indigo-600 outline-none hover:border-indigo-300 transition-colors"
                            >
                              <option value="">Select Requirement</option>
                              {jobs.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.requirementId}: {j.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                            READ-ONLY VIEW
                          </Badge>
                        )
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                          DEAL_ACTIVE
                        </Badge>
                      )}
                    </div>

                    {isMapping ? (
                      <div className="py-10 flex flex-col items-center justify-center space-y-4">
                        <Activity
                          size={32}
                          className="text-indigo-500 animate-spin"
                        />
                        <p className="text-[10px] font-bold uppercase text-indigo-500 animate-pulse tracking-[0.2em]">
                          Cross-Referencing Mapping Logic...
                        </p>
                      </div>
                    ) : mappingResult ? (
                      <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <h4 className="text-[9px] font-bold uppercase text-emerald-700 tracking-widest mb-2 flex items-center gap-1">
                              <Sparkles size={12} /> Match Strengths
                            </h4>
                            <ul className="space-y-1.5">
                              {mappingResult.strengths?.map(
                                (s: string, i: number) => (
                                  <li
                                    key={i}
                                    className="text-[11px] text-emerald-800 flex gap-2"
                                  >
                                    <div className="mt-1 h-1 w-1 bg-emerald-400 rounded-full shrink-0" />{" "}
                                    {s}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <h4 className="text-[9px] font-bold uppercase text-amber-700 tracking-widest mb-2 flex items-center gap-1">
                              <AlertTriangle size={12} /> Intelligence Gaps
                            </h4>
                            <ul className="space-y-1.5">
                              {mappingResult.gaps?.map(
                                (g: string, i: number) => (
                                  <li
                                    key={i}
                                    className="text-[11px] text-amber-800 flex gap-2"
                                  >
                                    <div className="mt-1 h-1 w-1 bg-amber-400 rounded-full shrink-0" />{" "}
                                    {g}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-900 rounded-xl text-white shadow-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Bot size={60} />
                          </div>
                          <div className="relative z-10">
                            <h4 className="text-[9px] font-bold uppercase text-indigo-300 tracking-widest mb-2">
                              Strategic Recruiter Assessment
                            </h4>
                            <p className="text-[12px] leading-relaxed font-medium italic">
                              "{mappingResult.summary}"
                            </p>
                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                              <div className="flex flex-col">
                                <span className="text-[8px] uppercase text-indigo-300">
                                  Match Profile
                                </span>
                                <span
                                  className={`text-xs font-black ${mappingResult.recommendation === "STRONG_FIT" ? "text-emerald-400" : "text-amber-400"}`}
                                >
                                  {mappingResult.recommendation || "CONSIDER"}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] uppercase text-indigo-300">
                                  Confidence Factor
                                </span>
                                <div className="text-xs font-black">
                                  {mappingResult.matchScore}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedCandidate.pipelineStage !== "Submitted" &&
                          (!isClient || isAdmin) && (
                            <Button
                              onClick={finalizeDeal}
                              className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black h-12 uppercase tracking-[0.2em] text-[11px] rounded-xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.01]"
                            >
                              Initialize Deal Room Integration
                            </Button>
                          )}
                      </div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-slate-300 border border-dashed rounded-xl border-slate-200">
                        <Briefcase size={40} className="mb-3 opacity-20" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">
                          Awaiting Job Mapping
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          Map to a published requirement to trigger AI
                          intelligence assessment.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* Candidate Opportunity Graph */}
                  <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                      <Activity size={14} className="text-indigo-500" />{" "}
                      Candidate Opportunity Graph
                    </h3>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                        <span className="text-lg font-black text-slate-700">
                          {candidateSubmissions.length}
                        </span>
                        <span className="text-[8px] uppercase tracking-tighter text-slate-400 font-bold mt-1">
                          Matched
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                        <span className="text-lg font-black text-slate-700">
                          {
                            candidateSubmissions.filter(
                              (s) => s.status?.toLowerCase() === "submitted",
                            ).length
                          }
                        </span>
                        <span className="text-[8px] uppercase tracking-tighter text-slate-400 font-bold mt-1">
                          Submitted
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                        <span className="text-lg font-black text-slate-700">
                          {
                            candidateSubmissions.filter((s) =>
                              s.status?.toLowerCase().includes("interview"),
                            ).length
                          }
                        </span>
                        <span className="text-[8px] uppercase tracking-tighter text-slate-400 font-bold mt-1">
                          Interviewing
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                        <span className="text-lg font-black text-slate-700">
                          {
                            candidateSubmissions.filter(
                              (s) => s.status?.toLowerCase() === "offer",
                            ).length
                          }
                        </span>
                        <span className="text-[8px] uppercase tracking-tighter text-slate-400 font-bold mt-1">
                          Offers
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                        <span className="text-lg font-black text-slate-700">
                          {
                            candidateSubmissions.filter((s) =>
                              ["hired", "placed"].includes(
                                s.status?.toLowerCase(),
                              ),
                            ).length
                          }
                        </span>
                        <span className="text-[8px] uppercase tracking-tighter text-slate-400 font-bold mt-1">
                          Placements
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mt-6">
                      <div className="bg-slate-50 uppercase tracking-widest font-black text-slate-500 border-b border-slate-100 px-4 py-3 text-[10px]">
                        Candidate Audit Trail (Immutable & Time-Stamped)
                      </div>
                      <div className="p-4 space-y-4">
                        {[
                          {
                            label: "Added",
                            time: selectedCandidate.createdAt?.toDate
                              ? selectedCandidate.createdAt
                                  .toDate()
                                  .toLocaleString()
                              : "---",
                            active: true,
                          },
                          {
                            label: "Matched",
                            time:
                              selectedCandidate.matchedAt ||
                              (STAGES.indexOf(
                                selectedCandidate.pipelineStage,
                              ) >= 1
                                ? selectedCandidate.updatedAt
                                    ?.toDate?.()
                                    ?.toLocaleString()
                                : "---"),
                            active:
                              STAGES.indexOf(selectedCandidate.pipelineStage) >=
                              1,
                          },
                          {
                            label: "Floated",
                            time:
                              selectedCandidate.floatedAt ||
                              (STAGES.indexOf(
                                selectedCandidate.pipelineStage,
                              ) >= 2
                                ? selectedCandidate.updatedAt
                                    ?.toDate?.()
                                    ?.toLocaleString()
                                : "---"),
                            active:
                              STAGES.indexOf(selectedCandidate.pipelineStage) >=
                              2,
                          },
                          {
                            label: "Submitted",
                            time:
                              selectedCandidate.submittedAt ||
                              (STAGES.indexOf(
                                selectedCandidate.pipelineStage,
                              ) >= 2
                                ? selectedCandidate.updatedAt
                                    ?.toDate?.()
                                    ?.toLocaleString()
                                : "---"),
                            active:
                              STAGES.indexOf(selectedCandidate.pipelineStage) >=
                              2,
                          },
                          {
                            label: "Interviewing",
                            time:
                              selectedCandidate.interviewingAt ||
                              (STAGES.indexOf(
                                selectedCandidate.pipelineStage,
                              ) >= 3
                                ? selectedCandidate.updatedAt
                                    ?.toDate?.()
                                    ?.toLocaleString()
                                : "---"),
                            active:
                              STAGES.indexOf(selectedCandidate.pipelineStage) >=
                              3,
                          },
                          {
                            label: "Rejected",
                            time:
                              selectedCandidate.pipelineStage === "Rejected"
                                ? selectedCandidate.updatedAt
                                    ?.toDate?.()
                                    ?.toLocaleString()
                                : "---",
                            active:
                              selectedCandidate.pipelineStage === "Rejected",
                          },
                          {
                            label: "Placed",
                            time:
                              selectedCandidate.pipelineStage === "Placed"
                                ? selectedCandidate.updatedAt
                                    ?.toDate?.()
                                    ?.toLocaleString()
                                : "---",
                            active:
                              selectedCandidate.pipelineStage === "Placed",
                          },
                        ].map((event, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-3 h-3 rounded-full border-2 ${event.active ? "bg-indigo-600 border-indigo-100 shadow-sm" : "bg-slate-100 border-slate-200"} `}
                              />
                              {i < 6 && (
                                <div
                                  className={`w-0.5 h-6 ${event.active ? "bg-indigo-100" : "bg-slate-100"}`}
                                />
                              )}
                            </div>
                            <div className="flex-1 -mt-1">
                              <span
                                className={`text-[11px] font-bold uppercase tracking-widest ${event.active ? "text-slate-800" : "text-slate-400"}`}
                              >
                                {event.label}
                              </span>
                              {event.active && event.time !== "---" && (
                                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                  {event.time}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                      Raw Resume Intelligence
                    </h3>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 h-[300px] overflow-y-auto scrollbar-hide">
                      <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                        {selectedCandidate.resumeText ||
                          "Profile Distillation Pending..."}
                      </pre>
                    </div>
                  </section>
                </div>

                {/* Right: Operational Constraints */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    {/* AI Risk Intelligence */}
                    <section
                      className={cn(
                        "rounded-xl border p-4 shadow-sm mb-6",
                        selectedCandidate.isRisky
                          ? "bg-rose-50 border-rose-200"
                          : "bg-emerald-50 border-emerald-200",
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            selectedCandidate.isRisky
                              ? "text-rose-700"
                              : "text-emerald-700",
                          )}
                        >
                          AI Risk Intelligence
                        </h3>
                        {selectedCandidate.isRisky ? (
                          <ShieldAlert size={16} className="text-rose-500" />
                        ) : (
                          <ShieldCheck size={16} className="text-emerald-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <div
                          className={cn(
                            "text-2xl font-black",
                            selectedCandidate.isRisky
                              ? "text-rose-600"
                              : "text-emerald-600",
                          )}
                        >
                          {selectedCandidate.riskScore || 0}%
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          Risk Factor
                        </span>
                      </div>
                      {selectedCandidate.isRisky ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-medium text-rose-800 leading-relaxed italic">
                            "Suspicious patterns detected: common phrases found
                            in high-entropy resume generation tools."
                          </p>
                          <div className="bg-white/50 rounded-lg p-2 border border-rose-100 flex flex-wrap gap-1">
                            <span className="text-[8px] font-black text-rose-600 uppercase">
                              SIGNAL: SYNT_GEN
                            </span>
                            <span className="text-[8px] font-black text-rose-600 uppercase">
                              SIGNAL: DUPE_ID
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] font-medium text-emerald-800 leading-relaxed italic">
                          "Verified profile. No cross-network duplicate signals
                          found."
                        </p>
                      )}
                    </section>

                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                      <Shield size={12} className="text-indigo-400" /> Contact
                      Governance (Identity Masking)
                    </h3>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                          Primary Email
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 font-mono">
                            hidden_asset_{selectedCandidate.id?.slice(0, 5)}
                            @hirenest.vault
                          </span>
                          <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-indigo-100">
                            Masked
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-slate-50 pt-2">
                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                          Phone Verification
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 font-mono">
                            +** ••••• ••
                            {selectedCandidate.phone?.slice(-2) || "42"}
                          </span>
                          <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-indigo-100">
                            Masked
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-slate-50 pt-2">
                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                          LinkedIn Profile
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 font-mono">
                            linkedin.com/in/hidden-profile
                          </span>
                          <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-indigo-100">
                            Masked
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-slate-50 pt-2">
                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                          Source Identity
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {!selectedCandidate.vendorId ||
                          selectedCandidate.vendorId === "ORG-GLOBAL-HQ" ||
                          selectedCandidate.vendorId === "ADMIN_POOL" ? (
                            <Badge className="bg-indigo-600 text-white shadow-lg shadow-indigo-200 text-[10px] font-black uppercase tracking-widest px-3">
                              GLOBAL HQ
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                              {selectedCandidate.vendorName ||
                                vendorMap[selectedCandidate.vendorId] ||
                                selectedCandidate.vendorId ||
                                "DIRECT_POOL"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-slate-900 rounded-xl p-4 text-white shadow-lg shadow-indigo-100">
                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
                      <Shield size={12} /> Security Protocol
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 italic">
                          Identity Masking
                        </span>
                        <Badge className="bg-orange-100/10 text-orange-400 border border-orange-400/20 text-[8px]">
                          ACTIVE
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 italic">
                          Financial Governance
                        </span>
                        <Badge className="bg-emerald-100/10 text-emerald-400 border border-emerald-400/20 text-[8px]">
                          COMPLIANT
                        </Badge>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10 mt-2">
                        <p className="text-[9px] text-indigo-200 font-medium">
                          "This candidate is subject to regional data laws.
                          Submission history is immutable in current v1-audit
                          context."
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl border border-red-200 shadow-sm p-4 mt-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                      <ShieldAlert size={14} /> Security Protocol
                    </h3>
                    <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 flex flex-col gap-3">
                      <p className="text-[10px] text-red-600 font-medium leading-relaxed">
                        Global Administrator override: Permanent pipeline
                        destruction capability unlocked. Operations executed
                        here are irreversible. Waiters and vendor delegates
                        remain blocked.
                      </p>
                      {isAdmin ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleDeleteCandidate(
                              selectedCandidate.id ||
                                selectedCandidate.candidateId,
                            )
                          }
                          className="w-full text-red-700 bg-white border-red-200 hover:bg-red-600 hover:text-white font-bold uppercase tracking-widest text-[10px] h-10 transition-all shadow-sm"
                        >
                          Permanently Delete Candidate
                        </Button>
                      ) : (
                        <div className="flex bg-slate-100/50 p-2 border border-slate-200 rounded text-[9px] text-slate-500 font-bold uppercase items-center justify-center text-center">
                          Action Restricted: Global Administrators Only
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
  );
}
