import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const FALLBACK_BRIEFING = {
  briefing: "Good morning! Your operational dashboard is active and ready.",
  actionItems: [
    { id: "act-1", title: "Review high-priority matching candidates in queue", type: "review" },
    { id: "act-2", title: "Verify pending candidate submissions", type: "pipeline" }
  ],
  metrics: {
    newCandidates: 0,
    pendingReviews: 2,
    upcomingInterviews: 0
  }
};

export function useDailyBriefing(orgId?: string) {
  const [briefing, setBriefing] = useState<any>(FALLBACK_BRIEFING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchBriefingForUser = async (user: any) => {
      if (!user) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const idToken = await user.getIdToken().catch(() => null);
        const headers: Record<string, string> = {};
        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
        }

        const res = await fetch(`/api/daily-briefing${orgId ? `?orgId=${orgId}` : ''}`, { headers });
        
        if (!res.ok) {
          console.warn(`[useDailyBriefing] Endpoint returned status ${res.status}, using resilient briefing.`);
          if (active) {
            setBriefing(FALLBACK_BRIEFING);
            setError(null);
          }
          return;
        }

        const json = await res.json().catch(() => null);
        if (active) {
          if (json && json.success && json.data) {
            setBriefing(json.data);
            setError(null);
          } else {
            setBriefing(json?.data || FALLBACK_BRIEFING);
            setError(null);
          }
        }
      } catch (err: any) {
        if (active) {
          console.warn("[useDailyBriefing] Briefing fetch warning:", err?.message);
          setError(null);
          setBriefing(FALLBACK_BRIEFING);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (active) {
        fetchBriefingForUser(user);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [orgId]);

  return { briefing, loading, error };
}
