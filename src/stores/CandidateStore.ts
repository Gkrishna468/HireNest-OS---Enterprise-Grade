import { create } from 'zustand';
import { ServiceProvider } from '../lib/providers/ServiceProvider';
import { Candidate, CandidateInput, CandidateUpdate } from '../types/Candidate';

interface CandidateState {
  candidate: Candidate | null;
  candidateLoading: boolean;
  candidateError: string | null;
  getCandidate: (id: string) => Promise<Candidate | null>;
  createCandidate: (data: CandidateInput) => Promise<Candidate>;
  updateCandidate: (id: string, updates: CandidateUpdate) => Promise<void>;
  addGeneralCandidate: (payload: any) => Promise<any>;
  deleteCandidate: (id: string) => Promise<void>;
  retryEnrichment: (candidate: any) => Promise<any>;
  subscribeToCandidate: (id: string, callback: (data: any) => void) => () => void;
  subscribeToEvents: (id: string, callback: (events: any[]) => void) => () => void;
  subscribeToInterviews: (id: string, callback: (interviews: any[]) => void) => () => void;
  subscribeToMatches: (id: string, reqId: string | undefined, callback: (match: any) => void) => () => void;
}

export const useCandidateStore = create<CandidateState>((set, get) => ({
  candidate: null,
  candidateLoading: false,
  candidateError: null,

  getCandidate: async (id: string) => {
    set({ candidateLoading: true, candidateError: null });
    try {
      const result = await ServiceProvider.candidateService.getCandidate(id);
      set({ candidate: result, candidateLoading: false });
      return result;
    } catch (e: any) {
      set({ candidateError: e.message, candidateLoading: false });
      return null;
    }
  },

  createCandidate: async (data: CandidateInput) => {
    set({ candidateLoading: true, candidateError: null });
    try {
      const result = await ServiceProvider.candidateService.createCandidate(data);
      set({ candidate: result, candidateLoading: false });
      return result;
    } catch (e: any) {
      set({ candidateError: e.message, candidateLoading: false });
      throw e;
    }
  },

  updateCandidate: async (id: string, updates: CandidateUpdate) => {
    set({ candidateLoading: true, candidateError: null });
    try {
      await ServiceProvider.candidateService.updateCandidate(id, updates);
      // Optimistic update
      const current = get().candidate;
      if (current && current.id === id) {
        set({ candidate: { ...current, ...updates } as Candidate });
      }
      set({ candidateLoading: false });
    } catch (e: any) {
      set({ candidateError: e.message, candidateLoading: false });
      throw e;
    }
  },

  addGeneralCandidate: async (payload: any) => {
    set({ candidateLoading: true, candidateError: null });
    try {
      const { name, email, phone, experience, currentLocation, orgId, aiAnalysis, keySkills } = payload;
      const candId = "HN-CAN-" + Math.random().toString(36).substr(2, 9);
      
      await ServiceProvider.candidateService.createCandidate({
          fullName: name,
          name: name,
          primaryEmail: email,
          email: email,
          phone: phone,
          experience: experience,
          location: currentLocation,
          candidateId: candId,
          vendorId: orgId,
          sourceOrganizations: [orgId],
          pipelineStage: "Candidate Added",
          source: "Manual Add",
          resumeText: aiAnalysis?.analysis || "",
          skills: keySkills.split(",").map((s: string) => s.trim()).filter(Boolean),
          status: "QUEUED",
          distillationStatus: "COMPLETED"
      } as any);

      const { CandidateOwnershipEngine } = await import("../lib/workflows/CandidateOwnershipEngine");
      await CandidateOwnershipEngine.establishOwnership(candId, orgId, "VENDOR", 180);

      set({ candidateLoading: false });
      return { success: true, candId };
    } catch (e: any) {
      set({ candidateError: e.message, candidateLoading: false });
      throw e;
    }
  },

  deleteCandidate: async (id: string) => {
    set({ candidateLoading: true, candidateError: null });
    try {
      await ServiceProvider.candidateService.archiveCandidate(id);
      set({ candidate: null, candidateLoading: false });
    } catch (e: any) {
      set({ candidateError: e.message, candidateLoading: false });
      throw e;
    }
  },

  retryEnrichment: async (candidate: any) => {
    set({ candidateLoading: true, candidateError: null });
    try {
      let resumeTextToUse = candidate.resumeText || candidate.extractedText;

      if (candidate.storagePath) {
        try {
          const { getStorage, ref, getDownloadURL } = await import("firebase/storage");
          const storage = getStorage();
          const fileRef = ref(storage, candidate.storagePath);
          const url = await getDownloadURL(fileRef);
          
          const fileRes = await fetch(url);
          const blob = await fileRes.blob();
          
          const formData = new FormData();
          formData.append("file", blob, candidate.fileName || "resume.pdf");
          
          const extRes = await fetch("/api/extract-text", {
             method: "POST",
             body: formData
          });
          
          if (extRes.ok) {
             const extData = await extRes.json();
             if (extData.text && extData.text.length > 50) {
                 resumeTextToUse = extData.text;
             }
          }
        } catch (e) {
          console.warn("Could not fetch or re-extract from storage, falling back to existing DB text", e);
        }
      }

      if (!resumeTextToUse || (resumeTextToUse.includes("[Parse Failure Fallback]") && resumeTextToUse.length < 500)) {
        throw new Error("No valid resume text available to parse. Upload a new resume instead.");
      }

      const { parseBulkResumes } = await import("../services/aiService");
      const parsedResults = await parseBulkResumes([resumeTextToUse]);
      const result = parsedResults && parsedResults.length > 0 ? parsedResults[0] : null;

      if (!result || !result.name) {
         throw new Error("AI could not extract structured data. Document layout may be unreadable.");
      }

      const updateData: any = {
          distillationStatus: "COMPLETED",
          isStale: false,
          resumeText: resumeTextToUse,
          name: result.name !== "Unknown" ? result.name : candidate.name,
          fullName: result.name !== "Unknown" ? result.name : candidate.name,
          email: result.email && !result.email.includes("pending@") ? result.email : candidate.email,
          primaryEmail: result.email && !result.email.includes("pending@") ? result.email : candidate.primaryEmail,
          phone: result.phone !== "N/A" ? result.phone : candidate.phone,
          experience: result.experience !== "Unparsed" ? result.experience : candidate.experience,
      };

      if (result.skills && Array.isArray(result.skills)) {
         updateData.skills = result.skills.slice(0, 15);
      }

      await ServiceProvider.candidateService.updateCandidate(candidate.candidateId || candidate.id, updateData);

      const current = get().candidate;
      if (current && current.id === (candidate.candidateId || candidate.id)) {
        set({ candidate: { ...current, ...updateData } as Candidate });
      }

      set({ candidateLoading: false });
      return updateData;
    } catch (e: any) {
      set({ candidateError: e.message, candidateLoading: false });
      throw e;
    }
  },

  subscribeToCandidate: (id: string, callback: (data: any) => void) => {
    // In a real app we might call ServiceProvider.candidateService.subscribeToCandidate(...)
    // For now, return a mock unsubscribe function to ensure stores own lifecycle
    console.log(`Subscribed to candidate ${id}`);
    ServiceProvider.candidateService.getCandidate(id).then(c => {
       if (c) callback(c);
    });
    return () => console.log(`Unsubscribed from candidate ${id}`);
  },

  subscribeToEvents: (id: string, callback: (events: any[]) => void) => {
    console.log(`Subscribed to events for ${id}`);
    callback([]);
    return () => console.log(`Unsubscribed from events ${id}`);
  },

  subscribeToInterviews: (id: string, callback: (interviews: any[]) => void) => {
    console.log(`Subscribed to interviews for ${id}`);
    callback([]);
    return () => console.log(`Unsubscribed from interviews ${id}`);
  },

  subscribeToMatches: (id: string, reqId: string | undefined, callback: (match: any) => void) => {
    console.log(`Subscribed to matches for ${id} req ${reqId}`);
    callback(null);
    return () => console.log(`Unsubscribed from matches for ${id}`);
  }
}));
