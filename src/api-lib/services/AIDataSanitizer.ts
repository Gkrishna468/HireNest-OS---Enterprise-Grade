export class AIDataSanitizer {
  /**
   * Identifies and pseudonymizes direct PII identifiers while preserving recruitment evidence.
   */
  public static sanitize(text: string, candidateName?: string): string {
    if (!text) return "";

    let sanitized = text;

    // 1. Aadhaar / PAN / Passport / National Identifiers
    const panRegex = /\b[A-Z]{5}\d{4}[A-Z]\b/g; // PAN card
    sanitized = sanitized.replace(panRegex, "[GOVT_PAN_REDACTED]");

    const aadhaarRegex = /\b\d{4}\s\d{4}\s\d{4}\b/g; // Aadhaar card
    sanitized = sanitized.replace(aadhaarRegex, "[GOVT_AADHAAR_REDACTED]");

    const passportRegex = /\b[A-Z]\d{7}\b/g; // Indian passport format
    sanitized = sanitized.replace(passportRegex, "[GOVT_PASSPORT_REDACTED]");

    // SSN
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    sanitized = sanitized.replace(ssnRegex, "[GOVT_SSN_REDACTED]");

    // 2. Email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    sanitized = sanitized.replace(emailRegex, "email@ref-holder.internal");

    // 3. Phone numbers (international and US formats)
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    sanitized = sanitized.replace(phoneRegex, "+1-XXX-XXX-XXXX");

    // 4. Case-insensitive replace of candidate's name if provided
    if (candidateName && candidateName.trim().length > 1) {
      const escapedName = candidateName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Replace full name
      const fullNameRegex = new RegExp(`\\b${escapedName}\\b`, 'gi');
      sanitized = sanitized.replace(fullNameRegex, "CANDIDATE_REF_NAME");

      // Replace individual first/last name if longer than 2 chars
      const parts = candidateName.split(/\s+/).filter(p => p.length > 2);
      for (const part of parts) {
        const partEscaped = part.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const partRegex = new RegExp(`\\b${partEscaped}\\b`, 'gi');
        sanitized = sanitized.replace(partRegex, "CANDIDATE_REF_NAME");
      }
    }

    // 5. Raw Credit Cards (Luhn validation check)
    // To avoid false positives on long strings of random numbers, we only redact if Luhn algorithm is valid.
    const ccRegex = /\b(?:\d[ -]*?){13,16}\b/g;
    sanitized = sanitized.replace(ccRegex, (match) => {
      const digits = match.replace(/[- ]/g, "");
      if (digits.length >= 13 && digits.length <= 16) {
        if (AIDataSanitizer.isValidLuhn(digits)) {
          return "[CREDIT_CARD_REDACTED]";
        }
      }
      return match; // It's just a long number (e.g. ID, date, zip), preserve it.
    });

    return sanitized;
  }

  private static isValidLuhn(digits: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let val = parseInt(digits[i], 10);
      if (shouldDouble) {
        val *= 2;
        if (val > 9) val -= 9;
      }
      sum += val;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }
}
