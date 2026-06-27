export interface CapabilityRequest {
    type: string;
    payload: any;
}

export interface CapabilityResponse {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * CapabilityBroker sits between the Office and the actual implementation of skills (e.g. Resume Parser, Matching).
 * Offices request capabilities rather than calling specific skills directly.
 */
export class CapabilityBroker {
    async requestCapability(request: CapabilityRequest): Promise<CapabilityResponse> {
        // Implementation for routing capability requests to appropriate skills/models
        return { success: true };
    }
}
