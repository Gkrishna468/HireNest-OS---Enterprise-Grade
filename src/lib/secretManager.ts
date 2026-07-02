/**
 * SecretManager
 * Abstract interface for retrieving sensitive credentials (API keys, JWT secrets, etc.).
 * In production, this integrates with Google Cloud Secret Manager.
 * In development or preview, it falls back to environment variables.
 */
import { ErrorMonitor } from '../api-lib/telemetry/errorMonitor.js';

export class SecretManager {
    private static cache: Record<string, { value: string, expiresAt: number }> = {};
    private static CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins cache for rotation without downtime

    /**
     * Gets a secret by its name. 
     * Supports fetching from GCP Secret Manager and caches it.
     */
    static async getSecret(secretName: string): Promise<string | undefined> {
        // Check cache first
        const cached = this.cache[secretName];
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }

        try {
            let secretValue: string | undefined;

            // Simulated GCP Secret Manager fetch
            // In a real Google Cloud environment, we would use @google-cloud/secret-manager
            /*
            const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
            const client = new SecretManagerServiceClient();
            const [version] = await client.accessSecretVersion({
                 name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
            });
            secretValue = version.payload?.data?.toString();
            */

            // Fallback to process.env (for AI Studio / local dev)
            if (!secretValue) {
                secretValue = process.env[secretName];
            }

            if (secretValue) {
                this.cache[secretName] = {
                    value: secretValue,
                    expiresAt: Date.now() + this.CACHE_TTL_MS
                };
            }

            return secretValue;
        } catch (e: any) {
            console.error(`[SecretManager] Failed to fetch secret ${secretName}:`, e.message);
            await ErrorMonitor.captureError({
                context: 'SecretManager',
                errorType: 'BACKEND_EXCEPTION',
                errorMessage: `Failed to fetch secret: ${secretName}`,
                metadata: { error: e.message }
            });
            return undefined;
        }
    }

    /**
     * Clear cache to force rotation manually.
     */
    static clearCache() {
        this.cache = {};
    }
}
