# CLAUDE.md

This file provides guidance to Claude Code when working with meaning.core.

## Overview

**meaning.core** is the semantic dimension package for the Cube multidimensional datacube system. It provides embedding-based similarity search as a first-class dimension alongside time (when), space (where), and identity (who).

Meaning is a dimension like time or space - "closeness in meaning space."

## Architecture

### Dimension Parallel

| Dimension | Package | Value Type | Index Structure | Query Type |
|-----------|---------|------------|-----------------|------------|
| when | time.core | timestamp | Sparse temporal tree | Range |
| where | space.core | coordinates | Geohash hierarchy | Proximity |
| who | someone.core | person hash | Reverse maps | Equals |
| **meaning** | **meaning.core** | **embedding** | **HNSW graph** | **Similarity** |

### Core Entities

**MeaningNode** - Point in semantic space:
```typescript
interface MeaningNode {
    $type$: 'MeaningNode';
    embedding: number[];        // Position in meaning space
    model: EmbeddingModel;      // e.g., 'text-embedding-3-small'
    dimensions: number;         // e.g., 1536
    sourceText?: string;        // Optional: for re-embedding
}
```

**MeaningDimensionValue** - Links object to meaning:
```typescript
interface MeaningDimensionValue {
    $type$: 'MeaningDimensionValue';
    dimensionHash: SHA256Hash;              // "meaning" dimension
    meaningNodeHash: SHA256Hash<MeaningNode>;
    created: number;
}
```

### Storage Flow

```
1. Text/Object arrives
2. Generate embedding (via EmbeddingProvider)
3. Store MeaningNode in ONE.core
4. Create MeaningDimensionValue linking to MeaningNode
5. Add to in-memory HNSW index
```

### Query Flow

```
1. Query text → embedding (via provider)
2. HNSW index → approximate nearest neighbors
3. Return object hashes with similarity scores
4. Combine with other dimensions (time, space, who)
```

## Directory Structure

```
meaning.core/
├── packages/              # Build-time only (symlinks)
│   ├── one.core/          # @refinio/one.core
│   └── one.models/        # @refinio/one.models
├── src/
│   ├── types/
│   │   └── MeaningTypes.ts    # Type definitions
│   ├── recipes/
│   │   ├── MeaningNodeRecipe.ts
│   │   ├── MeaningDimensionValueRecipe.ts
│   │   └── index.ts
│   ├── vector-index/
│   │   ├── HNSWIndex.ts       # ANN search implementation
│   │   └── index.ts
│   ├── MeaningDimension.ts    # Main API
│   └── index.ts               # Public exports
├── package.json
└── tsconfig.json
```

## Usage

### Basic Usage

```typescript
import { MeaningDimension } from '@cube/meaning.core';

// Create dimension with model
const meaning = new MeaningDimension({
    model: 'text-embedding-3-small'
});

await meaning.init();

// Index with pre-computed embedding
await meaning.indexEmbedding(objectHash, embedding, 'source text');

// Query by embedding
const results = await meaning.query({
    embedding: queryEmbedding,
    k: 10,
    threshold: 0.7
});
```

### With Embedding Provider

```typescript
import { MeaningDimension, EmbeddingProvider } from '@cube/meaning.core';

// Custom provider (e.g., OpenAI)
const provider: EmbeddingProvider = {
    model: 'text-embedding-3-small',
    async embed(text: string): Promise<number[]> {
        // Call OpenAI API
        return embedding;
    },
    async embedBatch(texts: string[]): Promise<number[][]> {
        // Batch call
        return embeddings;
    }
};

const meaning = new MeaningDimension({
    model: 'text-embedding-3-small',
    embeddingProvider: provider
});

await meaning.init();

// Index by text
await meaning.indexText(objectHash, 'some text content');

// Query by text
const results = await meaning.queryByText('similar content', 10, 0.7);
```

### Combined Queries with Cube

```typescript
import { CubeStorage } from '@cube/cube.core';
import { TimeDimension } from '@cube/time.core';
import { MeaningDimension } from '@cube/meaning.core';

const cube = new CubeStorage({
    dimensions: {
        when: new TimeDimension(),
        meaning: new MeaningDimension({ model: 'text-embedding-3-small' })
    }
});

await cube.init();

// Multi-dimensional query
const results = await cube.query({
    when: { operator: 'range', start: lastWeek, end: now },
    meaning: {
        operator: 'proximity',  // Same pattern as space!
        center: queryEmbedding,
        k: 10,
        threshold: 0.7
    }
});
```

## Key Design Decisions

### Embeddings Stored in ONE.core

Unlike typical vector databases, embeddings are stored in ONE.core:
- Single source of truth
- Syncs via CHUM like everything else
- Content-addressed (same embedding = same hash)

### In-Memory HNSW Index

The HNSW index is rebuilt from ONE.core on init():
- Fast approximate nearest neighbor search
- O(log n) query complexity
- Serializable for persistence

### Model Compatibility

Embeddings from different models cannot be compared:
- Model stored with each MeaningNode
- Validation on query
- Clear error messages

## Embedding Providers

meaning.core is agnostic to embedding source. Implement `EmbeddingProvider`:

```typescript
interface EmbeddingProvider {
    readonly model: EmbeddingModel;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
```

Options:
- **OpenAI**: text-embedding-3-small/large
- **HuggingFace**: all-MiniLM-L6-v2, bge-*, etc.
- **Local**: LlamaIndex with local models
- **Custom**: Any embedding source

## Performance

### Index Rebuild

On init(), all MeaningNodes are loaded and indexed:
- O(n log n) for n embeddings
- ~10ms per 1000 embeddings
- Consider lazy loading for very large sets

### Query Performance

HNSW provides approximate nearest neighbor:
- O(log n) average case
- Configurable recall/speed tradeoff via efSearch
- Exact results with high efSearch values

### Memory

HNSW index memory usage:
- ~4KB per embedding (1536 dims, float32)
- Plus graph structure (~100 bytes per node)
- 100K embeddings ≈ 400MB

## Integration with LlamaIndex

LlamaIndex can provide embeddings:

```typescript
import { OpenAIEmbedding } from 'llamaindex';

const llamaEmbedding = new OpenAIEmbedding({
    model: 'text-embedding-3-small'
});

const provider: EmbeddingProvider = {
    model: 'text-embedding-3-small',
    async embed(text: string): Promise<number[]> {
        return llamaEmbedding.getTextEmbedding(text);
    },
    async embedBatch(texts: string[]): Promise<number[][]> {
        return Promise.all(texts.map(t => this.embed(t)));
    }
};
```

## Building

```bash
# Create symlinks to one.core/one.models
cd packages
ln -s ../../one.core one.core
ln -s ../../one.models one.models

# Build
npm install
npm run build
```

## Related Documentation

- `../cube.core/CLAUDE.md` - Main cube orchestration
- `../time.core/CLAUDE.md` - Time dimension pattern
- `../space.core/CLAUDE.md` - Space dimension pattern
- `../../specs/001-cube/data-model.md` - Complete data model
