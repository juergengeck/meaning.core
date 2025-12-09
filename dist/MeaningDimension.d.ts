/**
 * MeaningDimension - Main API for semantic dimension
 *
 * Provides meaning-based indexing and querying using embeddings.
 * Semantic similarity is a dimension like time or space - closeness in meaning.
 *
 * Pattern parallels TimeDimension:
 * - TimeDimension indexes timestamps → TimeNodes (sparse tree)
 * - MeaningDimension indexes embeddings → MeaningNodes (HNSW graph)
 */
import type { SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { MeaningDimensionValue, MeaningCriterion, MeaningQueryResult, EmbeddingModel, EmbeddingProvider, DistanceMetric, HNSWConfig } from './types/MeaningTypes.js';
/**
 * Configuration for MeaningDimension
 */
export interface MeaningDimensionConfig {
    /** Embedding model to use */
    model: EmbeddingModel;
    /** Custom dimensions if model is 'custom' */
    customDimensions?: number;
    /** Distance metric for similarity */
    metric?: DistanceMetric;
    /** HNSW index configuration */
    hnswConfig?: Partial<HNSWConfig>;
    /** Optional embedding provider (for automatic text embedding) */
    embeddingProvider?: EmbeddingProvider;
}
/**
 * MeaningDimension - Semantic dimension implementation
 *
 * Implements DimensionInstance interface for cube.core integration.
 */
export declare class MeaningDimension {
    private dimensionHash?;
    private initialized;
    private index;
    private readonly model;
    private readonly dimensions;
    private readonly metric;
    private readonly embeddingProvider?;
    constructor(config: MeaningDimensionConfig);
    /**
     * Initialize the dimension (register recipes, rebuild index)
     */
    init(): Promise<void>;
    /**
     * Get the dimension hash
     */
    getDimensionHash(): Promise<SHA256Hash>;
    /**
     * Index an object with an embedding
     *
     * @param objectHash - Hash of the object to index
     * @param embedding - The embedding vector
     * @param sourceText - Optional source text (for re-embedding)
     */
    indexEmbedding(objectHash: SHA256Hash, embedding: number[], sourceText?: string): Promise<SHA256Hash<MeaningDimensionValue>>;
    /**
     * Index an object with text (requires embeddingProvider)
     *
     * @param objectHash - Hash of the object to index
     * @param text - Text to embed
     */
    indexText(objectHash: SHA256Hash, text: string): Promise<SHA256Hash<MeaningDimensionValue>>;
    /**
     * Query objects by semantic similarity
     *
     * @param criterion - Query criterion with embedding, k, threshold
     */
    query(criterion: MeaningCriterion): Promise<SHA256Hash[]>;
    /**
     * Query with full results including similarity scores
     */
    queryWithScores(criterion: MeaningCriterion): Promise<MeaningQueryResult[]>;
    /**
     * Query by text (requires embeddingProvider)
     */
    queryByText(text: string, k: number, threshold?: number): Promise<MeaningQueryResult[]>;
    /**
     * Get dimension value hash for an embedding
     */
    getValueHash(embedding: number[]): Promise<SHA256Hash<MeaningDimensionValue>>;
    /**
     * Check if an object is already indexed
     */
    isIndexed(objectHash: SHA256Hash): boolean;
    /**
     * Get index size
     */
    getIndexSize(): number;
    /**
     * Get model info
     */
    getModel(): EmbeddingModel;
    /**
     * Get embedding dimensions
     */
    getDimensions(): number;
    /**
     * Serialize index state for persistence
     */
    serialize(): string;
    /**
     * Restore index from serialized state
     */
    deserialize(json: string): void;
    /**
     * Rebuild index from stored MeaningNodes
     */
    private rebuildIndex;
}
//# sourceMappingURL=MeaningDimension.d.ts.map