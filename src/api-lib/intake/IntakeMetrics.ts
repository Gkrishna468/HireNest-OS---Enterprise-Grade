import { adminDb } from "../../lib/firebase-admin.js";

export class IntakeMetrics {
    static async increment(tenantId: string, metricKey: string, count: number = 1) {
        if (!adminDb) return;
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const ref = adminDb.collection("intake_metrics").doc(`${tenantId}_${today}`);
            
            await adminDb.runTransaction(async (t: any) => {
                const doc = await t.get(ref);
                if (!doc.exists) {
                    t.set(ref, { [metricKey]: count, date: today, tenantId });
                } else {
                    const data = doc.data();
                    t.update(ref, { [metricKey]: (data[metricKey] || 0) + count });
                }
            });
        } catch (e) {
            console.error("[IntakeMetrics] Failed to increment metric", e);
        }
    }
}
