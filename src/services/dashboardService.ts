import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export interface DashboardMetrics {
  revenueToday: number;
  revenueTargetProgress: number;
  pipelineValue: number;
  computeCostMTD: number;
  valueGenerated: number;
  timeSavedHours: number;
  avgHiringVelocityDays: number;
  totalPlacementsMonth: number;
  topRecruiters: any[];
  vendors: any[];
  risks: any[];
}

export async function fetchExecutiveDashboardMetrics(orgId: string = "system"): Promise<DashboardMetrics> {
  // Real Aggregation from SSOT Collections
  
  // 1. Fetch live metrics from invoices/deals
  const invoicesSnap = await getDocs(query(collection(db, "invoices"), where("status", "==", "PAID")));
  const revenueToday = invoicesSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
  
  const pipelineSnap = await getDocs(query(collection(db, "dealRooms"), where("status", "==", "ACTIVE")));
  const pipelineValue = pipelineSnap.docs.reduce((acc, doc) => acc + (doc.data().projectedValue || 0), 0);

  // 2. Fetch AI Gateway Ledger
  const aiLedgerSnap = await getDocs(collection(db, "ai_audit_ledger"));
  const computeCostMTD = aiLedgerSnap.docs.reduce((acc, doc) => acc + (doc.data().computeCost || 0), 0);
  const timeSavedHours = aiLedgerSnap.docs.reduce((acc, doc) => acc + (doc.data().timeSavedHours || 0), 0);
  const valueGenerated = timeSavedHours * 150; // Assume $150/hr recruiter value

  // 3. Submissions & Placements
  const submissionsSnap = await getDocs(collection(db, "submissions"));
  let totalVelocityDays = 0;
  let placementsWithVelocity = 0;

  const placements = submissionsSnap.docs.filter(d => {
    const data = d.data();
    if (data.status === "PLACED") {
      if (data.createdAt && data.placedAt) {
        const tCreated = data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime();
        const tPlaced = data.placedAt.toMillis ? data.placedAt.toMillis() : new Date(data.placedAt).getTime();
        totalVelocityDays += (tPlaced - tCreated) / (1000 * 60 * 60 * 24);
        placementsWithVelocity++;
      }
      return true;
    }
    return false;
  });
  const totalPlacementsMonth = placements.length;
  const avgHiringVelocityDays = placementsWithVelocity > 0 ? Math.round(totalVelocityDays / placementsWithVelocity) : 0;

  // 4. Vendor Intelligence
  const vendorSnap = await getDocs(collection(db, "vendor_performance"));
  const vendors = vendorSnap.docs.map(doc => {
    const data = doc.data();
    let trustTier = 'Review';
    if (data.trustScore >= 80) trustTier = 'High';
    else if (data.trustScore >= 50) trustTier = 'Medium';
    
    return {
      name: data.vendorName || doc.id,
      trust: trustTier,
      placementRate: `${data.fillRatio || 0}%`,
      active: data.submissions || 0,
      trustScore: data.trustScore || 0,
      aiInsight: data.aiInsight || (trustTier === 'High' ? 'Consistent high-quality pipeline.' : 'Vendor requires performance review.')
    };
  }).sort((a, b) => b.trustScore - a.trustScore).slice(0, 5);

  // Real data defaults to empty if collection is empty
  return {
    revenueToday,
    revenueTargetProgress: revenueToday > 0 ? Math.min((revenueToday / 2000000) * 100, 100) : 0,
    pipelineValue,
    computeCostMTD,
    valueGenerated,
    timeSavedHours,
    avgHiringVelocityDays,
    totalPlacementsMonth,
    topRecruiters: [],
    vendors,
    risks: []
  };
}
