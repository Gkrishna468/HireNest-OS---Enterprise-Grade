import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  const type = req.query.type || "admin";

  try {
    // Attempt to get real counts for a more "production" feel
    const [requirementsSnap, candidatesSnap, submissionsSnap] = await Promise.all([
      adminDb.collection("requirements_public").get(),
      adminDb.collection("candidatePool").get(),
      adminDb.collection("submissions").get()
    ]);

    const reqCount = requirementsSnap.size;
    const candCount = candidatesSnap.size;
    const subCount = submissionsSnap.size;

    // Simulate revenue based on requirement budgets if they exist
    let totalBudget = 0;
    requirementsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.vendorVisibleBudget) {
        totalBudget += Number(data.vendorVisibleBudget);
      }
    });

    const baseMetrics = {
      revenue: type === 'admin' ? totalBudget * 83 : (type === 'vendor' ? totalBudget * 10 : 0),
      spending: type === 'client' ? totalBudget * 83 : (type === 'admin' ? totalBudget * 40 : 0),
      activeDeals: subCount,
      placements: subCount > 0 ? Math.floor(subCount * 0.2) : 0,
      avgMargin: 18.5,
      vendorQuality: 94,
      recruiterProductivity: 88,
      lastUpdate: new Date().toISOString()
    };

    res.status(200).json(baseMetrics);
  } catch (error) {
    console.error("Metrics API Error:", error);
    res.status(200).json({
      revenue: 0,
      spending: 0,
      activeDeals: 0,
      placements: 0,
      avgMargin: 0,
      vendorQuality: 0,
      recruiterProductivity: 0,
      lastUpdate: new Date().toISOString()
    });
  }
}
