/**
 * Meaning Dimension Type Definitions
 *
 * TypeScript interfaces for meaning.core entities using ONE.core branded types.
 * Semantic similarity is a dimension like time or space - closeness in meaning space.
 */
/**
 * Known model configurations
 */
export const EMBEDDING_MODELS = {
    'text-embedding-3-small': { name: 'text-embedding-3-small', dimensions: 1536, maxTokens: 8191, provider: 'openai' },
    'text-embedding-3-large': { name: 'text-embedding-3-large', dimensions: 3072, maxTokens: 8191, provider: 'openai' },
    'text-embedding-ada-002': { name: 'text-embedding-ada-002', dimensions: 1536, maxTokens: 8191, provider: 'openai' },
    'all-MiniLM-L6-v2': { name: 'all-MiniLM-L6-v2', dimensions: 384, maxTokens: 512, provider: 'huggingface' },
    'all-mpnet-base-v2': { name: 'all-mpnet-base-v2', dimensions: 768, maxTokens: 512, provider: 'huggingface' },
    'bge-small-en-v1.5': { name: 'bge-small-en-v1.5', dimensions: 384, maxTokens: 512, provider: 'huggingface' },
    'bge-base-en-v1.5': { name: 'bge-base-en-v1.5', dimensions: 768, maxTokens: 512, provider: 'huggingface' },
    'bge-large-en-v1.5': { name: 'bge-large-en-v1.5', dimensions: 1024, maxTokens: 512, provider: 'huggingface' },
    'nomic-embed-text': { name: 'nomic-embed-text', dimensions: 768, maxTokens: 8192, provider: 'local' },
    'nomic-embed-text-v1.5': { name: 'nomic-embed-text-v1.5', dimensions: 768, maxTokens: 8192, provider: 'huggingface' },
    'custom': { name: 'custom', dimensions: 0, maxTokens: 0, provider: 'custom' }
};
/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0)
        return 0;
    return dotProduct / magnitude;
}
/**
 * Compute Euclidean distance between two vectors
 */
export function euclideanDistance(a, b) {
    if (a.length !== b.length) {
        throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}
/**
 * Compute dot product between two vectors
 */
export function dotProduct(a, b) {
    if (a.length !== b.length) {
        throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}
/**
 * Default HNSW configuration (balanced for typical use)
 */
export const DEFAULT_HNSW_CONFIG = {
    M: 16,
    efConstruction: 200,
    efSearch: 50
};
// ============================================================================
// Validation
// ============================================================================
/**
 * Validate embedding vector
 */
export function validateEmbedding(embedding, expectedDimensions) {
    if (!Array.isArray(embedding)) {
        throw new Error('Embedding must be an array');
    }
    if (embedding.length === 0) {
        throw new Error('Embedding cannot be empty');
    }
    if (expectedDimensions !== undefined && embedding.length !== expectedDimensions) {
        throw new Error(`Embedding dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}`);
    }
    for (let i = 0; i < embedding.length; i++) {
        if (typeof embedding[i] !== 'number' || !isFinite(embedding[i])) {
            throw new Error(`Invalid embedding value at index ${i}: ${embedding[i]}`);
        }
    }
}
/**
 * Validate model compatibility between two embeddings
 */
export function validateModelCompatibility(modelA, modelB) {
    if (modelA !== modelB) {
        throw new Error(`Cannot compare embeddings from different models: ${modelA} vs ${modelB}. ` +
            `Embeddings must use the same model for meaningful comparison.`);
    }
}
//# sourceMappingURL=MeaningTypes.js.map