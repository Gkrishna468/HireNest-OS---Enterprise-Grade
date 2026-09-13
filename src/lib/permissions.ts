import { isRoleAdminEquivalent, normalizeRole } from "./rbac.js";

export const checkIsAdmin = (role?: string | null, _orgId?: string | null) => {
  if (!role) return false;
  return isRoleAdminEquivalent(role);
};

export const checkIsBusinessOperations = (role?: string | null) => {
  if (!role) return false;
  const norm = normalizeRole(role);
  return norm === "BUSINESS_OPERATIONS" || norm === "PLATFORM_AUTHORITY";
};

export const checkIsBusinessManager = (role?: string | null) => {
  if (!role) return false;
  const norm = normalizeRole(role);
  return norm === "BUSINESS_OPERATIONS" || norm === "PLATFORM_AUTHORITY";
};

export const checkIsClient = (role: string) => {
  const norm = normalizeRole(role);
  return norm === "CLIENT_ADMIN" || norm === "CLIENT_HM" || norm === "CLIENT_FINANCE";
};

export const checkIsVendor = (role: string) => {
  const norm = normalizeRole(role);
  return norm === "VENDOR_ADMIN" || norm === "VENDOR_RECRUITER";
};

export const checkIsRecruiter = (role: string) => {
  const norm = normalizeRole(role);
  return norm === "VENDOR_RECRUITER";
};

export const checkIsIndependent = (role: string) => {
  const norm = normalizeRole(role);
  return norm === "VENDOR_RECRUITER";
};

export const checkIsCandidate = (role?: string | null) => {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === "candidate" || normalized === "direct_candidate";
};

export const CANDIDATE_PERMISSIONS = [
  "jobs.read.public",
  "applications.create.own",
  "applications.read.own",
  "profile.read.own",
  "profile.update.own",
  "resume.upload.own",
  "documents.read.own",
  "screening.submit.own"
] as const;



