import { adminDb } from "../../src/lib/firebase-admin.js";

async function audit() {
  if (!adminDb) {
    console.log("No adminDb");
    return;
  }
  
  const vendorId = "tie-in";
  console.log("1. Current vendorId resolution:", vendorId);
  
  const reqsSnap = await adminDb.collection("requirements_public").get();
  console.log("2. requirements_public all:", reqsSnap.docs.length);
  const vReqs = reqsSnap.docs.filter(d => {
    const data = d.data();
    return !data.assignedVendorIds || data.assignedVendorIds.includes(vendorId);
  });
  console.log("   requirements visible to vendor:", vReqs.length);

  const candidatePoolSnap = await adminDb.collection("candidatePool").where("vendorId", "==", vendorId).get();
  console.log("3. candidatePool records owned by vendor:", candidatePoolSnap.docs.length);
  
  const candidateMatchesSnap = await adminDb.collection("candidate_matches").where("vendorId", "==", vendorId).get();
  console.log("4. candidate_matches records owned by vendor:", candidateMatchesSnap.docs.length);
  
  const submissionsSnap = await adminDb.collection("submissions").where("vendorId", "==", vendorId).get();
  console.log("5. submissions owned by vendor:", submissionsSnap.docs.length);
}

audit().catch(console.error);
