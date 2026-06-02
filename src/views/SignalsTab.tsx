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
        const reqSnap = await getDocs(query(collection(db, "requirements_public"), limit(10)));
        reqSnap.docs.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
          const diffDays = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 3600 * 24));
          
          if (diffDays > 20 && data.status !== 'CLOSED') {
            loadedSignals.push({
              id: doc.id + '-aging',
              type: 'REQUIREMENT_AGING',
              title: 'Requirement Aging',
              description: `Requirement "${data.title}" has been open for >20 days.`,
              urgency: 'HIGH',
              icon: Clock
            });
          }
          if (diffDays <= 2 && data.status === 'PUBLISHED') {
            loadedSignals.push({
              id: doc.id + '-new',
              type: 'REQUIREMENT_NEW',
              title: 'New Requirement',
              description: `Client posted new requirement: "${data.title}"`,
              urgency: 'MEDIUM',
              icon: FileText
            });
          }
        });

        // Add some mock signals as per requirement
        loadedSignals.push({
            id: 'mock-cand-1',
            type: 'CANDIDATE_ACTIVE',
            title: 'Candidate became available',
            description: 'Candidate "John Doe" uploaded a new resume and reduced notice period.',
            urgency: 'HIGH',
            icon: Target
        });

        loadedSignals.push({
            id: 'mock-vend-1',
            type: 'VENDOR_PERFORMANCE',
            title: 'High Vendor Performance',
            description: 'Vendor "ABC Staffing" achieved 80% interview ratio this week.',
            urgency: 'LOW',
            icon: Zap
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
