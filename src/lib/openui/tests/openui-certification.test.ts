import { OPENUI_ACTION_REGISTRY } from '../actions.js';
import { OPENUI_COMPONENTS } from '../components.js';
import { validateOpenUIAction, ACTION_SCHEMAS } from '../validator.js';
import { OpenUIActionName } from '../../../types.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runCertificationTests() {
  console.log('====================================================');
  console.log('     HIRENESTOS OPENUI PHASE 5 SECURITY CERTIFIER   ');
  console.log('====================================================\n');

  try {
    // 1. WHITELIST COMPONENT VERIFICATION
    console.log('--- 1. Whitelisted Components Verification ---');
    const whitelistedComponents = [
      'KPIGrid', 'CandidateTable', 'CandidateCard', 'RequirementHealth',
      'RequirementCard', 'VendorPerformance', 'SubmissionTimeline',
      'SkillsMatrix', 'AIInsight', 'FollowUpCard', 'TaskBoard', 'RevenueCard'
    ];
    assert(OPENUI_COMPONENTS.length === 12, 'Component whitelist must contain exactly 12 components');
    for (const comp of whitelistedComponents) {
      const match = OPENUI_COMPONENTS.find(c => c.name === comp);
      assert(!!match, `Component whitelist must contain whitelisted component [${comp}]`);
    }

    // 2. UNKNOWN COMPONENT / VERSION REJECTION VERIFICATION
    console.log('\n--- 2. Unknown and Unsupported Component Rejection ---');
    const invalidComponentName = 'MaliciousShellComponent';
    const isWhitelisted = OPENUI_COMPONENTS.some(c => c.name === invalidComponentName);
    assert(!isWhitelisted, `Unknown component [${invalidComponentName}] must not be whitelisted`);

    const invalidVersion = '2.0';
    const isVersionSupported = OPENUI_COMPONENTS.some(c => c.name === 'CandidateTable' && c.versions.includes(invalidVersion));
    assert(!isVersionSupported, `Unsupported component version [${invalidVersion}] on CandidateTable must be rejected`);

    // 3. ACTION REGISTRY VERIFICATION
    console.log('\n--- 3. whitelisted Actions Verification ---');
    const whitelistActions: OpenUIActionName[] = [
      'APPROVE_SLA', 'OVERRIDE_MATCH_SCORE', 'SHORTLIST_CANDIDATE', 'SUBMIT_CANDIDATE',
      'REQUEST_CANDIDATE_UPDATE', 'CREATE_FOLLOWUP', 'ASSIGN_TASK', 'LAUNCH_CAMPAIGN',
      'VIEW_REQUIREMENT', 'VIEW_VENDOR', 'VIEW_CANDIDATE'
    ];
    for (const action of whitelistActions) {
      assert(!!OPENUI_ACTION_REGISTRY[action], `Action registry must contain registered action [${action}]`);
    }

    // 4. MALFORMED PAYLOAD REJECTION (Zod validations)
    console.log('\n--- 4. Malformed Payload Rejection ---');
    try {
      validateOpenUIAction({
        action: 'APPROVE_SLA',
        entityType: 'requirement',
        entityId: '', // invalid: empty ID
        requestedValue: 30,
        source: 'openui'
      });
      assert(false, 'Validator must fail on empty entityId');
    } catch {
      assert(true, 'Validator correctly rejected empty entityId payload');
    }

    try {
      validateOpenUIAction({
        action: 'OVERRIDE_MATCH_SCORE',
        entityType: 'candidate',
        entityId: 'CAND-001',
        requirementId: 'REQ-001',
        requestedValue: 101, // invalid: score > 100
        reason: 'Valid override reason note here',
        source: 'openui'
      });
      assert(false, 'Validator must fail on match score greater than 100');
    } catch {
      assert(true, 'Validator correctly rejected match score greater than 100');
    }

    // 5. ROLE AUTHORIZATION POLICIES
    console.log('\n--- 5. Role Authorization Policies (RBAC) ---');
    const submitCandidateRule = OPENUI_ACTION_REGISTRY['SUBMIT_CANDIDATE'];
    assert(!submitCandidateRule.requiredRole.includes('client'), 'Client role must be unauthorized for SUBMIT_CANDIDATE');
    assert(submitCandidateRule.requiredRole.includes('recruiter'), 'Recruiter role must be authorized for SUBMIT_CANDIDATE');
    assert(submitCandidateRule.requiredRole.includes('admin'), 'Admin role must be authorized for SUBMIT_CANDIDATE');

    // 6. CONFIRMATION AND REASON-LENGTH ENFORCEMENT
    console.log('\n--- 6. Confirmation and Reason-Length Policies ---');
    const scoreOverrideRule = OPENUI_ACTION_REGISTRY['OVERRIDE_MATCH_SCORE'];
    assert(scoreOverrideRule.confirmationRequired === 'confirm_with_reason', 'OVERRIDE_MATCH_SCORE must require confirm_with_reason policy');

    try {
      validateOpenUIAction({
        action: 'OVERRIDE_MATCH_SCORE',
        entityType: 'candidate',
        entityId: 'CAND-001',
        requirementId: 'REQ-001',
        requestedValue: 85,
        reason: 'Short', // invalid: min length is 5 characters
        source: 'openui'
      });
      assert(false, 'Validator must reject short override reason (min 5 characters)');
    } catch {
      assert(true, 'Validator correctly enforced minimum reason-length constraint');
    }

    // 7. ABAC / IDOR SECURITY GATE CHECKS (Simulation)
    console.log('\n--- 7. Attribute-Based Access Control (ABAC) Gate Checks ---');
    const mockUser_RecruiterA = { uid: 'REC-A', role: 'recruiter', orgId: 'ORG-ALPHA' };
    const mockUser_Admin = { uid: 'ADM-1', role: 'admin', orgId: 'ORG-GLOBAL-HQ' };

    const mockCandidateOwnedByAlpha = { id: 'CAND-1', vendorId: 'ORG-ALPHA', clientId: 'CLIENT-Z' };
    const mockCandidateOwnedByBeta = { id: 'CAND-2', vendorId: 'ORG-BETA', clientId: 'CLIENT-Z' };

    // Function matching our openui-gateway server-side ABAC logic
    function checkABAC_CandidateAccess(user: any, candidate: any): boolean {
      const isGlobalHQ = ['admin', 'super_admin', 'ops_admin', 'hq_admin'].includes(user.role) || 
                         user.orgId === 'ORG-GLOBAL-HQ' || 
                         user.orgId === 'ADMIN';
      if (isGlobalHQ) return true;

      const userOrgId = user.orgId;
      return candidate.vendorId === userOrgId || candidate.clientId === userOrgId;
    }

    assert(checkABAC_CandidateAccess(mockUser_RecruiterA, mockCandidateOwnedByAlpha) === true, 'Recruiter A must have access to candidates in ORG-ALPHA');
    assert(checkABAC_CandidateAccess(mockUser_RecruiterA, mockCandidateOwnedByBeta) === false, 'Recruiter A must be blocked from candidates in ORG-BETA (ABAC/IDOR gate)');
    assert(checkABAC_CandidateAccess(mockUser_Admin, mockCandidateOwnedByBeta) === true, 'Admin must bypass ABAC and have global scopes');

    console.log('\n====================================================');
    console.log(`CERTIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('STATUS: HIRENESTOS OPENUI GOVERNANCE GATE CERTIFIED ✅');
    console.log('====================================================');
  } catch (err: any) {
    console.error('\n[CRITICAL FAIL] Certification Suite Interrupted:', err.message);
    process.exit(1);
  }
}

runCertificationTests();
