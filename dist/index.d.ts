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
export * from './recipes/index.js';
export * from './types/MeaningTypes.js';
export { MeaningDimension, type MeaningDimensionConfig } from './MeaningDimension.js';
export * from './vector-index/index.js';
//# sourceMappingURL=index.d.ts.map