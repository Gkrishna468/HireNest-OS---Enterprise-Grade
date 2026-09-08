import { create } from 'zustand';
import { ReactivationOpportunity } from '../types';

interface ReactivationState {
  opportunities: ReactivationOpportunity[];
  loading: boolean;
  error: string | null;
  selectedOpportunity: ReactivationOpportunity | null;
  metrics: {
    dormantCandidatesScanned: number;
    qualifiedOpportunities: number;
    recruiterApprovedDispatched: number;
    candidatesResponded: number;
    responseRatePercent: number;
    interviewsGenerated: number;
    placementsClosed: number;
    recoveredRevenueValue: number;
    formattedRecoveredRevenue: string;
  } | null;

  fetchOpportunities: (role?: 'RECRUITER' | 'VENDOR' | 'CLIENT' | 'ADMIN', orgId?: string) => Promise<void>;
  runScan: () => Promise<void>;
  approveOpportunity: (oppId: string, customMessage?: string, channel?: 'EMAIL' | 'WHATSAPP' | 'SMS') => Promise<void>;
  discardOpportunity: (oppId: string, reason?: string) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  setSelectedOpportunity: (opp: ReactivationOpportunity | null) => void;
}

export const useReactivationStore = create<ReactivationState>((set, get) => ({
  opportunities: [],
  loading: false,
  error: null,
  selectedOpportunity: null,
  metrics: null,

  setSelectedOpportunity: (opp) => set({ selectedOpportunity: opp }),

  fetchOpportunities: async (role = 'RECRUITER', orgId = '') => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams({
        role,
        orgId,
        minScore: '50',
        status: 'PENDING_RECRUITER_REVIEW'
      });
      const res = await fetch(`/api/reactivation/opportunities?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.opportunities)) {
        set({ opportunities: data.opportunities, loading: false });
      } else {
        set({ loading: false, error: data.error || "Failed to load reactivation queue" });
      }
    } catch (err: any) {
      set({ loading: false, error: err.message || "Network error fetching reactivation queue" });
    }
  },

  runScan: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/reactivation/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchOpportunities();
        await get().fetchMetrics();
      } else {
        set({ loading: false, error: data.error || "Scan failed" });
      }
    } catch (err: any) {
      set({ loading: false, error: err.message || "Scan network error" });
    }
  },

  approveOpportunity: async (oppId, customMessage, channel) => {
    try {
      const opp = get().opportunities.find((o) => o.id === oppId) || get().selectedOpportunity;
      const res = await fetch('/api/reactivation/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: oppId,
          opportunity: opp,
          customMessage,
          channel
        })
      });
      const data = await res.json();
      if (data.success) {
        // Remove approved from pending list
        set((state) => ({
          opportunities: state.opportunities.filter((o) => o.id !== oppId),
          selectedOpportunity: state.selectedOpportunity?.id === oppId ? null : state.selectedOpportunity
        }));
        await get().fetchMetrics();
      } else {
        throw new Error(data.error || "Approval failed");
      }
    } catch (err: any) {
      console.error("[ReactivationStore] Approval error:", err);
      throw err;
    }
  },

  discardOpportunity: async (oppId, reason = "Recruiter discarded") => {
    try {
      const res = await fetch('/api/reactivation/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: oppId, reason })
      });
      const data = await res.json();
      if (data.success) {
        set((state) => ({
          opportunities: state.opportunities.filter((o) => o.id !== oppId),
          selectedOpportunity: state.selectedOpportunity?.id === oppId ? null : state.selectedOpportunity
        }));
      }
    } catch (err: any) {
      console.error("[ReactivationStore] Discard error:", err);
    }
  },

  fetchMetrics: async () => {
    try {
      const res = await fetch('/api/reactivation/metrics');
      const data = await res.json();
      if (data.success && data.metrics) {
        set({ metrics: data.metrics });
      }
    } catch (err) {
      console.warn("[ReactivationStore] Metrics fetch warning:", err);
    }
  }
}));
