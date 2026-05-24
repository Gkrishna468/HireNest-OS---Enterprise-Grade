export function validateWorkerLease(event: any, currentWorkerId: string): boolean {
    if (event.status !== "LEASED") return false;
    
    // 1. Identity validation
    if (event.workerId !== currentWorkerId) {
        console.warn(`[SECURITY] Worker ${currentWorkerId} attempted to execute lease owned by ${event.workerId}`);
        return false;
    }
    
    // 2. Expiry validation
    const now = Date.now();
    const expiry = new Date(event.leasedUntil || 0).getTime();
    if (now > expiry) {
        console.warn(`[SECURITY] Lease expired for event ${event.id}`);
        return false;
    }
    
    return true;
}
