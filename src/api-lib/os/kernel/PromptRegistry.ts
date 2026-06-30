import { db } from "../../../lib/firebase-admin.js";
import { PromptDefinition } from "./RuntimeTypes.js";

export class PromptRegistry {
  static async getPrompt(
    promptId: string,
    version: string = "latest",
  ): Promise<PromptDefinition | null> {
    if (!db) return null;

    const snap = await db
      .collection("prompt_registry")
      .where("promptId", "==", promptId)
      .where("version", "==", version)
      .limit(1)
      .get();

    if (snap.empty) {
      // fallback to get any latest
      if (version === "latest") {
        const latestSnap = await db
          .collection("prompt_registry")
          .where("promptId", "==", promptId)
          .orderBy("version", "desc")
          .limit(1)
          .get();

        if (!latestSnap.empty) {
          return latestSnap.docs[0].data() as PromptDefinition;
        }
      }
      return null;
    }

    return snap.docs[0].data() as PromptDefinition;
  }

  static async registerPrompt(prompt: PromptDefinition) {
    if (!db) return;
    await db
      .collection("prompt_registry")
      .doc(`${prompt.promptId}_${prompt.version}`)
      .set(prompt);
  }
}
