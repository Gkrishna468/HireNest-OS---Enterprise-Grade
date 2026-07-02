export class AIGuardrails {
    /**
     * Checks if the text contains sensitive PII that shouldn't be processed.
     */
    static detectPII(text: string): boolean {
        // Basic naive PII detection for demonstration (SSN, credit cards)
        const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/;
        const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/;
        
        if (ssnRegex.test(text) || creditCardRegex.test(text)) {
            return true;
        }
        return false;
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
