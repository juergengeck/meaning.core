/**
 * HNSWIndex - Hierarchical Navigable Small World graph for ANN search
 *
 * This is the in-memory index structure for efficient similarity search.
 * Built from MeaningNodes stored in ONE.core on init().
 *
 * HNSW provides O(log n) approximate nearest neighbor search.
 *
 * Note: This is a simplified implementation. For production, consider using
 * hnswlib-node or a similar optimized library.
 */
import type { SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { MeaningNode, HNSWConfig, DistanceMetric } from '../types/MeaningTypes.js';
/**
 * Search result from HNSW
 */
export interface HNSWSearchResult {
    objectHash: SHA256Hash;
    meaningNodeHash: SHA256Hash<MeaningNode>;
    similarity: number;
}
/**
 * HNSW Index for approximate nearest neighbor search
 */
export declare class HNSWIndex {
    private nodes;
    private entryPoint;
    private maxLevel;
    private readonly config;
    private readonly metric;
    private readonly dimensions;
    constructor(dimensions: number, metric?: DistanceMetric, config?: Partial<HNSWConfig>);
    /**
     * Add a vector to the index
     */
    add(objectHash: SHA256Hash, meaningNodeHash: SHA256Hash<MeaningNode>, embedding: number[]): void;
    /**
     * Search for k nearest neighbors
     */
    search(query: number[], k: number, threshold?: number): HNSWSearchResult[];
    /**
     * Remove a vector from the index
     */
    remove(objectHash: SHA256Hash): boolean;
    /**
     * Get current index size
     */
    size(): number;
    /**
     * Check if an object is indexed
     */
    has(objectHash: SHA256Hash): boolean;
    /**
     * Get all indexed object hashes
     */
    getAllObjectHashes(): SHA256Hash[];
    /**
     * Serialize index state for persistence
     */
    serialize(): string;
    /**
     * Restore index from serialized state
     */
    static deserialize(json: string): HNSWIndex;
    /**
     * Search a single layer for nearest neighbors
     */
    private searchLayer;
    /**
     * Select M best neighbors using simple heuristic
     */
    private selectNeighbors;
    /**
     * Generate random level for new node
     */
    private randomLevel;
    /**
     * Compute distance between two vectors
     */
    private distance;
    /**
     * Convert distance back to similarity for results
     */
    private toSimilarity;
}
//# sourceMappingURL=HNSWIndex.d.ts.map