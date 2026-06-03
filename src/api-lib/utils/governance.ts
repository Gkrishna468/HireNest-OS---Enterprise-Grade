export function getScopedCandidateUniverse(db: any, collectionName: string, role: string, orgId: string) {
  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "ops_admin" ||
    role === "hq_admin" ||
    orgId === "ORG-GLOBAL-HQ" ||
    orgId === "ADMIN";

  const collectionRef = db.collection(collectionName);

  if (isAdmin) {
    return collectionRef;
  } else if (role?.includes("vendor") || role?.includes("recruiter")) {
    return collectionRef.where("vendorId", "==", orgId);
  } else {
    return collectionRef.where("clientId", "==", orgId);
  }
}
