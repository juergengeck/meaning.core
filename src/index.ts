/**
 * meaning.core - Semantic embedding generation
 *
 * Provides:
 * - Meaning: Pure embedding generation service
 * - MeaningNode: Points in semantic space (embedding vectors)
 * - MeaningDimensionValue: Dimension value specialization for meaning
 *
 * Separation of concerns:
 * - meaning.core: Embedding generation (this package)
 * - cube.core: HNSW indexing and semantic queries (SemanticDimension)
 *
 * Meaning is a dimension like time or space - closeness in meaning space.
 */

// Export recipes
export * from './recipes/index';

// Export types
export * from './types/MeaningTypes';

// Export main API
export {Meaning} from './Meaning';

// Export legacy MeaningDimension (deprecated - use Meaning + SemanticDimension from cube.core)
export {MeaningDimension, type MeaningDimensionConfig} from './MeaningDimension';

// Export HNSW index (used by cube.core's SemanticDimension)
export {HNSWIndex, type HNSWSearchResult} from './vector-index/HNSWIndex';
