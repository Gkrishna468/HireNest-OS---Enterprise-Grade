import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  try {
    const collections = [
      "users",
      "organizations",
      "requirements",
      "candidates",
      "submissions",
      "vendors",
      "clients",
      "onboarding_requests"
    ];

    const results: any = {
      timestamp: new Date().toISOString(),
    };

    const fetchPromises = collections.map(async (name) => {
      try {
        const snap = await adminDb.collection(name).limit(50).get();
        results[name] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (err) {
        results[name] = [];
      }
    });

    await Promise.all(fetchPromises);
    res.status(200).json(results);
  } catch (err: any) {
    res.status(200).json({
      ok: false,
      error: err.message
    });
  }
}
