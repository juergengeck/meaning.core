/**
 * MeaningDimensionValueRecipe - DimensionValue specialization for meaning
 *
 * Links an object to its position in semantic space via MeaningNode.
 * Follows the same pattern as TimeDimensionValue.
 *
 * Versioning: Unversioned (object→meaning mapping is deterministic)
 * Reverse Maps:
 *   - Dimension → MeaningDimensionValue
 *   - MeaningNode → MeaningDimensionValue
 */
export const MeaningDimensionValueRecipe = {
    $type$: 'Recipe',
    name: 'MeaningDimensionValue',
    rule: [
        {
            // Reference to "meaning" dimension
            itemprop: 'dimensionHash',
            itemtype: {
                type: 'referenceToObj',
                allowedTypes: new Set(['Dimension'])
            }
        },
        {
            // Reference to MeaningNode containing the embedding
            itemprop: 'meaningNodeHash',
            itemtype: {
                type: 'referenceToObj',
                allowedTypes: new Set(['MeaningNode'])
            }
        },
        {
            // When this embedding was created
            itemprop: 'created',
            itemtype: { type: 'number' }
        }
    ]
};
//# sourceMappingURL=MeaningDimensionValueRecipe.js.map