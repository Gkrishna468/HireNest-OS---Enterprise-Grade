import { create } from 'zustand';
import { ServiceProvider } from '../lib/providers/ServiceProvider';
import { Requirement, RequirementInput, RequirementUpdate } from '../types/Requirement';

interface RequirementState {
  requirements: Requirement[];
  selectedRequirement: Requirement | null;
  isLoading: boolean;
  error: string | null;
  getRequirement: (id: string) => Promise<Requirement | null>;
  createRequirement: (data: RequirementInput) => Promise<Requirement>;
  updateRequirement: (id: string, updates: RequirementUpdate) => Promise<void>;
  subscribeToComments: (reqId: string, cb: (data: any[]) => void) => () => void;
  subscribeToExecutionEvents: (filters: any, cb: (data: any[]) => void) => () => void;
  addComment: (reqId: string, text: string, role: string) => Promise<void>;
  getUserRole: () => Promise<string>;
}

export const useRequirementStore = create<RequirementState>((set, get) => ({
  requirements: [],
  selectedRequirement: null,
  isLoading: false,
  error: null,

  subscribeToComments: (reqId: string, cb: (data: any[]) => void) => {
    cb([]); // Mock callback
    return () => {}; // Unsubscribe mock
  },

  subscribeToExecutionEvents: (filters: any, cb: (data: any[]) => void) => {
    cb([]);
    return () => {};
  },

  addComment: async (reqId: string, text: string, role: string) => {
    // Mock add comment
  },

  getUserRole: async () => {
    return "User"; // Mock role return
  },

  getRequirement: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await ServiceProvider.requirementService.getRequirement(id);
      set({ selectedRequirement: result, isLoading: false });
      return result;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  },

  createRequirement: async (data: RequirementInput) => {
    set({ isLoading: true, error: null });
    try {
      const result = await ServiceProvider.requirementService.createRequirement(data);
      set((state) => ({ 
        requirements: [...state.requirements, result],
        selectedRequirement: result,
        isLoading: false 
      }));
      return result;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  updateRequirement: async (id: string, updates: RequirementUpdate) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceProvider.requirementService.updateRequirement(id, updates);
      set((state) => {
        const selected = state.selectedRequirement?.id === id ? { ...state.selectedRequirement, ...updates } as Requirement : state.selectedRequirement;
        return { selectedRequirement: selected, isLoading: false };
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  }
}));
