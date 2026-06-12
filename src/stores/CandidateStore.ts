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
  }
}));
