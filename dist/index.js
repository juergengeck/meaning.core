/**
 * meaning.core - Semantic dimension for embedding-based similarity
 *
 * Provides:
 * - MeaningNode: Points in semantic space (embedding vectors)
 * - MeaningDimension: Query and index by semantic similarity
 * - MeaningDimensionValue: Dimension value specialization for meaning
 *
 * Meaning is a dimension like time or space - closeness in meaning space.
 */
// Export recipes
export * from './recipes/index.js';
// Export types
export * from './types/MeaningTypes.js';
// Export main API
export { MeaningDimension } from './MeaningDimension.js';
// Export vector index
export * from './vector-index/index.js';
//# sourceMappingURL=index.js.map