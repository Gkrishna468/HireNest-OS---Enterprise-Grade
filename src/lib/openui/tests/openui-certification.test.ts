import { OPENUI_ACTION_REGISTRY } from '../actions.ts';
import { OPENUI_COMPONENTS } from '../components.ts';
import { validateOpenUIAction } from '../validator.ts';
import { OpenUIActionName, OpenUIActionPayload } from '../../../types.ts';
import openuiGatewayHandler from '../../../api-lib/handlers/openui-gateway.ts';

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

// Simple express mock environment
function createMockRequest(user: any, body: any): any {
  return {
    user,
    body,
  } as any;
}

function createMockResponse(): any {
  const res: any = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
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
    const isVersionSupported = OPENUI_COMPONENTS.some(c => c.name === 'CandidateTable' && c.version === invalidVersion);
    assert(!isVersionSupported, `Unsupported component version [${invalidVersion}] on CandidateTable must be rejected`);

    // 3. ACTION REGISTRY VERIFICATION
    console.log('\n--- 3. Whitelisted Actions Verification ---');
    const whitelistActions: OpenUIActionName[] = [
      'APPROVE_SLA', 'OVERRIDE_MATCH_SCORE', 'SHORTLIST_CANDIDATE', 'SUBMIT_CANDIDATE',
      'REQUEST_CANDIDATE_UPDATE', 'CREATE_FOLLOWUP', 'ASSIGN_TASK', 'LAUNCH_CAMPAIGN',
      'VIEW_REQUIREMENT', 'VIEW_VENDOR', 'VIEW_CANDIDATE'
    ];
    for (const action of whitelistActions) {
      assert(!!OPENUI_ACTION_REGISTRY[action], `Action registry must contain registered action [${action}]`);
    }

    // 4. DIRECT GATEWAY UNUATHORIZED ACCESS CHECKS
    console.log('\n--- 4. Direct Gateway Auth Context Verification ---');
    const unauthorizedReq = createMockRequest(null, { action: 'VIEW_VENDOR', entityType: 'vendor', entityId: 'VEND-001' });
    const authRes = createMockResponse();
    await openuiGatewayHandler(unauthorizedReq, authRes);
    assert(authRes.statusCode === 401, 'Gateway must return 401 Unauthorized for missing authentication contexts');

    // 5. DIRECT GATEWAY SCHEMA VALIDATION REJECTIONS
    console.log('\n--- 5. Direct Gateway Schema Rejections (Fail-Closed) ---');
    const malformedReq = createMockRequest(
      { uid: 'USR-001', role: 'recruiter' },
      { action: 'APPROVE_SLA', entityType: 'requirement', entityId: '', requestedValue: 15 } // invalid empty ID
    );
    const malformedRes = createMockResponse();
    await openuiGatewayHandler(malformedReq, malformedRes);
    assert(malformedRes.statusCode === 400, 'Gateway must reject malformed schema payloads with 400 Bad Request');

    // 6. DIRECT GATEWAY ROLE ACCESS CONTROLS (RBAC)
    console.log('\n--- 6. Direct Gateway Role Checks (RBAC) ---');
    const forbiddenReq = createMockRequest(
      { uid: 'USR-001', role: 'client' }, // client role executing submit_candidate
      { action: 'SUBMIT_CANDIDATE', entityType: 'candidate', entityId: 'CAND-001', requirementId: 'REQ-001' }
    );
    const forbiddenRes = createMockResponse();
    await openuiGatewayHandler(forbiddenReq, forbiddenRes);
    assert(forbiddenRes.statusCode === 403, 'Gateway must return 403 Forbidden when unauthorized roles trigger restricted whitelisted actions');

    // 7. GATEWAY ACTION-SPECIFIC OPERATIONAL ACCESS CHECKS (ABAC)
    console.log('\n--- 7. Action-Specific Operational Controls (ABAC) ---');
    const unauthorizedSlaReq = createMockRequest(
      { uid: 'USR-001', role: 'recruiter', orgId: 'ORG-VENDOR' }, // recruiter role attempting APPROVE_SLA (only clients allowed)
      { action: 'APPROVE_SLA', entityType: 'requirement', entityId: 'REQ-001', requestedValue: 15 }
    );
    const unauthorizedSlaRes = createMockResponse();
    await openuiGatewayHandler(unauthorizedSlaReq, unauthorizedSlaRes);
    assert(unauthorizedSlaRes.statusCode === 403, 'Gateway must fail-closed if recruiters try to approve SLAs');

    console.log('\n====================================================');
    console.log(`CERTIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('STATUS: HIRENESTOS PRODUCTION GATEWAY CERTIFIED ✅');
    console.log('====================================================');
  } catch (err: any) {
    console.error('\n[CRITICAL FAIL] Certification Suite Interrupted:', err.message);
    process.exit(1);
  }
}

runCertificationTests();
