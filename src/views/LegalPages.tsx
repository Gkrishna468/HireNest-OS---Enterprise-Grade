import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, Download, Trash2, FileText, Lock, Cookie, AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export function LegalLayout({ 
  children, 
  title, 
  subtitle,
  badge = "Enterprise Governance"
}: { 
  children: React.ReactNode; 
  title: string; 
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Top Navigation */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
              <ShieldCheck size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 leading-tight">HireNestOS</span>
              <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Trust & Compliance</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Platform
            </Link>
          </div>
        </div>

        {/* Legal Sub-Nav */}
        <div className="bg-slate-100/80 border-t border-slate-200/60 overflow-x-auto">
          <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 py-1.5 text-xs font-medium">
            <Link to="/privacy" className="px-3 py-1 rounded hover:bg-white text-slate-700 hover:text-indigo-600 transition">Privacy Policy</Link>
            <Link to="/terms" className="px-3 py-1 rounded hover:bg-white text-slate-700 hover:text-indigo-600 transition">Terms of Service</Link>
            <Link to="/cookies" className="px-3 py-1 rounded hover:bg-white text-slate-700 hover:text-indigo-600 transition">Cookie Policy</Link>
            <Link to="/security" className="px-3 py-1 rounded hover:bg-white text-slate-700 hover:text-indigo-600 transition">Security Architecture</Link>
            <Link to="/data-request" className="px-3 py-1 rounded hover:bg-white text-slate-700 hover:text-indigo-600 transition flex items-center gap-1">
              <Download size={12} /> Data Export
            </Link>
            <Link to="/delete-account" className="px-3 py-1 rounded hover:bg-red-50 text-slate-700 hover:text-red-600 transition flex items-center gap-1">
              <Trash2 size={12} /> Delete Account
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <header className="mb-12 border-b border-slate-200 pb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
            <ShieldCheck size={13} /> {badge}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">{title}</h1>
          <p className="text-slate-500 font-medium text-sm">{subtitle}</p>
        </header>

        <div className="space-y-10 text-slate-700 leading-relaxed text-sm md:text-base">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 mt-20">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-800">HireNestOS Governance & Security Directorate</p>
            <p className="mt-0.5">Compliant with Digital Personal Data Protection (DPDP) Act 2023 & CERT-In Cyber Security Directions.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-indigo-600">Privacy</Link>
            <Link to="/terms" className="hover:text-indigo-600">Terms</Link>
            <Link to="/security" className="hover:text-indigo-600">Security</Link>
            <Link to="/data-request" className="hover:text-indigo-600">SAR Request</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. PRIVACY POLICY (DPDP Act 2023, DPDP Rules 2025, GDPR, CCPA Aligned)
// ---------------------------------------------------------------------------
export function PrivacyPage() {
  return (
    <LegalLayout 
      title="Privacy Policy & Data Protection Notice" 
      subtitle="Last updated & verified: September 2026 • Statutory Compliance Edition"
      badge="DPDP Act 2023 & CERT-In Compliant"
    >
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">1. Platform Scope & Purpose</h2>
        <p>
          HireNestOS (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) operates an AI-native staffing and workforce management operating system. This Privacy Policy informs Data Principals (candidates, recruiters, vendor partners, and enterprise clients) regarding our collection, storage, processing, transfer, and deletion of personal data in strict adherence to the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>, the <strong>DPDP Rules, 2025</strong>, the <strong>Information Technology (Certifying Authorities) Rules</strong>, and Indian Computer Emergency Response Team (<strong>CERT-In</strong>) directions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">2. Categories of Personal Data Collected</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 text-xs md:text-sm">
            <thead className="bg-slate-100 text-slate-800 font-semibold">
              <tr>
                <th className="p-3 border border-slate-200">Category</th>
                <th className="p-3 border border-slate-200">Data Points</th>
                <th className="p-3 border border-slate-200">Processing Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-slate-900">Account Credentials</td>
                <td className="p-3 border border-slate-200">Full name, official email address, mobile number, company name, organizational role.</td>
                <td className="p-3 border border-slate-200">Authentication, multi-tenant RBAC validation, access control.</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 border border-slate-200 font-medium text-slate-900">Candidate Recruitment Data</td>
                <td className="p-3 border border-slate-200">Resume documents (PDF/DOCX), employment history, technical skills, educational background, compensation targets.</td>
                <td className="p-3 border border-slate-200">Job matching, talent pipeline scoring, candidate profile creation.</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-slate-900">Enterprise Job Requirements</td>
                <td className="p-3 border border-slate-200">Job descriptions, hiring velocity quotas, budget allocations, technical requirements.</td>
                <td className="p-3 border border-slate-200">Strategic routing to accredited staffing vendors and candidate scoring.</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 border border-slate-200 font-medium text-slate-900">Technical & Security Telemetry</td>
                <td className="p-3 border border-slate-200">Masked IP addresses, request IDs, user agent, endpoint latency, authentication audit trail.</td>
                <td className="p-3 border border-slate-200">Security monitoring, brute-force mitigation, CERT-In statutory compliance.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">3. Sub-Processors & Cloud Infrastructure Disclosures</h2>
        <p>
          We maintain zero unauthorized third-party tracking. We strictly use vetted enterprise cloud sub-processors under Data Processing Agreements (DPAs):
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Google Cloud Platform (GCP) & Cloud Run</strong>: Container hosting, encrypted runtime execution, and Secret Manager key isolation.</li>
          <li><strong>Google Firebase (Auth, Firestore, Cloud Storage)</strong>: Token-based identity authentication, multi-tenant attribute-based database storage, and encrypted resume file vaults.</li>
          <li><strong>Google Gemini AI API (@google/genai)</strong>: Ephemeral server-side AI execution for resume text extraction and candidate-to-requirement semantic scoring. <em>Your data is processed in isolated server memory and is NOT used to train public foundation models.</em></li>
          <li><strong>Sentry / Telemetry Monitor</strong>: Production exception monitoring with automated masking of credentials, tokens, and PII.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">4. Data Retention & CERT-In Compliance</h2>
        <p>
          Personal data is retained only for as long as necessary to fulfill the recruitment and operational purposes for which it was collected:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Active Candidate Records:</strong> Maintained while active searches or vendor assignments remain open, or until the candidate/vendor requests erasure.</li>
          <li><strong>Account Profiles:</strong> Retained until the user or organization requests account termination.</li>
          <li><strong>Security Incident & Audit Logs:</strong> Under Rule 11 of the <em>CERT-In Cyber Security Directions 2022</em>, security logs, access timestamps, and masked transaction audit events are legally mandated to be retained for a <strong>rolling period of 180 consecutive days</strong> before automatic archival deletion.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">5. Data Principal Rights (DPDP Act Sec. 11-13)</h2>
        <p>
          Under the DPDP Act 2023 and global privacy frameworks (including GDPR), Data Principals enjoy explicit rights:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
              <Download size={15} className="text-indigo-600" /> Right to Access & Portability
            </h3>
            <p className="text-xs text-slate-600 mb-2">Obtain a structured, machine-readable JSON copy of all personal and profile information.</p>
            <Link to="/data-request" className="text-xs font-semibold text-indigo-600 hover:underline">Submit Export Request &rarr;</Link>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
              <Trash2 size={15} className="text-red-600" /> Right to Erasure / Account Deletion
            </h3>
            <p className="text-xs text-slate-600 mb-2">Request immediate removal of personal details, resumes, and active candidate profiles.</p>
            <Link to="/delete-account" className="text-xs font-semibold text-red-600 hover:underline">Initiate Erasure &rarr;</Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">6. Grievance Redressal Officer (DPDP Act Mandate)</h2>
        <p>
          In accordance with Section 13(1) of the DPDP Act 2023 and the Information Technology Rules, HireNestOS has designated a dedicated Grievance Officer:
        </p>
        <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs md:text-sm space-y-1 text-slate-800">
          <p><strong>Designated Grievance Officer:</strong> Chief Privacy Officer / Legal Governance Directorate</p>
          <p><strong>Entity:</strong> HireNestOS Workforce Technologies Private Limited</p>
          <p><strong>Email:</strong> <a href="mailto:privacy@hirenestworkforce.com" className="text-indigo-600 font-semibold underline">privacy@hirenestworkforce.com</a> (or <a href="mailto:dpo@hirenestos.com" className="text-indigo-600 font-semibold underline">dpo@hirenestos.com</a>)</p>
          <p><strong>Turnaround Time:</strong> All statutory complaints, SARs, or data corrections are acknowledged within 24 hours and addressed within 7 business days.</p>
        </div>
      </section>
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// 2. TERMS OF SERVICE
// ---------------------------------------------------------------------------
export function TermsPage() {
  return (
    <LegalLayout 
      title="Terms of Service & Platform Agreement" 
      subtitle="Standard Commercial SaaS Terms • Effective September 2026"
      badge="Enterprise Legal Agreement"
    >
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">1. Platform License & Acceptance</h2>
        <p>
          By signing up, logging in, or connecting an enterprise tenant to HireNestOS (&quot;the Platform&quot;), you (&quot;Customer&quot;, &quot;Recruiter&quot;, &quot;Client&quot;, or &quot;Vendor&quot;) agree to be legally bound by these Terms of Service. If you do not accept these terms, you must not access or utilize the platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">2. Customer Ownership of Candidate Data</h2>
        <p>
          You retain complete, unencumbered ownership of all Candidate Resumes, Job Descriptions, and proprietary submission records uploaded to your tenant workspace. HireNestOS does not claim intellectual property rights over customer data and will never sell customer candidate pools to unauthorized third-party advertisers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">3. Acceptable Use & Security Obligations</h2>
        <p>Users must comply with the following standards:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li><strong>Lawful Sourcing:</strong> Resumes submitted to the platform must have been obtained with valid candidate consent or legitimate recruiting authorization.</li>
          <li><strong>No Circumvention:</strong> Users must not attempt to bypass multi-tenant isolation, tamper with candidate ownership timestamps, or perform unauthorized fuzzing/penetration attacks without prior written consent from the security team.</li>
          <li><strong>Credential Integrity:</strong> Users are responsible for maintaining multi-factor security on their account credentials.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">4. AI Capabilities & Human-in-the-Loop Governance</h2>
        <p>
          AI-generated matching scores and resume extraction summaries are operational decision-support recommendations. Recruiters and hiring managers retain final authority on interview scheduling, hiring decisions, and candidate evaluations. HireNestOS explicitly mandates human verification on all automated workflows.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">5. Service Availability & Termination</h2>
        <p>
          We commit to enterprise-grade service availability (99.9% uptime target). Either party may terminate account access upon written notice. Upon termination, customer data export is facilitated in accordance with Section 5 of our Privacy Policy.
        </p>
      </section>
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// 3. COOKIE & STORAGE POLICY (/cookies)
// ---------------------------------------------------------------------------
export function CookiePolicyPage() {
  return (
    <LegalLayout 
      title="Cookie & Local Storage Policy" 
      subtitle="Transparent Disclosure of Session Identifiers & Browser Caching"
      badge="Technical Transparency"
    >
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">1. Zero Third-Party Advertising Trackers</h2>
        <p>
          HireNestOS operates on a strict <strong>Zero Third-Party Advertising Tracker</strong> policy. We do not place advertising cookies, retargeting pixels, or cross-site tracking beacons (such as Meta Pixel or Google Ads tracking) within our application workspace.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">2. Essential Browser Storage Items</h2>
        <p>
          To provide secure authentication, workspace persistence, and offline fallback resilience, the application uses modern browser storage mechanisms (IndexedDB and LocalStorage):
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 text-xs md:text-sm">
            <thead className="bg-slate-100 text-slate-800 font-semibold">
              <tr>
                <th className="p-3 border border-slate-200">Key / Storage Type</th>
                <th className="p-3 border border-slate-200">Category</th>
                <th className="p-3 border border-slate-200">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200 font-mono text-indigo-700">firebase:authUser:*</td>
                <td className="p-3 border border-slate-200 font-medium">Strictly Necessary</td>
                <td className="p-3 border border-slate-200">Maintains secure JWT cryptographic session token for authenticated platform access.</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 border border-slate-200 font-mono text-indigo-700">hirenest_theme</td>
                <td className="p-3 border border-slate-200 font-medium">Functional Preference</td>
                <td className="p-3 border border-slate-200">Persists user visual preference (Light / Dark workspace mode).</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-mono text-indigo-700">activeWorkspaceTab</td>
                <td className="p-3 border border-slate-200 font-medium">Functional State</td>
                <td className="p-3 border border-slate-200">Restores last viewed tab (e.g., Candidates, Jobs, Submissions) upon browser refresh.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">3. Managing Browser Storage</h2>
        <p>
          You can clear LocalStorage and session caches at any time via your browser developer tools or settings menu. Please note that clearing authentication tokens will log you out of your current session.
        </p>
      </section>
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// 4. SECURITY ARCHITECTURE POLICY (/security)
// ---------------------------------------------------------------------------
export function SecurityPolicyPage() {
  return (
    <LegalLayout 
      title="Enterprise Security Architecture" 
      subtitle="Zero-Trust Controls, ABAC Isolation & Defense-in-Depth"
      badge="Enterprise Security"
    >
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">1. Security by Design & Zero Trust</h2>
        <p>
          HireNestOS is architected with strict Zero-Trust boundaries. Every request to our backend API endpoints is verified against cryptographic JWT tokens, tenant boundaries, and Attribute-Based Access Control (ABAC) rules before data execution occurs.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">2. Core Security Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Lock size={16} className="text-indigo-600" /> Encryption Everywhere
            </h3>
            <p className="text-xs text-slate-600">All data in transit is encrypted using TLS 1.3. All database collections and document storage objects are encrypted at rest using AES-256 standards.</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" /> Strict Tenant Isolation
            </h3>
            <p className="text-xs text-slate-600">Vendors and Clients can only view candidate records directly scoped to their registered organization identifier. Cross-organization access is prohibited at both Firestore rules and backend API layers.</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" /> Immutable Audit Ledger
            </h3>
            <p className="text-xs text-slate-600">High-privilege actions (user provisioning, role assignment, deletion, and submission reviews) are written to an append-only audit trail with correlation IDs.</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <AlertTriangle size={16} className="text-indigo-600" /> Rate Limiting & DoS Defense
            </h3>
            <p className="text-xs text-slate-600">Dynamic IP and user-based token bucket rate limiters protect AI endpoints, resume extractors, and authentication routes against abusive traffic.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">3. Responsible Vulnerability Disclosure</h2>
        <p>
          We welcome collaboration with cybersecurity researchers. If you discover a potential vulnerability, please report it directly to <a href="mailto:security@hirenestworkforce.com" className="text-indigo-600 font-semibold underline">security@hirenestworkforce.com</a>. We adhere to coordinated vulnerability disclosure timelines and do not pursue legal action against researchers acting in good faith.
        </p>
      </section>
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// 5. DATA EXPORT / SUBJECT ACCESS REQUEST (/data-request)
// ---------------------------------------------------------------------------
export function DataRequestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be logged in to download your personal data export. Please sign in first.");
      }

      const token = await currentUser.getIdToken();
      const res = await fetch('/api/user/export-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const jsonPayload = await res.json();
      
      // Trigger instant client-side download
      const blob = new Blob([JSON.stringify(jsonPayload.data || jsonPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hirenest-data-export-${currentUser.uid.slice(0, 8)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Failed to generate data export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegalLayout 
      title="Data Portability & Subject Access Request" 
      subtitle="Download a copy of your personal data pursuant to DPDP Act 2023 Sec. 11 & GDPR Art. 20"
      badge="Right to Access"
    >
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Download size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Download Machine-Readable Archive (JSON)</h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              Export your registered user profile, linked organization metadata, and audit records in an interoperable, structured JSON format.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs md:text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs md:text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            <span>Data export successfully generated and downloaded to your device!</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={15} className="animate-spin" /> Generating Export...
              </>
            ) : (
              <>
                <Download size={15} /> Export My Personal Data
              </>
            )}
          </button>
          <Link
            to="/login"
            className="w-full sm:w-auto px-4 py-2.5 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Not signed in? Log in here
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-2">
          <p><strong>Manual Grievance / Inquiries:</strong> You can also submit formal data requests by contacting our Data Protection Officer at <a href="mailto:privacy@hirenestworkforce.com" className="text-indigo-600 underline">privacy@hirenestworkforce.com</a> with the subject line <em>&quot;SAR Request - [Your Full Name]&quot;</em>.</p>
        </div>
      </div>
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// 6. DELETE ACCOUNT / RIGHT TO ERASURE (/delete-account)
// ---------------------------------------------------------------------------
export function DeleteAccountPage() {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (confirmationInput !== 'DELETE') {
      setError("Please type 'DELETE' exactly to confirm your request.");
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be signed in to submit an account erasure request.");
      }

      const token = await currentUser.getIdToken();
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          confirm: 'DELETE',
          reason: reason || "User requested self-erasure via legal portal"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      setSuccess(true);
      await signOut(auth);
      setTimeout(() => {
        navigate('/');
      }, 4000);
    } catch (e: any) {
      setError(e.message || "Failed to process erasure request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegalLayout 
      title="Right to Erasure & Account Termination" 
      subtitle="Request permanent deletion of your profile under DPDP Act 2023 Sec. 12 & GDPR Art. 17"
      badge="Right to Erasure"
    >
      <div className="bg-white rounded-xl border border-red-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Trash2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Permanent Account Deletion</h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              Submitting this request will immediately revoke your access, delete your registered authentication credentials, and purge your user record from active databases.
            </p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs md:text-sm text-amber-900 space-y-2">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-amber-700" /> Important Statutory Compliance Notice (CERT-In 180-Day Rule):
          </p>
          <p>
            In accordance with Rule 11 of the <em>CERT-In Cyber Security Directions 2022</em> and mandatory Indian IT laws, immutable security incident logs, connection metadata, and masked audit trail entries are legally required to be retained in rolling format for <strong>180 days</strong> before permanent automated purge. No direct marketing or recruitment outreach will occur during this retention period.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs md:text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2 text-center">
            <CheckCircle size={32} className="text-emerald-600 mx-auto" />
            <h3 className="font-bold text-base">Account Successfully Erased</h3>
            <p className="text-xs text-emerald-800">
              Your credentials and personal record have been removed. You will be redirected to the homepage in a few moments...
            </p>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for leaving (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Help us improve: why are you closing your account?"
                rows={2}
                className="w-full text-xs md:text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                To confirm permanent erasure, type <span className="font-bold text-red-600">DELETE</span> below:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Type DELETE"
                required
                className="w-full sm:w-64 text-xs md:text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600 font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || confirmationInput !== 'DELETE'}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Confirm Permanent Erasure
              </button>
            </div>
          </form>
        )}
      </div>
    </LegalLayout>
  );
}
