/**
 * Meaning Dimension Type Definitions
 *
 * TypeScript interfaces for meaning.core entities using ONE.core branded types.
 * Semantic similarity is a dimension like time or space - closeness in meaning space.
 */

import type {SHA256Hash} from '@refinio/one.core/lib/util/type-checks.js';

// ============================================================================
// Meaning Entities
// ============================================================================

/**
 * MeaningNode - Node in semantic space
 *
 * Represents a point in embedding space. Unlike time (hierarchical tree) or
 * space (geohash grid), meaning space uses approximate nearest neighbor (ANN)
 * indexing for efficient similarity search.
 *
 * The embedding vector IS the position in meaning space.
 */
export interface MeaningNode {
    $type$: 'MeaningNode';
    /** The embedding vector - position in semantic space */
    embedding: number[];
    /** Embedding model used (for compatibility checking) */
    model: EmbeddingModel;
    /** Dimensionality of the embedding */
    dimensions: number;
    /** Optional: source text that was embedded (for re-embedding on model change) */
    sourceText?: string;
    /** Optional: content type hint */
    contentType?: 'text' | 'image' | 'audio' | 'multimodal';
}

/**
 * MeaningDimensionValue - DimensionValue specialization for meaning
 *
 * Links an object to its position in semantic space via MeaningNode.
 */
export interface MeaningDimensionValue {
    $type$: 'MeaningDimensionValue';
    /** Reference to "meaning" dimension */
    dimensionHash: SHA256Hash;
    /** Reference to the MeaningNode containing the embedding */
    meaningNodeHash: SHA256Hash<MeaningNode>;
    /** Timestamp when embedding was created */
    created: number;
}

// ============================================================================
// Embedding Models
// ============================================================================

/**
 * Supported embedding models
 *
 * Model choice affects:
 * - Embedding dimensionality
 * - Semantic quality
 * - Compatibility (can't compare embeddings from different models)
 */
export type EmbeddingModel =
    | 'text-embedding-3-small'   // OpenAI, 1536 dims
    | 'text-embedding-3-large'   // OpenAI, 3072 dims
    | 'text-embedding-ada-002'   // OpenAI legacy, 1536 dims
    | 'all-MiniLM-L6-v2'         // Sentence Transformers, 384 dims
    | 'all-mpnet-base-v2'        // Sentence Transformers, 768 dims
    | 'bge-small-en-v1.5'        // BAAI, 384 dims
    | 'bge-base-en-v1.5'         // BAAI, 768 dims
    | 'bge-large-en-v1.5'        // BAAI, 1024 dims
    | 'nomic-embed-text'         // Ollama default name, 768 dims
    | 'nomic-embed-text-v1.5'    // Nomic, 768 dims
    | 'custom';                   // User-provided model

/**
 * Model metadata for validation and compatibility
 */
export interface EmbeddingModelInfo {
    name: EmbeddingModel;
    dimensions: number;
    maxTokens: number;
    provider: 'openai' | 'huggingface' | 'local' | 'custom';
}

/**
 * Known model configurations
 */
export const EMBEDDING_MODELS: Record<EmbeddingModel, EmbeddingModelInfo> = {
    'text-embedding-3-small': {name: 'text-embedding-3-small', dimensions: 1536, maxTokens: 8191, provider: 'openai'},
    'text-embedding-3-large': {name: 'text-embedding-3-large', dimensions: 3072, maxTokens: 8191, provider: 'openai'},
    'text-embedding-ada-002': {name: 'text-embedding-ada-002', dimensions: 1536, maxTokens: 8191, provider: 'openai'},
    'all-MiniLM-L6-v2': {name: 'all-MiniLM-L6-v2', dimensions: 384, maxTokens: 512, provider: 'huggingface'},
    'all-mpnet-base-v2': {name: 'all-mpnet-base-v2', dimensions: 768, maxTokens: 512, provider: 'huggingface'},
    'bge-small-en-v1.5': {name: 'bge-small-en-v1.5', dimensions: 384, maxTokens: 512, provider: 'huggingface'},
    'bge-base-en-v1.5': {name: 'bge-base-en-v1.5', dimensions: 768, maxTokens: 512, provider: 'huggingface'},
    'bge-large-en-v1.5': {name: 'bge-large-en-v1.5', dimensions: 1024, maxTokens: 512, provider: 'huggingface'},
    'nomic-embed-text': {name: 'nomic-embed-text', dimensions: 768, maxTokens: 8192, provider: 'local'},
    'nomic-embed-text-v1.5': {name: 'nomic-embed-text-v1.5', dimensions: 768, maxTokens: 8192, provider: 'huggingface'},
    'custom': {name: 'custom', dimensions: 0, maxTokens: 0, provider: 'custom'}
};

// ============================================================================
// Distance Metrics
// ============================================================================

/**
 * Distance/similarity metrics for vector comparison
 */
export type DistanceMetric = 'cosine' | 'euclidean' | 'dot_product';

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
}

/**
 * Compute Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
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
export function dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }

    return sum;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Semantic query criterion
 */
export interface MeaningCriterion {
    /** Query embedding vector */
    embedding: number[];
    /** Number of nearest neighbors to return */
    k: number;
    /** Minimum similarity threshold (0-1 for cosine) */
    threshold?: number;
    /** Distance metric to use */
    metric?: DistanceMetric;
}

/**
 * Semantic query result with similarity score
 */
export interface MeaningQueryResult {
    objectHash: SHA256Hash;
    meaningNodeHash: SHA256Hash<MeaningNode>;
    similarity: number;
}

// ============================================================================
// Embedding Provider Interface
// ============================================================================

/**
 * Interface for embedding providers (OpenAI, local models, etc.)
 *
 * Implementations handle the actual embedding generation.
 * meaning.core is agnostic to which provider is used.
 */
export interface EmbeddingProvider {
    /** Model this provider uses */
    readonly model: EmbeddingModel;

    /** Generate embedding for text */
    embed(text: string): Promise<number[]>;

    /** Generate embeddings for multiple texts (batch) */
    embedBatch(texts: string[]): Promise<number[][]>;
}

// ============================================================================
// Index Configuration
// ============================================================================

/**
 * HNSW index configuration
 */
export interface HNSWConfig {
    /** Max connections per node (higher = better recall, more memory) */
    M: number;
    /** Size of dynamic candidate list during construction */
    efConstruction: number;
    /** Size of dynamic candidate list during search */
    efSearch: number;
}

/**
 * Default HNSW configuration (balanced for typical use)
 */
export const DEFAULT_HNSW_CONFIG: HNSWConfig = {
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
export function validateEmbedding(embedding: number[], expectedDimensions?: number): void {
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
export function validateModelCompatibility(modelA: EmbeddingModel, modelB: EmbeddingModel): void {
    if (modelA !== modelB) {
        throw new Error(
            `Cannot compare embeddings from different models: ${modelA} vs ${modelB}. ` +
            `Embeddings must use the same model for meaningful comparison.`
        );
    }
}
