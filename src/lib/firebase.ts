import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let initialized = false;

export function initializeFirebase() {
  if (initialized) return;
  try {
    // Initialize admin SDK using Application Default Credentials (ADC) and explicit projectId
    initializeApp({ projectId: "hirenest-os" });
    initialized = true;
    console.log("Firebase Admin initialized successfully with explicit projectId: hirenest-os.");
  } catch (error: any) {
    console.warn("Firebase Admin failed to initialize or already initialized:", error.message || error);
    // Even if it fails, we mark it as true if it's already initialized
    if (getApps().length > 0) {
      initialized = true;
    }
  }
}

export function getFirestoreDB() {
  initializeFirebase();
  // Target our explicit database ID as configured on the project
  return getFirestore("ai-studio-hirenestos-bc0522d4-73db-4bf6-8860-5df422bc15f8");
}

export async function checkFirestoreHealth(): Promise<boolean> {
  try {
    const db = getFirestoreDB();
    // Fetch collections as a ping check
    await db.listCollections();
    return true;
  } catch (error) {
    console.error("Firestore health check failed:", error);
    return false;
  }
}
