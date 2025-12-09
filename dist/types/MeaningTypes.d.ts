/**
 * Meaning Dimension Type Definitions
 *
 * TypeScript interfaces for meaning.core entities using ONE.core branded types.
 * Semantic similarity is a dimension like time or space - closeness in meaning space.
 */
import type { SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
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
/**
 * Supported embedding models
 *
 * Model choice affects:
 * - Embedding dimensionality
 * - Semantic quality
 * - Compatibility (can't compare embeddings from different models)
 */
export type EmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002' | 'all-MiniLM-L6-v2' | 'all-mpnet-base-v2' | 'bge-small-en-v1.5' | 'bge-base-en-v1.5' | 'bge-large-en-v1.5' | 'nomic-embed-text' | 'nomic-embed-text-v1.5' | 'custom';
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
export declare const EMBEDDING_MODELS: Record<EmbeddingModel, EmbeddingModelInfo>;
/**
 * Distance/similarity metrics for vector comparison
 */
export type DistanceMetric = 'cosine' | 'euclidean' | 'dot_product';
/**
 * Compute cosine similarity between two vectors
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * Compute Euclidean distance between two vectors
 */
export declare function euclideanDistance(a: number[], b: number[]): number;
/**
 * Compute dot product between two vectors
 */
export declare function dotProduct(a: number[], b: number[]): number;
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
export declare const DEFAULT_HNSW_CONFIG: HNSWConfig;
/**
 * Validate embedding vector
 */
export declare function validateEmbedding(embedding: number[], expectedDimensions?: number): void;
/**
 * Validate model compatibility between two embeddings
 */
export declare function validateModelCompatibility(modelA: EmbeddingModel, modelB: EmbeddingModel): void;
//# sourceMappingURL=MeaningTypes.d.ts.map