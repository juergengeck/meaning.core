/**
 * Ambient type declarations for meaning.core ONE objects
 *
 * These extend ONE.core's type unions so getAllEntries, getObject, etc.
 * can properly type-check MeaningNode and MeaningDimensionValue.
 */

import type {SHA256Hash} from '@refinio/one.core/lib/util/type-checks.js';

// ################ Object Interfaces ################

declare module '@refinio/one.core/lib/recipes.js' {
    interface OneUnversionedObjectInterfaces {
        MeaningNode: MeaningNode;
        MeaningDimensionValue: MeaningDimensionValue;
    }
}

// ################ Type Definitions ################

/**
 * MeaningNode - Point in semantic embedding space
 */
export interface MeaningNode {
    $type$: 'MeaningNode';
    embedding: number[];
    model: string;
    dimensions: number;
    sourceText?: string;
    contentType?: string;
}

/**
 * MeaningDimensionValue - Links object to meaning space via MeaningNode
 */
export interface MeaningDimensionValue {
    $type$: 'MeaningDimensionValue';
    dimensionHash: SHA256Hash;
    meaningNodeHash: SHA256Hash<MeaningNode>;
    created: number;
}
