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

import type {SHA256Hash} from '@refinio/one.core/lib/util/type-checks.js';
import type {MeaningNode, HNSWConfig, DistanceMetric} from '../types/MeaningTypes.js';
import {cosineSimilarity, euclideanDistance, dotProduct, DEFAULT_HNSW_CONFIG} from '../types/MeaningTypes.js';

/**
 * Node in the HNSW graph
 */
interface HNSWNode {
    objectHash: SHA256Hash;
    meaningNodeHash: SHA256Hash<MeaningNode>;
    embedding: number[];
    connections: Map<number, Set<string>>; // level → connected node IDs
    level: number; // max level this node exists at
}

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
export class HNSWIndex {
    private nodes: Map<string, HNSWNode> = new Map();
    private entryPoint: string | null = null;
    private maxLevel = 0;
    private readonly config: HNSWConfig;
    private readonly metric: DistanceMetric;
    private readonly dimensions: number;

    constructor(
        dimensions: number,
        metric: DistanceMetric = 'cosine',
        config: Partial<HNSWConfig> = {}
    ) {
        this.dimensions = dimensions;
        this.metric = metric;
        this.config = {...DEFAULT_HNSW_CONFIG, ...config};
    }

    /**
     * Add a vector to the index
     */
    add(
        objectHash: SHA256Hash,
        meaningNodeHash: SHA256Hash<MeaningNode>,
        embedding: number[]
    ): void {
        if (embedding.length !== this.dimensions) {
            throw new Error(
                `Embedding dimension mismatch: expected ${this.dimensions}, got ${embedding.length}`
            );
        }

        const id = objectHash;

        // Already indexed?
        if (this.nodes.has(id)) {
            return;
        }

        // Determine level for this node (probabilistic)
        const level = this.randomLevel();

        const node: HNSWNode = {
            objectHash,
            meaningNodeHash,
            embedding,
            connections: new Map(),
            level
        };

        // Initialize connection sets for each level
        for (let l = 0; l <= level; l++) {
            node.connections.set(l, new Set());
        }

        this.nodes.set(id, node);

        // First node becomes entry point
        if (this.entryPoint === null) {
            this.entryPoint = id;
            this.maxLevel = level;
            return;
        }

        // Insert into graph
        let currObj = this.entryPoint;
        let currDist = this.distance(embedding, this.nodes.get(currObj)!.embedding);

        // Traverse from top level down to node's level
        for (let l = this.maxLevel; l > level; l--) {
            const changed = this.searchLayer(embedding, currObj, 1, l);
            if (changed.length > 0) {
                currObj = changed[0].id;
                currDist = changed[0].dist;
            }
        }

        // Insert at each level from node's level down to 0
        for (let l = Math.min(level, this.maxLevel); l >= 0; l--) {
            const candidates = this.searchLayer(embedding, currObj, this.config.efConstruction, l);

            // Select M best neighbors
            const neighbors = this.selectNeighbors(candidates, this.config.M);

            // Connect to neighbors
            for (const neighbor of neighbors) {
                node.connections.get(l)!.add(neighbor.id);
                this.nodes.get(neighbor.id)!.connections.get(l)!.add(id);
            }

            if (candidates.length > 0) {
                currObj = candidates[0].id;
            }
        }

        // Update entry point if new node has higher level
        if (level > this.maxLevel) {
            this.maxLevel = level;
            this.entryPoint = id;
        }
    }

    /**
     * Search for k nearest neighbors
     */
    search(query: number[], k: number, threshold?: number): HNSWSearchResult[] {
        if (this.entryPoint === null) {
            return [];
        }

        if (query.length !== this.dimensions) {
            throw new Error(
                `Query dimension mismatch: expected ${this.dimensions}, got ${query.length}`
            );
        }

        let currObj = this.entryPoint;

        // Traverse from top level down to level 1
        for (let l = this.maxLevel; l > 0; l--) {
            const changed = this.searchLayer(query, currObj, 1, l);
            if (changed.length > 0) {
                currObj = changed[0].id;
            }
        }

        // Search at level 0 with ef candidates
        const candidates = this.searchLayer(query, currObj, Math.max(k, this.config.efSearch), 0);

        // Convert to results
        const results: HNSWSearchResult[] = candidates
            .slice(0, k)
            .map(c => {
                const node = this.nodes.get(c.id)!;
                return {
                    objectHash: node.objectHash,
                    meaningNodeHash: node.meaningNodeHash,
                    similarity: this.toSimilarity(c.dist)
                };
            });

        // Apply threshold filter
        if (threshold !== undefined) {
            return results.filter(r => r.similarity >= threshold);
        }

        return results;
    }

    /**
     * Remove a vector from the index
     */
    remove(objectHash: SHA256Hash): boolean {
        const id = objectHash;
        const node = this.nodes.get(id);

        if (!node) {
            return false;
        }

        // Remove connections to this node
        for (let l = 0; l <= node.level; l++) {
            for (const neighborId of node.connections.get(l)!) {
                const neighbor = this.nodes.get(neighborId);
                if (neighbor) {
                    neighbor.connections.get(l)?.delete(id);
                }
            }
        }

        this.nodes.delete(id);

        // Update entry point if needed
        if (this.entryPoint === id) {
            if (this.nodes.size === 0) {
                this.entryPoint = null;
                this.maxLevel = 0;
            } else {
                // Find new entry point (node with highest level)
                let newEntry: string | null = null;
                let newMaxLevel = 0;

                for (const [nodeId, n] of this.nodes) {
                    if (n.level > newMaxLevel) {
                        newMaxLevel = n.level;
                        newEntry = nodeId;
                    }
                }

                this.entryPoint = newEntry;
                this.maxLevel = newMaxLevel;
            }
        }

        return true;
    }

    /**
     * Get current index size
     */
    size(): number {
        return this.nodes.size;
    }

    /**
     * Check if an object is indexed
     */
    has(objectHash: SHA256Hash): boolean {
        return this.nodes.has(objectHash);
    }

    /**
     * Get all indexed object hashes
     */
    getAllObjectHashes(): SHA256Hash[] {
        return Array.from(this.nodes.keys()) as SHA256Hash[];
    }

    /**
     * Serialize index state for persistence
     */
    serialize(): string {
        const data = {
            dimensions: this.dimensions,
            metric: this.metric,
            config: this.config,
            entryPoint: this.entryPoint,
            maxLevel: this.maxLevel,
            nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
                id,
                objectHash: node.objectHash,
                meaningNodeHash: node.meaningNodeHash,
                embedding: node.embedding,
                level: node.level,
                connections: Array.from(node.connections.entries()).map(([l, conns]) => ({
                    level: l,
                    connections: Array.from(conns)
                }))
            }))
        };

        return JSON.stringify(data);
    }

    /**
     * Restore index from serialized state
     */
    static deserialize(json: string): HNSWIndex {
        const data = JSON.parse(json);

        const index = new HNSWIndex(data.dimensions, data.metric, data.config);
        index.entryPoint = data.entryPoint;
        index.maxLevel = data.maxLevel;

        for (const nodeData of data.nodes) {
            const node: HNSWNode = {
                objectHash: nodeData.objectHash,
                meaningNodeHash: nodeData.meaningNodeHash,
                embedding: nodeData.embedding,
                level: nodeData.level,
                connections: new Map()
            };

            for (const connData of nodeData.connections) {
                node.connections.set(connData.level, new Set(connData.connections));
            }

            index.nodes.set(nodeData.id, node);
        }

        return index;
    }

    // ========================================================================
    // Private methods
    // ========================================================================

    /**
     * Search a single layer for nearest neighbors
     */
    private searchLayer(
        query: number[],
        entryId: string,
        ef: number,
        level: number
    ): Array<{id: string; dist: number}> {
        const visited = new Set<string>([entryId]);
        const candidates: Array<{id: string; dist: number}> = [{
            id: entryId,
            dist: this.distance(query, this.nodes.get(entryId)!.embedding)
        }];
        const results: Array<{id: string; dist: number}> = [...candidates];

        while (candidates.length > 0) {
            // Get closest candidate
            candidates.sort((a, b) => a.dist - b.dist);
            const closest = candidates.shift()!;

            // Get furthest result
            results.sort((a, b) => a.dist - b.dist);
            const furthest = results[results.length - 1];

            // Stop if closest candidate is further than furthest result
            if (closest.dist > furthest.dist) {
                break;
            }

            // Explore neighbors
            const node = this.nodes.get(closest.id)!;
            const connections = node.connections.get(level);

            if (connections) {
                for (const neighborId of connections) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);

                        const neighbor = this.nodes.get(neighborId);
                        if (!neighbor) continue;

                        const dist = this.distance(query, neighbor.embedding);

                        if (results.length < ef || dist < results[results.length - 1].dist) {
                            candidates.push({id: neighborId, dist});
                            results.push({id: neighborId, dist});

                            // Keep only ef best results
                            if (results.length > ef) {
                                results.sort((a, b) => a.dist - b.dist);
                                results.pop();
                            }
                        }
                    }
                }
            }
        }

        results.sort((a, b) => a.dist - b.dist);
        return results;
    }

    /**
     * Select M best neighbors using simple heuristic
     */
    private selectNeighbors(
        candidates: Array<{id: string; dist: number}>,
        M: number
    ): Array<{id: string; dist: number}> {
        return candidates.slice(0, M);
    }

    /**
     * Generate random level for new node
     */
    private randomLevel(): number {
        const mL = 1 / Math.log(this.config.M);
        let level = 0;

        while (Math.random() < Math.exp(-level / mL) && level < 16) {
            level++;
        }

        return level;
    }

    /**
     * Compute distance between two vectors
     */
    private distance(a: number[], b: number[]): number {
        switch (this.metric) {
            case 'cosine':
                // Convert similarity to distance (1 - similarity)
                return 1 - cosineSimilarity(a, b);
            case 'euclidean':
                return euclideanDistance(a, b);
            case 'dot_product':
                // Higher dot product = more similar, so negate for distance
                return -dotProduct(a, b);
            default:
                throw new Error(`Unknown metric: ${this.metric}`);
        }
    }

    /**
     * Convert distance back to similarity for results
     */
    private toSimilarity(dist: number): number {
        switch (this.metric) {
            case 'cosine':
                return 1 - dist;
            case 'euclidean':
                // Convert to similarity (inverse distance)
                return 1 / (1 + dist);
            case 'dot_product':
                return -dist;
            default:
                return 1 - dist;
        }
    }
}
