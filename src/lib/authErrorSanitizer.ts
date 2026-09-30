/**
 * Centralized Firebase / Auth Error Sanitizer
 * Maps internal Firebase error codes to clean, safe, professional user-facing messages.
 */
export function sanitizeAuthError(err: any): string {
  if (!err) return "An unexpected authentication error occurred. Please try again.";

  const message = typeof err === "string" ? err : err?.message || "";
  const code = err?.code || "";

  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    message.includes("auth/invalid-credential") ||
    message.includes("auth/wrong-password") ||
    message.includes("auth/user-not-found")
  ) {
    return "Invalid email address or password. Please check your credentials and try again.";
  }

  if (code === "auth/email-already-in-use" || message.includes("auth/email-already-in-use")) {
    return "An account with this email address already exists. Please sign in or reset your password.";
  }

  if (code === "auth/weak-password" || message.includes("auth/weak-password")) {
    return "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
  }

  if (code === "auth/invalid-email" || message.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }

  if (
    code === "auth/network-request-failed" ||
    message.includes("Failed to fetch") ||
    message.includes("network-request-failed")
  ) {
    return "Network connection error. Please check your internet connection and try again.";
  }

  if (code === "auth/too-many-requests" || message.includes("auth/too-many-requests")) {
    return "Too many failed attempts. Access temporarily restricted for safety. Please try again in a few minutes.";
  }

  if (code === "auth/user-disabled" || message.includes("user-disabled") || message.includes("auth/user-disabled")) {
    return "Your account has been deactivated or disabled. Please contact support.";
  }

  if (code === "auth/popup-closed-by-user" || message.includes("popup-closed-by-user")) {
    return "Sign-in window was closed before completing authentication. Please try again.";
  }

  // If already a clean user-facing error message without internal Firebase codes or stack traces
  if (!message.includes("auth/") && !message.includes("Firebase:") && message.length < 150) {
    return message;
  }

  return "Authentication failed. Please verify your credentials and try again.";
}
