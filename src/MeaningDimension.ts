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

import type {SHA256Hash} from '@refinio/one.core/lib/util/type-checks.js';
import {storeUnversionedObject, getObject} from '@refinio/one.core/lib/storage-unversioned-objects.js';
import {getAllEntries} from '@refinio/one.core/lib/reverse-map-query.js';

import type {
    MeaningNode,
    MeaningDimensionValue,
    MeaningCriterion,
    MeaningQueryResult,
    EmbeddingProvider,
    DistanceMetric,
    HNSWConfig
} from './types/MeaningTypes';
import {
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    validateEmbedding,
    DEFAULT_HNSW_CONFIG
} from './types/MeaningTypes';
import {HNSWIndex} from './vector-index/HNSWIndex';

/**
 * Configuration for MeaningDimension
 *
 * All dimensions use the standard embedding model (nomic-embed-text-v1.5, 768 dims).
 */
export interface MeaningDimensionConfig {
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
 * Uses the standard embedding model (nomic-embed-text-v1.5, 768 dimensions).
 */
export class MeaningDimension {
    private dimensionHash?: SHA256Hash;
    private initialized = false;
    private index: HNSWIndex;
    private readonly metric: DistanceMetric;
    private readonly embeddingProvider?: EmbeddingProvider;

    constructor(config: MeaningDimensionConfig = {}) {
        this.metric = config.metric ?? 'cosine';
        this.embeddingProvider = config.embeddingProvider;

        // Initialize HNSW index with standard dimensions (768)
        this.index = new HNSWIndex(
            EMBEDDING_DIMENSIONS,
            this.metric,
            config.hnswConfig ?? DEFAULT_HNSW_CONFIG
        );
    }

    /**
     * Initialize the dimension (register recipes, rebuild index)
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        // Recipes are registered at startup via CoreInstanceInitializationPlan

        // Create the "meaning" Dimension object
        const dimension = {
            $type$: 'Dimension',
            name: 'meaning',
            dataType: 'object' as const,
            standard: true,
            shared: true,
            packageName: 'meaning.core'
        };

        const result = await storeUnversionedObject(dimension);
        this.dimensionHash = result.hash;

        // Rebuild index from stored MeaningNodes
        await this.rebuildIndex();

        this.initialized = true;
    }

    /**
     * Get the dimension hash
     */
    async getDimensionHash(): Promise<SHA256Hash> {
        if (!this.initialized) {
            throw new Error('MeaningDimension not initialized. Call init() first.');
        }
        return this.dimensionHash!;
    }

    /**
     * Index an object with an embedding
     *
     * @param objectHash - Hash of the object to index
     * @param embedding - The embedding vector (must be 768 dimensions)
     * @param sourceText - Optional source text
     */
    async indexEmbedding(
        objectHash: SHA256Hash,
        embedding: number[],
        sourceText?: string
    ): Promise<SHA256Hash<MeaningDimensionValue>> {
        if (!this.initialized) {
            throw new Error('MeaningDimension not initialized. Call init() first.');
        }

        // Validate embedding (must be 768 dimensions)
        validateEmbedding(embedding, EMBEDDING_DIMENSIONS);

        // Create MeaningNode
        const meaningNode: MeaningNode = {
            $type$: 'MeaningNode',
            embedding,
            model: EMBEDDING_MODEL,
            dimensions: EMBEDDING_DIMENSIONS,
            sourceText,
            contentType: 'text'
        };

        const nodeResult = await storeUnversionedObject(meaningNode);
        const meaningNodeHash = nodeResult.hash as SHA256Hash<MeaningNode>;

        // Create MeaningDimensionValue
        const dimValue: MeaningDimensionValue = {
            $type$: 'MeaningDimensionValue',
            dimensionHash: this.dimensionHash!,
            meaningNodeHash,
            created: Date.now()
        };

        const dimValueResult = await storeUnversionedObject(dimValue);

        // Add to in-memory index
        this.index.add(objectHash, meaningNodeHash, embedding);

        return dimValueResult.hash as SHA256Hash<MeaningDimensionValue>;
    }

    /**
     * Index an object with text (requires embeddingProvider)
     *
     * @param objectHash - Hash of the object to index
     * @param text - Text to embed
     */
    async indexText(
        objectHash: SHA256Hash,
        text: string
    ): Promise<SHA256Hash<MeaningDimensionValue>> {
        if (!this.embeddingProvider) {
            throw new Error(
                'No embeddingProvider configured. Use indexEmbedding() with pre-computed embedding, ' +
                'or provide an embeddingProvider in constructor.'
            );
        }

        const embedding = await this.embeddingProvider.embed(text);
        return this.indexEmbedding(objectHash, embedding, text);
    }

    /**
     * Query objects by semantic similarity
     *
     * @param criterion - Query criterion with embedding, k, threshold
     */
    async query(criterion: MeaningCriterion): Promise<SHA256Hash[]> {
        if (!this.initialized) {
            throw new Error('MeaningDimension not initialized. Call init() first.');
        }

        validateEmbedding(criterion.embedding, EMBEDDING_DIMENSIONS);

        const results = this.index.search(
            criterion.embedding,
            criterion.k,
            criterion.threshold
        );

        return results.map(r => r.objectHash);
    }

    /**
     * Query with full results including similarity scores
     */
    async queryWithScores(criterion: MeaningCriterion): Promise<MeaningQueryResult[]> {
        if (!this.initialized) {
            throw new Error('MeaningDimension not initialized. Call init() first.');
        }

        validateEmbedding(criterion.embedding, EMBEDDING_DIMENSIONS);

        return this.index.search(
            criterion.embedding,
            criterion.k,
            criterion.threshold
        );
    }

    /**
     * Query by text (requires embeddingProvider)
     */
    async queryByText(
        text: string,
        k: number,
        threshold?: number
    ): Promise<MeaningQueryResult[]> {
        if (!this.embeddingProvider) {
            throw new Error(
                'No embeddingProvider configured. Use query() with pre-computed embedding, ' +
                'or provide an embeddingProvider in constructor.'
            );
        }

        const embedding = await this.embeddingProvider.embed(text);
        return this.queryWithScores({embedding, k, threshold});
    }

    /**
     * Get dimension value hash for an embedding
     */
    async getValueHash(embedding: number[]): Promise<SHA256Hash<MeaningDimensionValue>> {
        if (!this.initialized) {
            throw new Error('MeaningDimension not initialized. Call init() first.');
        }

        validateEmbedding(embedding, EMBEDDING_DIMENSIONS);

        // Create MeaningNode (content-addressed, so same embedding = same hash)
        const meaningNode: MeaningNode = {
            $type$: 'MeaningNode',
            embedding,
            model: EMBEDDING_MODEL,
            dimensions: EMBEDDING_DIMENSIONS
        };

        const nodeResult = await storeUnversionedObject(meaningNode);
        const meaningNodeHash = nodeResult.hash as SHA256Hash<MeaningNode>;

        const dimValue: MeaningDimensionValue = {
            $type$: 'MeaningDimensionValue',
            dimensionHash: this.dimensionHash!,
            meaningNodeHash,
            created: Date.now()
        };

        const result = await storeUnversionedObject(dimValue);
        return result.hash as SHA256Hash<MeaningDimensionValue>;
    }

    /**
     * Generate embedding for text without indexing.
     * Returns the raw embedding vector for external storage.
     *
     * @param text - Text to embed
     * @returns 768-dimensional embedding vector
     * @throws Error if no embeddingProvider configured
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.embeddingProvider) {
            throw new Error(
                'No embeddingProvider configured. Cannot generate embeddings.'
            );
        }
        return this.embeddingProvider.embed(text);
    }

    /**
     * Check if embedding generation is available
     */
    hasEmbeddingProvider(): boolean {
        return !!this.embeddingProvider;
    }

    /**
     * Check if an object is already indexed
     */
    isIndexed(objectHash: SHA256Hash): boolean {
        return this.index.has(objectHash);
    }

    /**
     * Get index size
     */
    getIndexSize(): number {
        return this.index.size();
    }

    /**
     * Get embedding dimensions (always 768 for nomic-embed-text-v1.5)
     */
    getDimensions(): number {
        return EMBEDDING_DIMENSIONS;
    }

    /**
     * Serialize index state for persistence
     */
    serialize(): string {
        return this.index.serialize();
    }

    /**
     * Restore index from serialized state
     */
    deserialize(json: string): void {
        this.index = HNSWIndex.deserialize(json);
    }

    // ========================================================================
    // Private methods
    // ========================================================================

    /**
     * Rebuild index from stored MeaningNodes
     */
    private async rebuildIndex(): Promise<void> {
        try {
            // Get all MeaningDimensionValues for this dimension
            const dimValues = await getAllEntries(
                this.dimensionHash!,
                'MeaningDimensionValue'
            );

            for (const dimValueHash of dimValues) {
                try {
                    const dimValue = await getObject(dimValueHash) as MeaningDimensionValue;
                    if (!dimValue) continue;

                    const meaningNode = await getObject(dimValue.meaningNodeHash) as MeaningNode;
                    if (!meaningNode) continue;

                    // Validate embedding dimensions
                    if (meaningNode.embedding.length !== EMBEDDING_DIMENSIONS) {
                        console.warn(
                            `Skipping MeaningNode with invalid dimensions: ${meaningNode.embedding.length} (expected ${EMBEDDING_DIMENSIONS})`
                        );
                        continue;
                    }

                    // Get CubeObjects that reference this dimension value via reverse map
                    const cubeObjects = await getAllEntries(dimValueHash, 'CubeObject');

                    for (const cubeObjectHash of cubeObjects) {
                        this.index.add(
                            cubeObjectHash,
                            dimValue.meaningNodeHash,
                            meaningNode.embedding
                        );
                    }
                } catch (err) {
                    // Skip entries that can't be loaded
                    continue;
                }
            }
        } catch (err) {
            // No entries yet, empty index is fine
        }
    }
}
