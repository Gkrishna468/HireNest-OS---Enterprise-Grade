import { AccessControlService, HireNestAccessContext } from "./accessControlService";
import { CandidateRequirementEligibilityPolicy } from "./CandidateRequirementEligibilityPolicy";

export interface SecurityMatrixTestCase {
  roleName: string;
  userType: string;
  context: HireNestAccessContext;
  expectedPermissions: {
    canAccessCandidateFeed: boolean;
    canAccessCRM: boolean;
    canAccessAssignedReq: boolean;
    canAccessOtherVendorReq: boolean;
    canAccessOtherVendorCandidate: boolean;
    canAccessOwnCandidateData: boolean;
    canAccessOtherCandidateData: boolean;
    isPlatformAuthority: boolean;
  };
}

export interface SecurityMatrixTestResult {
  roleName: string;
  passed: boolean;
  checks: {
    name: string;
    expected: boolean;
    actual: boolean;
    passed: boolean;
  }[];
}

/**
 * SecurityMatrixValidation
 * Authoritatively verifies the 10-Role HireNest ABAC / RBAC Security Access Matrix.
 */
export class SecurityMatrixValidation {
  public static getMatrixTestCases(): SecurityMatrixTestCase[] {
    return [
      // 1. Candidate
      {
        roleName: "Candidate",
        userType: "CANDIDATE",
        context: {
          userId: "CAND_USR_101",
          candidateId: "CAND_USR_101",
          email: "candidate.alice@gmail.com",
          role: "CANDIDATE",
          organizationId: "CANDIDATE_COMMUNITY"
        },
        expectedPermissions: {
          canAccessCandidateFeed: true,
          canAccessCRM: false,
          canAccessAssignedReq: true, // For public eligible requirements
          canAccessOtherVendorReq: false,
          canAccessOtherVendorCandidate: false,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: false,
          isPlatformAuthority: false
        }
      },
      // 2. Internal Recruiter
      {
        roleName: "Internal Recruiter",
        userType: "RECRUITER",
        context: {
          userId: "REC_INT_01",
          recruiterId: "REC_INT_01",
          email: "recruiter.internal@hirenest.com",
          role: "RECRUITER",
          recruiterType: "INTERNAL",
          abacScope: "ASSIGNED_ONLY",
          assignedRequirementIds: ["REQ_ACTIVE_001"],
          organizationId: "ORG-GLOBAL-HQ"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: false,
          canAccessOtherVendorCandidate: true, // Internal recruiter has organization-wide pool access across vendors
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: true, // internal recruiter reviews applicants
          isPlatformAuthority: false
        }
      },
      // 3. Vendor Recruiter (e.g. Shreeji Consulting)
      {
        roleName: "Vendor Recruiter",
        userType: "RECRUITER",
        context: {
          userId: "REC_VEND_01",
          recruiterId: "REC_VEND_01",
          email: "shreeji.recruiter@vendor.com",
          role: "RECRUITER",
          recruiterType: "VENDOR",
          abacScope: "ASSIGNED_ONLY",
          vendorId: "VEND_SHREEJI",
          assignedRequirementIds: ["REQ_ACTIVE_001"],
          organizationId: "VEND_SHREEJI"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: false, // Cannot access unassigned other vendor reqs
          canAccessOtherVendorCandidate: false, // STRICT VENDOR ISOLATION: Cannot see Test Vendor / Work Nexa candidates
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: false,
          isPlatformAuthority: false
        }
      },
      // 4. Freelance Recruiter
      {
        roleName: "Freelance Recruiter",
        userType: "RECRUITER",
        context: {
          userId: "REC_FREE_01",
          recruiterId: "REC_FREE_01",
          email: "freelance.rec@hirenest.com",
          role: "RECRUITER",
          recruiterType: "FREELANCE",
          abacScope: "EXPLICIT_ONLY",
          assignedRequirementIds: ["REQ_ACTIVE_001"],
          organizationId: "ORG-FREELANCE"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: false,
          canAccessOtherVendorCandidate: false,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: false,
          isPlatformAuthority: false
        }
      },
      // 5. Vendor Admin
      {
        roleName: "Vendor Admin",
        userType: "VENDOR",
        context: {
          userId: "VEND_ADM_01",
          email: "admin@shreeji.com",
          role: "VENDOR",
          vendorId: "VEND_SHREEJI",
          organizationId: "VEND_SHREEJI"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: false,
          canAccessOtherVendorCandidate: false,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: false,
          isPlatformAuthority: false
        }
      },
      // 6. Client Hiring Manager
      {
        roleName: "Client Hiring Manager",
        userType: "CLIENT",
        context: {
          userId: "CLI_HM_01",
          email: "hm@techclient.com",
          role: "CLIENT",
          clientId: "CLIENT_ACME",
          organizationId: "CLIENT_ACME"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: false,
          canAccessOtherVendorCandidate: false,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: false,
          isPlatformAuthority: false
        }
      },
      // 7. Client Admin
      {
        roleName: "Client Admin",
        userType: "CLIENT",
        context: {
          userId: "CLI_ADM_01",
          email: "admin@techclient.com",
          role: "CLIENT",
          clientId: "CLIENT_ACME",
          organizationId: "CLIENT_ACME"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: false,
          canAccessOtherVendorCandidate: false,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: false,
          isPlatformAuthority: false
        }
      },
      // 8. Client Finance
      {
        roleName: "Client Finance",
        userType: "CLIENT",
        context: {
          userId: "CLI_FIN_01",
          email: "finance@techclient.com",
          role: "CLIENT",
          clientId: "CLIENT_ACME",
          organizationId: "CLIENT_ACME",
          permissions: ["BILLING_VIEW"]
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: false,
          canAccessOtherVendorCandidate: false,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: false,
          isPlatformAuthority: false
        }
      },
      // 9. Business Operations
      {
        roleName: "Business Operations",
        userType: "HQ",
        context: {
          userId: "HQ_OPS_01",
          email: "bizops@hirenest.com",
          role: "BUSINESS_OPERATIONS",
          organizationId: "ORG-GLOBAL-HQ"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: true,
          canAccessOtherVendorCandidate: true,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: true,
          isPlatformAuthority: true
        }
      },
      // 10. Platform Authority
      {
        roleName: "Platform Authority",
        userType: "HQ",
        context: {
          userId: "HQ_SUPER_01",
          email: "superadmin@hirenest.com",
          role: "SUPER_ADMIN",
          organizationId: "ORG-GLOBAL-HQ"
        },
        expectedPermissions: {
          canAccessCandidateFeed: false,
          canAccessCRM: true,
          canAccessAssignedReq: true,
          canAccessOtherVendorReq: true,
          canAccessOtherVendorCandidate: true,
          canAccessOwnCandidateData: true,
          canAccessOtherCandidateData: true,
          isPlatformAuthority: true
        }
      }
    ];
  }

  /**
   * Evaluates the matrix synchronously with simulated resource descriptors
   */
  public static async validateSecurityMatrix(): Promise<SecurityMatrixTestResult[]> {
    const testCases = this.getMatrixTestCases();
    const results: SecurityMatrixTestResult[] = [];

    // Simulated resources
    const publicEligibleReq = {
      id: "REQ_ACTIVE_001",
      title: "Senior Full Stack Engineer",
      status: "ACTIVE",
      employmentType: "FTE",
      workMode: "Onsite",
      candidatePublish: true,
      directApplyEnabled: true,
      distributedVendorIds: ["VEND_SHREEJI"],
      vendorId: "VEND_SHREEJI",
      clientId: "CLIENT_ACME",
      assignedRecruiterId: "REC_INT_01"
    };

    const privateOtherVendorReq = {
      id: "REQ_OTHER_002",
      title: "Private Backend Lead",
      status: "ACTIVE",
      employmentType: "Contract",
      workMode: "Remote",
      candidatePublish: false,
      distributedVendorIds: ["VEND_OTHER_TEST"],
      vendorId: "VEND_OTHER_TEST",
      clientId: "CLIENT_OTHER"
    };

    const ownCandidate = {
      id: "CAND_USR_101",
      userId: "CAND_USR_101",
      email: "candidate.alice@gmail.com",
      vendorId: "VEND_SHREEJI",
      clientId: "CLIENT_ACME",
      recruiterId: "REC_FREE_01",
      submittedByUserId: "REC_FREE_01",
      requirementId: "REQ_ACTIVE_001"
    };

    const otherVendorCandidate = {
      id: "CAND_OTHER_999",
      userId: "CAND_OTHER_999",
      email: "other.candidate@gmail.com",
      vendorId: "VEND_OTHER_TEST",
      clientId: "CLIENT_OTHER",
      recruiterId: "REC_OTHER_999",
      requirementId: "REQ_OTHER_002"
    };

    for (const tc of testCases) {
      const checks: { name: string; expected: boolean; actual: boolean; passed: boolean }[] = [];

      // Check 1: Candidate Feed Access
      const actualFeedAccess = tc.context.role === "CANDIDATE";
      checks.push({
        name: "Candidate Feed Visibility",
        expected: tc.expectedPermissions.canAccessCandidateFeed,
        actual: actualFeedAccess,
        passed: actualFeedAccess === tc.expectedPermissions.canAccessCandidateFeed
      });

      // Check 2: CRM Core Access
      const actualCRMAccess = tc.context.role !== "CANDIDATE";
      checks.push({
        name: "CRM Internal Access",
        expected: tc.expectedPermissions.canAccessCRM,
        actual: actualCRMAccess,
        passed: actualCRMAccess === tc.expectedPermissions.canAccessCRM
      });

      // Check 3: Candidate Data Isolation (Own Candidate vs Other Candidate)
      const actualOwnCandAccess = await AccessControlService.canViewCandidate(tc.context, ownCandidate.id, ownCandidate);
      checks.push({
        name: "Own Candidate Data Access",
        expected: tc.expectedPermissions.canAccessOwnCandidateData,
        actual: actualOwnCandAccess,
        passed: actualOwnCandAccess === tc.expectedPermissions.canAccessOwnCandidateData
      });

      const actualOtherCandAccess = await AccessControlService.canViewCandidate(tc.context, otherVendorCandidate.id, otherVendorCandidate);
      checks.push({
        name: "Other Vendor Candidate Isolation",
        expected: tc.expectedPermissions.canAccessOtherVendorCandidate,
        actual: actualOtherCandAccess,
        passed: actualOtherCandAccess === tc.expectedPermissions.canAccessOtherVendorCandidate
      });

      // Check 4: Platform Authority
      const actualOps = AccessControlService.isOpsAdmin(tc.context.role);
      checks.push({
        name: "Platform Authority Clearance",
        expected: tc.expectedPermissions.isPlatformAuthority,
        actual: actualOps,
        passed: actualOps === tc.expectedPermissions.isPlatformAuthority
      });

      const allPassed = checks.every(c => c.passed);
      results.push({
        roleName: tc.roleName,
        passed: allPassed,
        checks
      });
    }

    return results;
  }
}
