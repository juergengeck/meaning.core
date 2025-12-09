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
export const MeaningNodeRecipe = {
    $type$: 'Recipe',
    name: 'MeaningNode',
    rule: [
        {
            // The embedding vector - array of floats
            // This is the position in semantic space
            itemprop: 'embedding',
            itemtype: {
                type: 'array',
                item: { type: 'number' }
            }
        },
        {
            // Embedding model identifier
            // Critical for compatibility - can't compare embeddings from different models
            itemprop: 'model',
            itemtype: { type: 'string' }
        },
        {
            // Dimensionality of the embedding (redundant but useful for validation)
            itemprop: 'dimensions',
            itemtype: { type: 'number' }
        },
        {
            // Optional: original text that was embedded
            // Useful for re-embedding when model changes
            itemprop: 'sourceText',
            itemtype: { type: 'string' },
            optional: true
        },
        {
            // Optional: content type hint
            itemprop: 'contentType',
            itemtype: { type: 'string' },
            optional: true
        }
    ]
};
//# sourceMappingURL=MeaningNodeRecipe.js.map