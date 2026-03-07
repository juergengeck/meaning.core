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
 * All embeddings use the standard model (nomic-embed-text-v1.5, 768 dims).
 */
export interface MeaningNode {
    $type$: 'MeaningNode';
    /** The embedding vector - position in semantic space (768 dimensions) */
    embedding: number[];
    /** Embedding model identifier - required for compatibility validation */
    model: string;
    /** Dimensionality of the embedding */
    dimensions: number;
    /** Optional: source text that was embedded */
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
// Embedding Model - Single Standardized Model
// ============================================================================

/**
 * Standard embedding model for all LAMA embeddings
 *
 * We standardize on a single model to ensure:
 * - All embeddings are comparable across the ecosystem
 * - Embeddings can be shared between instances
 * - No model compatibility issues
 *
 * Providers:
 * - Ollama (desktop): uses 'nomic-embed-text' model name
 * - ONNX (mobile/offline): bundled model for devices without Ollama
 */
export const EMBEDDING_MODEL = 'nomic-embed-text-v1.5' as const;
export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_MAX_TOKENS = 8192;

/**
 * Type alias for embedding model (single value for type safety)
 */
export type EmbeddingModel = typeof EMBEDDING_MODEL;

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
 * Interface for embedding providers (Ollama, ONNX, etc.)
 *
 * Implementations handle the actual embedding generation.
 * All providers use the standard embedding model (nomic-embed-text-v1.5).
 */
export interface EmbeddingProvider {
    /** Generate embedding for text (returns 768-dim vector) */
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

