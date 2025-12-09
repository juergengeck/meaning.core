/**
 * MeaningNodeRecipe - Node in semantic embedding space
 *
 * MeaningNode represents a point in semantic space via its embedding vector.
 * Unlike TimeNode (hierarchical tree) or LocationNode (geohash grid),
 * meaning space is indexed using approximate nearest neighbor (HNSW).
 *
 * The embedding vector is the "position" in meaning space.
 *
 * Versioning: Unversioned (embedding for content is deterministic)
 * Reverse Maps: MeaningNode → CubeObject (for objects with this meaning)
 */
import type { Recipe } from '@refinio/one.core/lib/recipes.js';
export declare const MeaningNodeRecipe: Recipe;
//# sourceMappingURL=MeaningNodeRecipe.d.ts.map