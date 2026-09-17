import { adminDb } from '../../lib/firebase-admin.js';
import { validateOpenUIAction } from '../../lib/openui/validator.js';
import { OPENUI_ACTION_REGISTRY } from '../../lib/openui/actions.js';
import { EnterpriseRuntimeKernel } from "../os/kernel/EnterpriseRuntimeKernel.js";

export default async function openuiGatewayHandler(req: any, res: any) {
  try {
    // 1. Authenticate user context (populated safely by authMiddleware)
    const user = req.user;
    if (!user || !user.uid) {
      return res.status(401).json({ error: 'Unauthorized: User authentication required' });
    }

    const { action, entityType, entityId, requirementId, requestedValue, reason } = req.body;

    // 2. Validate payload against Zod definitions (fail-closed validator)
    let validatedPayload: any;
    try {
      validatedPayload = validateOpenUIAction({
        action,
        entityType,
        entityId,
        requirementId,
        requestedValue,
        reason,
        source: 'openui',
      });
    } catch (validationErr: any) {
      console.error('[OpenUI Gateway] Validation failed:', validationErr.message || validationErr);
      return res.status(400).json({
        error: 'Bad Request: Action payload failed schema validation',
        details: validationErr.errors || validationErr.message,
      });
    }

    // 3. Retrieve action configuration
    const actionConfig = OPENUI_ACTION_REGISTRY[validatedPayload.action];
    if (!actionConfig) {
      return res.status(400).json({ error: `Unsupported gateway action: ${validatedPayload.action}` });
    }

    // 4. Role-Based Access Control (RBAC) check
    const userRole = user.role || 'recruiter';
    if (!actionConfig.requiredRole.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden: Role ${userRole} is unauthorized to execute ${validatedPayload.action}`,
      });
    }

    // 5. Database connectivity check
    if (!adminDb) {
      return res.status(503).json({ error: 'Service Unavailable: Database not connected' });
    }

    // 6. Dynamic Attribute-Based Access Control (ABAC) & Workspace Boundary Enforcements
    const isGlobalHQ = ['admin', 'super_admin', 'ops_admin', 'hq_admin'].includes(userRole) || 
                       user.orgId === 'ORG-GLOBAL-HQ' || 
                       user.orgId === 'ADMIN';

    if (!isGlobalHQ) {
      const userOrgId = user.orgId || user.organizationId;
      if (!userOrgId) {
        return res.status(403).json({ error: 'Access Denied: Missing user organization context for ABAC scope validation' });
      }

      // Candidate-bound scope checks (candidatePool)
      if (validatedPayload.entityType === 'candidate' || validatedPayload.action.includes('CANDIDATE')) {
        const candidateId = validatedPayload.entityType === 'candidate' ? validatedPayload.entityId : (validatedPayload.entityId || validatedPayload.requirementId);
        if (candidateId) {
          const candDoc = await adminDb.collection('candidatePool').doc(candidateId).get();
          if (!candDoc.exists) {
            return res.status(404).json({ error: `Not Found: Candidate ${candidateId} does not exist in candidatePool` });
          }
          const candData = candDoc.data();
          const belongsToVendor = candData?.vendorId === userOrgId;
          const belongsToClient = candData?.clientId === userOrgId;
          const isAssignedRecruiter = candData?.assignedRecruiterId === user.uid;

          if (!belongsToVendor && !belongsToClient && !isAssignedRecruiter) {
            return res.status(403).json({
              error: 'ABAC Scope Violation: You do not have permissions or ownership rights to perform operations on this candidate.'
            });
          }
        }
      }

      // Requirement-bound scope checks (requirements_public)
      if (validatedPayload.entityType === 'requirement' || validatedPayload.requirementId) {
        const reqId = validatedPayload.entityType === 'requirement' ? validatedPayload.entityId : validatedPayload.requirementId;
        if (reqId) {
          const reqDoc = await adminDb.collection('requirements_public').doc(reqId).get();
          if (!reqDoc.exists) {
            return res.status(404).json({ error: `Not Found: Requirement ${reqId} does not exist in requirements_public` });
          }
          const reqData = reqDoc.data();
          const belongsToClient = reqData?.clientId === userOrgId;
          const isVendorShared = reqData?.vendorId === userOrgId || reqData?.sharedVendors?.includes(userOrgId);

          if (!belongsToClient && !isVendorShared && reqData?.status !== 'OPEN') {
            return res.status(403).json({
              error: 'ABAC Scope Violation: You do not have permissions or access scope to perform operations on this requirement.'
            });
          }
        }
      }
    }

    // 7. Database execution based on whitelisted action protocols
    let auditDetails = `Executed action ${validatedPayload.action} on ${validatedPayload.entityType}:${validatedPayload.entityId}`;

    switch (validatedPayload.action) {
      case 'OVERRIDE_MATCH_SCORE': {
        const matchId = `${validatedPayload.entityId}_${validatedPayload.requirementId}`;
        await adminDb.collection('candidate_matches').doc(matchId).set({
          candidateId: validatedPayload.entityId,
          reqId: validatedPayload.requirementId,
          score: validatedPayload.requestedValue,
          overrideReason: validatedPayload.reason,
          overrideBy: user.uid,
          overrideAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'SHORTLIST_CANDIDATE':
      case 'SUBMIT_CANDIDATE': {
        const newStatus = validatedPayload.action === 'SHORTLIST_CANDIDATE' ? 'SHORTLISTED' : 'SUBMITTED';
        const submissionsColl = adminDb.collection('submissions');
        
        // Find or build canonical submission record
        const querySnap = await submissionsColl
          .where('candidateId', '==', validatedPayload.entityId)
          .where('requirementId', '==', validatedPayload.requirementId)
          .limit(1)
          .get();

        let submissionId = `SUB-${Date.now()}`;
        let existingData: any = {};
        let currentStatus = "SUBMITTED";

        if (!querySnap.empty) {
          submissionId = querySnap.docs[0].id;
          existingData = querySnap.docs[0].data() || {};
          currentStatus = existingData.status || "SUBMITTED";
        }

        // Evaluate State Transition through Canonical Kernel
        try {
          const isValidTransition = await EnterpriseRuntimeKernel.state.transitionState(
            "SUBMISSION",
            currentStatus,
            newStatus,
            { role: userRole, submissionId }
          );

          if (!isValidTransition && currentStatus !== newStatus) {
            return res.status(400).json({
              error: `State Transition Denied: Cannot transition submission from ${currentStatus} to ${newStatus} under role ${userRole}.`
            });
          }
        } catch (stateErr: any) {
          console.warn("[Kernel State Policy Bypass]:", stateErr.message);
        }

        await submissionsColl.doc(submissionId).set({
          ...existingData,
          submissionId,
          candidateId: validatedPayload.entityId,
          requirementId: validatedPayload.requirementId,
          status: newStatus,
          updatedBy: user.uid,
          updatedAt: new Date().toISOString(),
          submittedBy: user.uid,
          vendorOrgId: user.orgId || 'hq',
        }, { merge: true });

        // Initialize and complete canonical SLAs in the Kernel
        try {
          await EnterpriseRuntimeKernel.sla.completeSLA(submissionId, "OpenUI transition state update");
          await EnterpriseRuntimeKernel.sla.initiateSLA(submissionId, newStatus);
        } catch (slaErr: any) {
          console.warn("[Kernel SLA Operations Warning]:", slaErr.message);
        }

        // Publish transition event to EventEngine for Notification routing
        try {
          await EnterpriseRuntimeKernel.event.publish("SUBMISSION_STATUS_UPDATED", {
            submissionId,
            status: newStatus,
            candidateId: validatedPayload.entityId,
            requirementId: validatedPayload.requirementId,
            vendorId: user.orgId || 'hq',
          });
        } catch (eventErr: any) {
          console.warn("[Kernel Event Publish Warning]:", eventErr.message);
        }

        break;
      }

      case 'APPROVE_SLA': {
        await adminDb.collection('requirements_public').doc(validatedPayload.entityId).set({
          slaDays: validatedPayload.requestedValue,
          slaApproved: true,
          slaApprovedBy: user.uid,
          slaApprovedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'CREATE_FOLLOWUP':
      case 'ASSIGN_TASK': {
        const taskId = `TASK-${Date.now()}`;
        await adminDb.collection('tasks').doc(taskId).set({
          id: taskId,
          entityId: validatedPayload.entityId,
          entityType: validatedPayload.entityType,
          description: validatedPayload.requestedValue,
          status: 'pending',
          assignedTo: validatedPayload.action === 'ASSIGN_TASK' ? validatedPayload.requestedValue : user.uid,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        break;
      }

      case 'REQUEST_CANDIDATE_UPDATE': {
        await adminDb.collection('candidatePool').doc(validatedPayload.entityId).set({
          updateRequestedAt: new Date().toISOString(),
          updateRequestedBy: user.uid,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'LAUNCH_CAMPAIGN': {
        await adminDb.collection('requirements_public').doc(validatedPayload.entityId).set({
          campaignLaunched: true,
          campaignLaunchedAt: new Date().toISOString(),
          campaignLaunchedBy: user.uid,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'VIEW_REQUIREMENT':
      case 'VIEW_VENDOR':
      case 'VIEW_CANDIDATE':
        // strictly read actions - audit-logged securely
        auditDetails = `User viewed ${validatedPayload.entityType}:${validatedPayload.entityId}`;
        break;

      default:
        return res.status(400).json({ error: `Unhandled action: ${validatedPayload.action}` });
    }

    // 8. Write strictly audited transactions to centralized audit_logs collection
    if (actionConfig.auditRequired !== false) {
      await adminDb.collection('audit_logs').add({
        type: 'AUDIT_LOG',
        timestamp: new Date().toISOString(),
        userId: user.uid,
        workspaceId: user.orgId || 'hq',
        action: 'GENERAL_ACTION',
        resourceId: validatedPayload.entityId,
        details: auditDetails,
        metadata: {
          action: validatedPayload.action,
          payload: validatedPayload,
          user: {
            role: user.role,
            email: user.email || '',
          },
        },
      });
    }

    return res.json({
      success: true,
      message: `${validatedPayload.action} processed successfully.`,
      details: auditDetails,
    });
  } catch (err: any) {
    console.error('[OpenUI Gateway Error]:', err.message || err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message || 'An error occurred inside the gateway processing loop',
    });
  }
}
