import React, { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { AlertCircle, FileText, CheckCircle, Clock, Zap, Target } from "lucide-react";

export default function SignalsTab() {
  const [signals, setSignals] = useState<any[]>([]);

  useEffect(() => {
    // Basic hardcoded/mock signals combined with some real ones
    // In a real system, a backend worker would generate these signals
    const fetchSignals = async () => {
      let loadedSignals: any[] = [];
      
      try {
        const reqSnap = await getDocs(query(collection(db, "requirements_public")));
        const reqs = reqSnap.docs.map(d => ({id: d.id, ...d.data()} as any));
        
        const subSnap = await getDocs(query(collection(db, "submissions")));
        const subs = subSnap.docs.map(d => ({id: d.id, ...d.data()} as any));

        // Requirement Signals
        reqs.forEach(req => {
          let createdAt = new Date();
          if (req.createdAt) {
            if (req.createdAt.seconds) {
              createdAt = new Date(req.createdAt.seconds * 1000);
            } else if (typeof req.createdAt === 'string') {
              createdAt = new Date(req.createdAt);
            } else if (req.createdAt.toDate) {
              createdAt = req.createdAt.toDate();
            }
          }
          if (isNaN(createdAt.getTime())) createdAt = new Date();
          const diffDays = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 3600 * 24));
          
          const reqSubs = subs.filter((s:any) => s.requirementId === req.id || s.canonicalRequirementId === req.id);
          const interviews = reqSubs.filter((s:any) => s.status && s.status.includes('INTERVIEW')).length;

          if (diffDays > 14 && req.status !== 'CLOSED' && interviews === 0) {
            loadedSignals.push({
              id: req.id + '-risk',
              type: 'REQUIREMENT_RISK',
              title: 'Requirement At Risk',
              description: `Requirement "${req.title}" open for ${diffDays} days with 0 interviews. Action: Run Match Scan`,
              urgency: 'HIGH',
              icon: Clock
            });
          }
        });

        // Candidate Signals (Get recent high-match candidates)
        try {
           const matchesSnap = await getDocs(query(collection(db, "candidate_matches"), where("matchScore", ">=", 85), limit(10)));
           matchesSnap.docs.forEach(match => {
               const mData = match.data();
               loadedSignals.push({
                 id: match.id,
                 type: 'CANDIDATE_ACTIVE',
                 title: 'New Candidate Uploaded',
                 description: `Top Match: ${mData.requirementTitle || 'Job'} (${mData.matchScore}% Match). Vendor: ${mData.vendorName || mData.vendorId}.`,
                 urgency: 'HIGH',
                 icon: Target
               });
           });
        } catch(e) { console.error(e); }

        // Vendor Signals (Calculate ratio for vendors)
        const vendorStats: Record<string, { subs: number, interviews: number, placements: number }> = {};
        subs.forEach((s:any) => {
            if (!s.vendorId) return;
            if (!vendorStats[s.vendorId]) vendorStats[s.vendorId] = { subs: 0, interviews: 0, placements: 0 };
            vendorStats[s.vendorId].subs++;
            const status = (s.status || '').toUpperCase();
            if (status.includes('INTERVIEW') || status === 'SHORTLISTED') vendorStats[s.vendorId].interviews++;
            if (['OFFER_RELEASED', 'OFFER_ACCEPTED', 'ONBOARDED', 'HIRED', 'PLACED'].includes(status)) vendorStats[s.vendorId].placements++;
        });

        Object.entries(vendorStats).forEach(([vendorId, stats]) => {
           if (stats.subs >= 3) {
               const intRatio = Math.round((stats.interviews / stats.subs) * 100);
               const placeRatio = Math.round((stats.placements / stats.subs) * 100);
               if (intRatio >= 50) {
                 loadedSignals.push({
                   id: 'vend-' + vendorId,
                   type: 'VENDOR_PERFORMANCE',
                   title: 'Vendor Performance Rising',
                   description: `Vendor ${vendorId} - Interview Ratio: ${intRatio}%, Placement Ratio: ${placeRatio}%.`,
                   urgency: 'LOW',
                   icon: Zap
                 });
               }
           }
        });

        setSignals(loadedSignals);
      } catch(e) {
        console.error("Failed to fetch signas", e);
      }
    };
    fetchSignals();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-slate-900">Signals Center</h1>
          <p className="text-sm text-slate-500 mt-1">AI-detected intelligence across requirements, candidates, and vendors.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {signals.map(signal => {
          const Icon = signal.icon;
          return (
            <div key={signal.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                 <div className={`p-3 rounded-xl border ${signal.urgency === 'HIGH' ? 'bg-rose-50 border-rose-100 text-rose-600' : signal.urgency === 'MEDIUM' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                   <Icon size={20} />
                 </div>
                 <div>
                   <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm">{signal.title}</h3>
                      {signal.urgency === 'HIGH' && <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 uppercase text-[10px]">🔥 Hot</Badge>}
                   </div>
                   <p className="text-xs text-slate-500 leading-relaxed">{signal.description}</p>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
