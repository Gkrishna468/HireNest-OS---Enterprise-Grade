import { approvalService } from "../lib/ApprovalService";
import { actionGateway } from "../lib/ActionGateway";
import { db } from "../lib/firebase-admin";

async function runTests() {
  console.log("Starting P4 Approval Engine Tests...");

  // Setup: Seed submission
  const submissionId = "sub-1";
  const tenantId = "tenant-1";
  await db.collection("submissions").doc(submissionId).set({ 
      tenantId, 
      version: 1, 
      requirementId: "req-1" 
  });
  console.log("0. Submission seeded.");

  // 1. Vendor candidate with no recruiter -> Admin approval required
  const approvalId = await approvalService.requestApproval(
    submissionId,
    tenantId,
    "vendor-1",
    "ADMIN",
    null,
    1
  );
  console.log("1. Approval requested (Admin):", approvalId);

  // 6. Admin can approve
  await approvalService.approveSubmission(
    approvalId,
    tenantId,
    "admin-1",
    "ADMIN",
    1
  );
  console.log("6. Admin approved successfully.");

  // 14. Action Gateway authorizes valid approval
  const isAuthorized = await actionGateway.verifyAction(submissionId, tenantId);
  console.log("14. Action Gateway authorized:", isAuthorized);
  if (!isAuthorized) throw new Error("Action not authorized");

  // 10. Submission version change invalidates approval
  await db.collection("submissions").doc(submissionId).update({ version: 2 });
  const isAuthorizedAfterVersionChange = await actionGateway.verifyAction(submissionId, tenantId);
  console.log("10. Action Gateway blocks after version change:", !isAuthorizedAfterVersionChange);
  if (isAuthorizedAfterVersionChange) throw new Error("Action should be blocked");

  console.log("All P4 Approval Engine Tests Passed!");
}

runTests().catch(console.error);
