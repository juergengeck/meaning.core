/**
 * Meaning - Pure embedding generation service
 *
 * Handles semantic embedding generation using configured providers.
 * This class is responsible ONLY for embedding generation - indexing
 * and search are handled by SemanticDimension in cube.core.
 *
 * Separation of concerns:
 * - Meaning (meaning.core): Generates embeddings
 * - SemanticDimension (cube.core): HNSW indexing and similarity search
 */

import type {EmbeddingProvider} from './types/MeaningTypes.js';
import {EMBEDDING_DIMENSIONS, validateEmbedding} from './types/MeaningTypes.js';

/**
 * Meaning - Embedding generation service
 *
 * Simple service for generating embeddings from text. Provider-agnostic -
 * works with Ollama, ONNX, or any other EmbeddingProvider implementation.
 */
export class Meaning {
    private provider?: EmbeddingProvider;

    /**
     * Set the embedding provider
     *
     * @param provider - EmbeddingProvider implementation (Ollama, ONNX, etc.)
     */
    setProvider(provider: EmbeddingProvider): void {
        this.provider = provider;
    }

    /**
     * Generate embedding for text
     *
     * @param text - Text to embed
     * @returns 768-dimensional embedding vector
     * @throws Error if no provider configured
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.provider) {
            throw new Error(
                '[Meaning] No embedding provider configured. Call setProvider() first.'
            );
        }

        const embedding = await this.provider.embed(text);

        // Validate result
        validateEmbedding(embedding, EMBEDDING_DIMENSIONS);

        return embedding;
    }

    /**
     * Generate embeddings for multiple texts (batch)
     *
     * @param texts - Array of texts to embed
     * @returns Array of 768-dimensional embedding vectors
     * @throws Error if no provider configured
     */
    async embedBatch(texts: string[]): Promise<number[][]> {
        if (!this.provider) {
            throw new Error(
                '[Meaning] No embedding provider configured. Call setProvider() first.'
            );
        }

        const embeddings = await this.provider.embedBatch(texts);

        // Validate all results
        for (const embedding of embeddings) {
            validateEmbedding(embedding, EMBEDDING_DIMENSIONS);
        }

        return embeddings;
    }

    /**
     * Check if embedding generation is available
     */
    hasProvider(): boolean {
        return !!this.provider;
    }

    /**
     * Get the expected embedding dimensions (always 768 for nomic-embed-text-v1.5)
     */
    getDimensions(): number {
        return EMBEDDING_DIMENSIONS;
    }
}
