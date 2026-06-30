import { db } from "../../../lib/firebase-admin.js";

export class CircuitBreaker {
  static async checkCircuit(
    officeName: string,
  ): Promise<{ isOpen: boolean; reason?: string }> {
    if (!db) return { isOpen: false };

    const ref = db.collection("circuit_breakers").doc(officeName);
    const doc = await ref.get();

    if (doc.exists) {
      const data = doc.data();
      if (data?.isOpen) {
        // Check if we can attempt half-open
        if (
          data.nextRetryAt &&
          Date.now() > new Date(data.nextRetryAt).getTime()
        ) {
          await ref.update({ isOpen: false, failures: 0 });
          return { isOpen: false };
        }
        return {
          isOpen: true,
          reason: "Circuit is open due to recent failures",
        };
      }
    }
    return { isOpen: false };
  }

  static async recordFailure(officeName: string) {
    if (!db) return;
    const ref = db.collection("circuit_breakers").doc(officeName);

    try {
      await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        let failures = 1;

        if (doc.exists) {
          failures = (doc.data()?.failures || 0) + 1;
        }

        if (failures >= 5) {
          // Open circuit
          t.set(ref, {
            isOpen: true,
            failures,
            openedAt: new Date().toISOString(),
            nextRetryAt: new Date(Date.now() + 5 * 60000).toISOString(), // retry in 5 minutes
          });
        } else {
          t.set(
            ref,
            {
              isOpen: false,
              failures,
              lastFailureAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
      });
    } catch (e) {
      console.error("[CircuitBreaker] failed to record", e);
    }
  }

  static async recordSuccess(officeName: string) {
    if (!db) return;
    const ref = db.collection("circuit_breakers").doc(officeName);
    await ref.set({ isOpen: false, failures: 0 }, { merge: true });
  }
}
