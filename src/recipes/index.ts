/**
 * Meaning Dimension Recipes
 *
 * Export all meaning.core recipes for registration with ONE.core
 */

import {MeaningNodeRecipe} from './MeaningNodeRecipe';
import {MeaningDimensionValueRecipe} from './MeaningDimensionValueRecipe';

// Re-export individual recipes
export {MeaningNodeRecipe, MeaningDimensionValueRecipe};

/**
 * All meaning.core recipes - spread this into MultiUser recipes array
 */
export const MeaningCoreRecipes = [
    MeaningNodeRecipe,
    MeaningDimensionValueRecipe
];
