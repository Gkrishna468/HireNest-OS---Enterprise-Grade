export function getScopedCandidateUniverse(db: any, collectionName: string, role: string, orgId: string) {
  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "ops_admin" ||
    role === "hq_admin" ||
    orgId === "ORG-GLOBAL-HQ" ||
    orgId === "ADMIN";

  const collectionRef = db.collection(collectionName);

  if (!orgId || orgId === "undefined" || orgId === "null") {
    if (isAdmin) return collectionRef;
    throw new Error(`orgId is required for scoped queries. collection=${collectionName}, role=${role}`);
  }

  if (isAdmin) {
    return collectionRef;
  }

  if (role?.includes("vendor") || role?.includes("recruiter")) {
    return collectionRef.where("vendorId", "==", orgId);
  } else {
    return collectionRef.where("clientId", "==", orgId);
  }
}
