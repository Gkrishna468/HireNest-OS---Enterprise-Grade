export class AIGuardrails {
    /**
     * Checks if the text contains sensitive PII that shouldn't be processed.
     */
    static detectPII(text: string): boolean {
        // SSN check
        const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/;
        if (ssnRegex.test(text)) {
            return true;
        }

        // Credit Card check with Luhn validation
        const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
        let match;
        while ((match = creditCardRegex.exec(text)) !== null) {
            const digits = match[0].replace(/[- ]/g, "");
            if (digits.length >= 13 && digits.length <= 16) {
                if (AIGuardrails.isValidLuhn(digits)) {
                    return true;
                }
            }
        }
        return false;
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

    /**
     * Checks if the text contains highly toxic or restricted keywords.
     */
    static detectToxicity(text: string): boolean {
        const toxicKeywords = ["hate_speech_keyword", "violence_keyword"]; // Simplified
        const lowerText = text.toLowerCase();
        for (const kw of toxicKeywords) {
            if (lowerText.includes(kw)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Validates that the AI output adheres to the expected schema or rules.
     */
    static validateOutput(output: any, schemaRequired: boolean): { isValid: boolean, reason?: string } {
        if (!output) return { isValid: false, reason: "Output is empty" };
        
        if (schemaRequired) {
            if (typeof output !== 'object') {
                return { isValid: false, reason: "Expected JSON object output" };
            }
            // Further schema validation could be added here
        }
        
        return { isValid: true };
    }
}
