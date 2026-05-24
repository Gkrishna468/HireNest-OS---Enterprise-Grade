export interface EmbeddingMetadata {
    model: string;
    dimensions: number;
    version: string;
}

export const CURRENT_EMBEDDING_REGISTRY: EmbeddingMetadata = {
    model: "text-embedding-004", // Default version
    dimensions: 768,             // Match Gemini standard
    version: "v4"
};

export function checkEmbeddingStaleness(candidateEmbeddingVersion: string | undefined): boolean {
    if (!candidateEmbeddingVersion) return true;
    if (candidateEmbeddingVersion !== CURRENT_EMBEDDING_REGISTRY.version) {
        console.warn(`[EMBEDDING_GOVERNANCE] Stale embedding version detected: ${candidateEmbeddingVersion}. Current: ${CURRENT_EMBEDDING_REGISTRY.version}`);
        return true; // Needs refresh
    }
    return false;
}
