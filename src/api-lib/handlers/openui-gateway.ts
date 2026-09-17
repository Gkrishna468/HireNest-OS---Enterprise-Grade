import { Request, Response } from 'express';
import { adminDb } from '../../lib/firebase-admin.js';
import { validateOpenUIAction } from '../../lib/openui/validator.js';
import { OPENUI_ACTION_REGISTRY } from '../../lib/openui/actions.js';
import { EnterpriseRuntimeKernel } from "../os/kernel/EnterpriseRuntimeKernel.js";
import { OpenUIActionPayload, OpenUIRole } from '../../types.js';

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    role?: string;
    orgId?: string;
    organizationId?: string;
    email?: string;
  };
}

export default async function openuiGatewayHandler(req: AuthenticatedRequest, res: Response) {
  try {
    // 1. Authenticate user context (populated safely by authMiddleware)
    const user = req.user;
    if (!user || !user.uid) {
      return res.status(401).json({ error: 'Unauthorized: User authentication required' });
    }

    const { action, entityType, entityId, requirementId, requestedValue, reason } = req.body;

    // 2. Validate payload against Zod definitions (fail-closed validator)
    let validatedPayload: OpenUIActionPayload;
    try {
      validatedPayload = validateOpenUIAction({
        action,
        entityType,
        entityId,
        requirementId,
        requestedValue,
        reason,
        source: 'openui',
      }) as unknown as OpenUIActionPayload;
    } catch (validationErr: unknown) {
      const msg = validationErr instanceof Error ? validationErr.message : String(validationErr);
      console.error('[OpenUI Gateway] Validation failed:', msg);
      return res.status(400).json({
        error: 'Bad Request: Action payload failed schema validation',
        details: (validationErr as any).errors || msg,
      });
    }

    // 3. Retrieve action configuration
    const actionConfig = OPENUI_ACTION_REGISTRY[validatedPayload.action];
    if (!actionConfig) {
      return res.status(400).json({ error: `Unsupported gateway action: ${validatedPayload.action}` });
    }

    // 4. Role-Based Access Control (RBAC) check
    const userRole = (user.role || 'recruiter') as OpenUIRole;
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

      // Action-Specific ABAC Rules (Deterministic Security Checks)
      switch (validatedPayload.action) {
        case 'APPROVE_SLA':
        case 'LAUNCH_CAMPAIGN': {
          // Rule: SLA and Campaigns can only be performed by Client Managers on requirements belonging to their organization
          const isClientUser = ['client', 'hiring_manager', 'client_hm', 'client_finance'].includes(userRole);
          if (!isClientUser) {
            return res.status(403).json({
              error: `ABAC Violation: Role ${userRole} is unauthorized to perform ${validatedPayload.action} (this is a client-specific operational control).`
            });
          }

          const reqDoc = await adminDb.collection('requirements_public').doc(validatedPayload.entityId).get();
          if (!reqDoc.exists) {
            return res.status(404).json({ error: `Not Found: Requirement ${validatedPayload.entityId} does not exist in requirements_public` });
          }
          const reqData = reqDoc.data();
          if (reqData?.clientId !== userOrgId) {
            return res.status(403).json({
              error: 'ABAC Violation: You can only approve SLAs or launch campaigns on requirements owned by your organization.'
            });
          }
          break;
        }

        case 'SUBMIT_CANDIDATE':
        case 'SHORTLIST_CANDIDATE': {
          // Rule: Submitting/shortlisting requires:
          // 1. Candidate must be owned by the user's vendor/recruiter organization
          // 2. Requirement must be active and either owned by the same client or explicitly shared with the vendor
          const candidateId = validatedPayload.entityId;
          const targetRequirementId = validatedPayload.requirementId;

          if (!candidateId || !targetRequirementId) {
            return res.status(400).json({ error: 'Bad Request: Missing candidateId or requirementId for submission context.' });
          }

          const [candDoc, reqDoc] = await Promise.all([
            adminDb.collection('candidatePool').doc(candidateId).get(),
            adminDb.collection('requirements_public').doc(targetRequirementId).get()
          ]);

          if (!candDoc.exists) {
            return res.status(404).json({ error: `Not Found: Candidate ${candidateId} does not exist in candidatePool` });
          }
          if (!reqDoc.exists) {
            return res.status(404).json({ error: `Not Found: Requirement ${targetRequirementId} does not exist in requirements_public` });
          }

          const candData = candDoc.data();
          const reqData = reqDoc.data();

          // Recruiter must own/manage the candidate
          const isVendorOwner = candData?.vendorId === userOrgId;
          const isAssignedRecruiter = candData?.assignedRecruiterId === user.uid;
          if (!isVendorOwner && !isAssignedRecruiter) {
            return res.status(403).json({
              error: 'ABAC Violation: You can only submit/shortlist candidates that are managed/owned by your organization.'
            });
          }

          // Requirement must be shared with the recruiter's organization, or they must own it (or requirement is open)
          const isReqSharedWithVendor = reqData?.vendorId === userOrgId || 
                                        reqData?.sharedVendors?.includes(userOrgId) || 
                                        reqData?.status === 'OPEN';
          if (!isReqSharedWithVendor && reqData?.clientId !== userOrgId) {
            return res.status(403).json({
              error: 'ABAC Violation: This requirement is not shared with or accessible to your organization.'
            });
          }
          break;
        }

        case 'OVERRIDE_MATCH_SCORE': {
          // Rule: Match score override requires admin role or Client HM (if requirement belongs to client)
          const isAuthorizedRole = ['admin', 'super_admin', 'ops_admin', 'hq_admin', 'client_hm', 'client_recruiter'].includes(userRole);
          if (!isAuthorizedRole) {
            return res.status(403).json({
              error: `ABAC Violation: Role ${userRole} is unauthorized to perform match score overrides.`
            });
          }

          const targetRequirementId = validatedPayload.requirementId;
          if (!targetRequirementId) {
            return res.status(400).json({ error: 'Bad Request: Missing requirementId for match score override.' });
          }

          const reqDoc = await adminDb.collection('requirements_public').doc(targetRequirementId).get();
          if (!reqDoc.exists) {
            return res.status(404).json({ error: `Not Found: Requirement ${targetRequirementId} does not exist in requirements_public` });
          }
          const reqData = reqDoc.data();
          if (reqData?.clientId !== userOrgId) {
            return res.status(403).json({
              error: 'ABAC Violation: You can only override match scores for requirements owned by your organization.'
            });
          }
          break;
        }

        case 'REQUEST_CANDIDATE_UPDATE': {
          // Rule: Can request update only if candidate is owned/assigned, or is currently submitted to user's client requirement
          const candDoc = await adminDb.collection('candidatePool').doc(validatedPayload.entityId).get();
          if (!candDoc.exists) {
            return res.status(404).json({ error: `Not Found: Candidate ${validatedPayload.entityId} does not exist in candidatePool` });
          }
          const candData = candDoc.data();
          const isVendorOwner = candData?.vendorId === userOrgId;
          const isClientOwner = candData?.clientId === userOrgId;

          if (!isVendorOwner && !isClientOwner) {
            // Check if there is an active submission to this client
            const activeSubmissions = await adminDb.collection('submissions')
              .where('candidateId', '==', validatedPayload.entityId)
              .where('vendorOrgId', '==', userOrgId)
              .limit(1)
              .get();

            if (activeSubmissions.empty) {
              return res.status(403).json({
                error: 'ABAC Violation: You do not have permission to request updates for this candidate.'
              });
            }
          }
          break;
        }

        case 'VIEW_CANDIDATE': {
          const candDoc = await adminDb.collection('candidatePool').doc(validatedPayload.entityId).get();
          if (!candDoc.exists) {
            return res.status(404).json({ error: `Not Found: Candidate ${validatedPayload.entityId} does not exist in candidatePool` });
          }
          const candData = candDoc.data();
          const isVendorOwner = candData?.vendorId === userOrgId;
          const isClientOwner = candData?.clientId === userOrgId;
          const isAssigned = candData?.assignedRecruiterId === user.uid;

          if (!isVendorOwner && !isClientOwner && !isAssigned) {
            return res.status(403).json({
              error: 'ABAC Violation: Unauthorized candidate access scope.'
            });
          }
          break;
        }

        case 'VIEW_REQUIREMENT': {
          const reqDoc = await adminDb.collection('requirements_public').doc(validatedPayload.entityId).get();
          if (!reqDoc.exists) {
            return res.status(404).json({ error: `Not Found: Requirement ${validatedPayload.entityId} does not exist in requirements_public` });
          }
          const reqData = reqDoc.data();
          const isClientOwner = reqData?.clientId === userOrgId;
          const isShared = reqData?.vendorId === userOrgId || reqData?.sharedVendors?.includes(userOrgId) || reqData?.status === 'OPEN';

          if (!isClientOwner && !isShared) {
            return res.status(403).json({
              error: 'ABAC Violation: Unauthorized requirement access scope.'
            });
          }
          break;
        }

        default:
          break;
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
        let existingData: Record<string, unknown> = {};
        let currentStatus = "SUBMITTED";

        if (!querySnap.empty) {
          submissionId = querySnap.docs[0].id;
          existingData = querySnap.docs[0].data() as Record<string, unknown> || {};
          currentStatus = (existingData.status as string) || "SUBMITTED";
        }

        // Evaluate State Transition through Canonical Kernel (Strict Fail-Closed Integration)
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
        } catch (stateErr: unknown) {
          const msg = stateErr instanceof Error ? stateErr.message : String(stateErr);
          console.error("[Kernel State Policy Failure - Fail Closed]:", msg);
          return res.status(500).json({
            error: "State Transition Denied",
            details: `The canonical State Engine validation encountered a transaction error: ${msg}`
          });
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
        } catch (slaErr: unknown) {
          const msg = slaErr instanceof Error ? slaErr.message : String(slaErr);
          console.warn("[Kernel SLA Operations Warning]:", msg);
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
        } catch (eventErr: unknown) {
          const msg = eventErr instanceof Error ? eventErr.message : String(eventErr);
          console.warn("[Kernel Event Publish Warning]:", msg);
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[OpenUI Gateway Error]:', msg);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: msg,
    });
  }
}
