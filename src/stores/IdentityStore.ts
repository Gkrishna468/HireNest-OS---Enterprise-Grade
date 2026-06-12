import { create } from 'zustand';
import { ServiceProvider } from '../lib/providers/ServiceProvider';
import { Client } from '../types/Client';
import { Vendor } from '../types/Vendor';
import { Recruiter } from '../types/Recruiter';

interface IdentityState {
  clients: Client[];
  vendors: Vendor[];
  recruiters: Recruiter[];
  isLoading: boolean;
  error: string | null;
  getClient: (id: string) => Promise<Client | null>;
  getVendor: (id: string) => Promise<Vendor | null>;
  getRecruiter: (id: string) => Promise<Recruiter | null>;
  subscribeToNotifications: (filters: any, cb: (data: any) => void) => () => void;
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  clients: [],
  vendors: [],
  recruiters: [],
  isLoading: false,
  error: null,

  subscribeToNotifications: (filters: any, cb: (data: any) => void) => {
     // Mock implementation
     return () => {};
  },

  getClient: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await ServiceProvider.clientService.getClient(id);
      set({ isLoading: false });
      return result;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  },

  getVendor: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await ServiceProvider.vendorService.getVendor(id);
      set({ isLoading: false });
      return result;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  },

  getRecruiter: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await ServiceProvider.recruiterService.getRecruiter(id);
      set({ isLoading: false });
      return result;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  }
}));
