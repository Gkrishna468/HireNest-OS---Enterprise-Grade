export function sanitizePromptInput(input: string): string {
    if (!input) return "";
    
    let sanitized = input;
    
    // 1. Remove dangerous XML/HTML overriding tags
    sanitized = sanitized.replace(/<\/?system>/gi, "")
                         .replace(/<\/?instruction>/gi, "")
                         .replace(/<\/?override>/gi, "")
                         .replace(/<\/?prompt>/gi, "");
                         
    // 2. Truncate aggressively long inputs to prevent token exhaustion / buffer floods
    if (sanitized.length > 50000) {
        sanitized = sanitized.substring(0, 50000) + "... [TRUNCATED]";
    }
    
    return sanitized;
}
