/**
 * Meaning Dimension Recipes
 *
 * Export all meaning.core recipes for registration with ONE.core
 */
import { MeaningNodeRecipe } from './MeaningNodeRecipe.js';
import { MeaningDimensionValueRecipe } from './MeaningDimensionValueRecipe.js';
// Re-export individual recipes
export { MeaningNodeRecipe, MeaningDimensionValueRecipe };
/**
 * All meaning.core recipes - spread this into MultiUser recipes array
 */
export const MeaningCoreRecipes = [
    MeaningNodeRecipe,
    MeaningDimensionValueRecipe
];
//# sourceMappingURL=index.js.map