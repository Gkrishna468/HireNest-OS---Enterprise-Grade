import { db } from "../lib/firebase-admin";
import { ApprovalRequest } from "../types/approval";

export class ActionGateway {
  /**
   * Independently verify approval before high-impact action
   */
  async verifyAction(
    submissionId: string,
    tenantId: string
  ): Promise<boolean> {
    const approvalsRef = db.collection("approvals");
    const q = approvalsRef
      .where("submissionId", "==", submissionId)
      .where("status", "==", "APPROVED");

    const snapshot = await q.get();
    
    if (snapshot.empty) return false;

    // Verify tenant and submission version
    const approvalDoc = snapshot.docs[0];
    const approval = approvalDoc.data() as ApprovalRequest;

    if (approval.tenantId !== tenantId) return false;
    
    // Check if policy version matches
    if (approval.policyVersion !== "1.0") return false;

    // Check submission version against current submission
    const submissionRef = db.collection("submissions").doc(submissionId);
    const submissionSnap = await submissionRef.get();
    if (!submissionSnap.exists) return false;
    
    const subData = submissionSnap.data();
    if (approval.submissionVersion !== subData.version) return false; // Assumes version field exists

    return true;
  }
}
export const actionGateway = new ActionGateway();
