import { create } from 'zustand';
import { ServiceProvider } from '../lib/providers/ServiceProvider';
import { Submission, SubmissionInput } from '../types/Submission';

interface SubmissionState {
  submissions: Submission[];
  selectedSubmission: Submission | null;
  interviewState: Record<string, any>;
  offerState: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  getSubmission: (id: string) => Promise<Submission | null>;
  createSubmission: (data: SubmissionInput) => Promise<Submission>;
  updateSubmission: (id: string, updates: Partial<Record<string, any>>) => Promise<void>;
  updateInterviewEvent: (id: string, event: Record<string, any>) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  submitCandidateProfile: (payload: any) => Promise<any>;
}

export const useSubmissionStore = create<SubmissionState>((set, get) => ({
  submissions: [],
  selectedSubmission: null,
  interviewState: {},
  offerState: {},
  isLoading: false,
  error: null,

  getSubmission: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await ServiceProvider.submissionService.getSubmission(id);
      set({ selectedSubmission: result, isLoading: false });
      return result;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  },

  createSubmission: async (data: SubmissionInput) => {
    set({ isLoading: true, error: null });
    try {
      const result = await ServiceProvider.submissionService.createSubmission(data);
      set((state) => ({ 
        submissions: [...state.submissions, result],
        selectedSubmission: result,
        isLoading: false 
      }));
      return result;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  updateSubmission: async (id: string, updates: Partial<Record<string, any>>) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceProvider.submissionService.updateSubmission(id, updates);
      set((state) => {
        const selected = state.selectedSubmission?.id === id ? { ...state.selectedSubmission, ...updates } as Submission : state.selectedSubmission;
        return { selectedSubmission: selected, isLoading: false };
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  updateInterviewEvent: async (id: string, event: Record<string, any>) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceProvider.submissionService.updateInterviewEvent(id, event);
      set((state) => {
        const selected = state.selectedSubmission?.id === id ? { ...state.selectedSubmission, interviewStatus: event.interviewStatus || state.selectedSubmission.interviewStatus } as Submission : state.selectedSubmission;
        return { selectedSubmission: selected, isLoading: false };
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  updateStatus: async (id: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceProvider.submissionService.updateStatus(id, status);
      set((state) => {
        const selected = state.selectedSubmission?.id === id ? { ...state.selectedSubmission, status } as Submission : state.selectedSubmission;
        return { selectedSubmission: selected, isLoading: false };
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  submitCandidateProfile: async (payload: any) => {
    set({ isLoading: true, error: null });
    try {
       const { SubmissionOrchestrator } = await import("../lib/workflows/SubmissionOrchestrator");
       const res = await SubmissionOrchestrator.submitCandidate(payload);
       set({ isLoading: false });
       return res;
    } catch (e: any) {
       set({ error: e.message, isLoading: false });
       throw e;
    }
  }
}));
