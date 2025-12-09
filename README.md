# meaning.core

Semantic similarity as a first-class dimension for the Cube datacube system.

## Concept

Meaning is a dimension like time or space. Just as objects can be "close in time" (happened recently) or "close in space" (nearby location), they can be "close in meaning" (semantically similar).

```
┌─────────────────────────────────────────────────────────────────┐
│                        DIMENSIONS                               │
├────────────────┬────────────────┬────────────────┬──────────────┤
│     TIME       │    SPACE       │     WHO        │   MEANING    │
│   (temporal)   │   (spatial)    │   (identity)   │  (semantic)  │
├────────────────┼────────────────┼────────────────┼──────────────┤
│ Unix timestamp │ lat/lng        │ PersonIdHash   │ float[n]     │
│ Range queries  │ Proximity      │ Equals         │ Similarity   │
│ Sparse tree    │ Geohash        │ Reverse map    │ HNSW graph   │
└────────────────┴────────────────┴────────────────┴──────────────┘
```

All dimensions follow the same pattern:
- **Value**: A point in that dimension's space
- **Distance**: How to measure closeness
- **Index**: Structure for efficient lookup

## Installation

```bash
# In your project
npm install @cube/meaning.core

# Or with workspace reference
"dependencies": {
  "@cube/meaning.core": "file:../packages/meaning.core"
}
```

## Quick Start

### Basic Usage

```typescript
import { MeaningDimension } from '@cube/meaning.core';

// Create dimension with embedding model
const meaning = new MeaningDimension({
    model: 'text-embedding-3-small'
});

await meaning.init();

// Index an object with a pre-computed embedding
const embedding = [0.1, 0.2, ...]; // 1536 dimensions for text-embedding-3-small
await meaning.indexEmbedding(objectHash, embedding, 'optional source text');

// Query for similar objects
const results = await meaning.query({
    embedding: queryEmbedding,
    k: 10,           // return top 10
    threshold: 0.7   // minimum similarity
});

// Results are object hashes, sorted by similarity
for (const hash of results) {
    console.log(hash);
}
```

### With Embedding Provider

For automatic text-to-embedding conversion, provide an `EmbeddingProvider`:

```typescript
import { MeaningDimension, EmbeddingProvider } from '@cube/meaning.core';

// Implement provider (e.g., using OpenAI)
const provider: EmbeddingProvider = {
    model: 'text-embedding-3-small',

    async embed(text: string): Promise<number[]> {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text
        });
        return response.data[0].embedding;
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: texts
        });
        return response.data.map(d => d.embedding);
    }
};

// Create dimension with provider
const meaning = new MeaningDimension({
    model: 'text-embedding-3-small',
    embeddingProvider: provider
});

await meaning.init();

// Now you can index and query by text directly
await meaning.indexText(objectHash, 'The quick brown fox jumps over the lazy dog');

const results = await meaning.queryByText('fast fox jumping', 10, 0.7);
```

### Integration with Cube

```typescript
import { CubeStorage } from '@cube/cube.core';
import { TimeDimension } from '@cube/time.core';
import { MeaningDimension } from '@cube/meaning.core';

const cube = new CubeStorage({
    dimensions: {
        when: new TimeDimension(),
        meaning: new MeaningDimension({
            model: 'text-embedding-3-small',
            embeddingProvider: provider
        })
    }
});

await cube.init();

// Store object with multiple dimensions
await cube.store(messageHash, {
    when: Date.now(),
    meaning: messageText  // Will be embedded automatically
});

// Multi-dimensional query: recent AND semantically similar
const results = await cube.query({
    when: {
        operator: 'range',
        start: Date.now() - 7 * 24 * 60 * 60 * 1000, // last week
        end: Date.now()
    },
    meaning: {
        operator: 'proximity',
        center: queryEmbedding,
        k: 20,
        threshold: 0.6
    }
});
```

## Architecture

### Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│  MeaningDimension (in-memory)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  HNSW Index                                              │   │
│  │  - Approximate nearest neighbor search                   │   │
│  │  - O(log n) query complexity                            │   │
│  │  - Rebuilt from ONE.core on init()                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ points to
┌────────────────────────▼────────────────────────────────────────┐
│  ONE.core (persistent storage)                                  │
│                                                                 │
│  MeaningNode                    MeaningDimensionValue           │
│  ┌─────────────────────┐       ┌─────────────────────────┐     │
│  │ embedding: number[] │◄──────│ meaningNodeHash         │     │
│  │ model: string       │       │ dimensionHash           │     │
│  │ dimensions: number  │       │ created: number         │     │
│  │ sourceText?: string │       └───────────┬─────────────┘     │
│  └─────────────────────┘                   │                    │
│                                            │ referenced by      │
│                               ┌────────────▼─────────────┐     │
│                               │ CubeObject               │     │
│                               │ - oneObjectHash          │     │
│                               │ - dimensionValues[]      │     │
│                               └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Strategy

**Embeddings are stored in ONE.core**, not in an external vector database:

1. **Single source of truth**: All data in one place
2. **Content-addressed**: Same embedding = same hash (deduplication)
3. **CHUM sync**: Embeddings sync between peers like any other data
4. **Persistence**: Survives restarts, rebuilt from storage

The HNSW index is **in-memory** for fast queries, rebuilt from stored MeaningNodes on `init()`.

### Why Not External Vector DB?

| Approach | Pros | Cons |
|----------|------|------|
| External (Pinecone, Weaviate) | Optimized, scalable | Data duplication, sync complexity |
| **ONE.core + in-memory index** | Single source of truth, syncs naturally | Memory usage, rebuild time |

For most use cases (< 1M embeddings), the in-memory approach works well. The rebuild on startup takes ~10ms per 1000 embeddings.

## API Reference

### MeaningDimension

Main class for semantic dimension operations.

#### Constructor

```typescript
new MeaningDimension(config: MeaningDimensionConfig)
```

**Config options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `model` | `EmbeddingModel` | Yes | Embedding model identifier |
| `customDimensions` | `number` | If model='custom' | Vector dimensions for custom model |
| `metric` | `DistanceMetric` | No | 'cosine' (default), 'euclidean', 'dot_product' |
| `hnswConfig` | `Partial<HNSWConfig>` | No | HNSW index tuning |
| `embeddingProvider` | `EmbeddingProvider` | No | For automatic text embedding |

#### Methods

**Initialization:**

```typescript
await meaning.init(): Promise<void>
```

Registers recipes, creates dimension object, rebuilds index from storage.

**Indexing:**

```typescript
// Index with pre-computed embedding
await meaning.indexEmbedding(
    objectHash: SHA256Hash,
    embedding: number[],
    sourceText?: string
): Promise<SHA256Hash<MeaningDimensionValue>>

// Index with text (requires embeddingProvider)
await meaning.indexText(
    objectHash: SHA256Hash,
    text: string
): Promise<SHA256Hash<MeaningDimensionValue>>
```

**Querying:**

```typescript
// Query by embedding, returns object hashes
await meaning.query(criterion: MeaningCriterion): Promise<SHA256Hash[]>

// Query with similarity scores
await meaning.queryWithScores(criterion: MeaningCriterion): Promise<MeaningQueryResult[]>

// Query by text (requires embeddingProvider)
await meaning.queryByText(
    text: string,
    k: number,
    threshold?: number
): Promise<MeaningQueryResult[]>
```

**MeaningCriterion:**

```typescript
interface MeaningCriterion {
    embedding: number[];    // Query vector
    k: number;              // Number of results
    threshold?: number;     // Minimum similarity (0-1 for cosine)
    metric?: DistanceMetric;
}
```

**MeaningQueryResult:**

```typescript
interface MeaningQueryResult {
    objectHash: SHA256Hash;
    meaningNodeHash: SHA256Hash<MeaningNode>;
    similarity: number;  // 0-1 for cosine, higher = more similar
}
```

**Utilities:**

```typescript
meaning.isIndexed(objectHash): boolean
meaning.getIndexSize(): number
meaning.getModel(): EmbeddingModel
meaning.getDimensions(): number

// Persistence
meaning.serialize(): string
meaning.deserialize(json: string): void
```

### Supported Embedding Models

| Model | Provider | Dimensions | Max Tokens |
|-------|----------|------------|------------|
| `text-embedding-3-small` | OpenAI | 1536 | 8191 |
| `text-embedding-3-large` | OpenAI | 3072 | 8191 |
| `text-embedding-ada-002` | OpenAI | 1536 | 8191 |
| `all-MiniLM-L6-v2` | HuggingFace | 384 | 512 |
| `all-mpnet-base-v2` | HuggingFace | 768 | 512 |
| `bge-small-en-v1.5` | BAAI | 384 | 512 |
| `bge-base-en-v1.5` | BAAI | 768 | 512 |
| `bge-large-en-v1.5` | BAAI | 1024 | 512 |
| `nomic-embed-text-v1.5` | Nomic | 768 | 8192 |
| `custom` | User | Configurable | - |

### Distance Metrics

```typescript
type DistanceMetric = 'cosine' | 'euclidean' | 'dot_product';
```

- **cosine** (default): Angle between vectors, normalized. Best for text.
- **euclidean**: Straight-line distance. Good for dense embeddings.
- **dot_product**: Raw dot product. Fastest, requires normalized vectors.

### HNSW Configuration

```typescript
interface HNSWConfig {
    M: number;              // Max connections per node (default: 16)
    efConstruction: number; // Build-time candidate list (default: 200)
    efSearch: number;       // Query-time candidate list (default: 50)
}
```

**Tuning:**

| Goal | M | efConstruction | efSearch |
|------|---|----------------|----------|
| Speed | 8-12 | 100 | 20-40 |
| Balanced | 16 | 200 | 50 |
| Accuracy | 24-32 | 400 | 100-200 |

Higher values = better recall, more memory, slower queries.

## Integration Examples

### With LlamaIndex

```typescript
import { Document, VectorStoreIndex, OpenAIEmbedding } from 'llamaindex';
import { MeaningDimension, EmbeddingProvider } from '@cube/meaning.core';

// Use LlamaIndex for embeddings
const llamaEmbed = new OpenAIEmbedding({ model: 'text-embedding-3-small' });

const provider: EmbeddingProvider = {
    model: 'text-embedding-3-small',
    async embed(text: string) {
        return llamaEmbed.getTextEmbedding(text);
    },
    async embedBatch(texts: string[]) {
        return Promise.all(texts.map(t => this.embed(t)));
    }
};

const meaning = new MeaningDimension({
    model: 'text-embedding-3-small',
    embeddingProvider: provider
});
```

### With Local Models (Transformers.js)

```typescript
import { pipeline } from '@xenova/transformers';

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const provider: EmbeddingProvider = {
    model: 'all-MiniLM-L6-v2',
    async embed(text: string) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    },
    async embedBatch(texts: string[]) {
        return Promise.all(texts.map(t => this.embed(t)));
    }
};

const meaning = new MeaningDimension({
    model: 'all-MiniLM-L6-v2',
    embeddingProvider: provider
});
```

### Batch Indexing

```typescript
// Index many objects efficiently
const objects = [
    { hash: hash1, text: 'First document...' },
    { hash: hash2, text: 'Second document...' },
    // ...
];

// Batch embed
const texts = objects.map(o => o.text);
const embeddings = await provider.embedBatch(texts);

// Index each
for (let i = 0; i < objects.length; i++) {
    await meaning.indexEmbedding(objects[i].hash, embeddings[i], objects[i].text);
}
```

### Persistence

```typescript
// Save index state
const state = meaning.serialize();
await saveToFile('meaning-index.json', state);

// Restore on next startup (faster than rebuilding)
const meaning = new MeaningDimension({ model: 'text-embedding-3-small' });
const state = await loadFromFile('meaning-index.json');
meaning.deserialize(state);
await meaning.init(); // Still needed for recipes, but skips index rebuild
```

Or use `DimensionStateManager` from cube.core for automatic persistence.

## Performance

### Memory Usage

| Embeddings | Dimensions | Index Size |
|------------|------------|------------|
| 10,000 | 1536 | ~60 MB |
| 100,000 | 1536 | ~600 MB |
| 1,000,000 | 1536 | ~6 GB |

Formula: `embeddings × dimensions × 4 bytes + graph overhead (~100 bytes/node)`

### Query Latency

| Index Size | efSearch=50 | efSearch=100 |
|------------|-------------|--------------|
| 10,000 | < 1ms | < 2ms |
| 100,000 | < 5ms | < 10ms |
| 1,000,000 | < 20ms | < 50ms |

### Index Rebuild Time

| Embeddings | Time |
|------------|------|
| 10,000 | ~100ms |
| 100,000 | ~1s |
| 1,000,000 | ~10s |

## Model Compatibility

Embeddings from different models **cannot be compared**. The dimension enforces this:

```typescript
// This will throw an error
const meaning1 = new MeaningDimension({ model: 'text-embedding-3-small' });
await meaning1.indexEmbedding(hash, embeddingFromAda002); // Wrong model!

// Error: Embedding dimension mismatch: expected 1536, got 1536
// (dimensions match but model differs - caught during rebuild)
```

To change models, you must re-embed all content:

```typescript
// Re-embedding workflow
const oldMeaning = new MeaningDimension({ model: 'text-embedding-ada-002' });
const newMeaning = new MeaningDimension({
    model: 'text-embedding-3-small',
    embeddingProvider: newProvider
});

// For each object, get source text and re-index
for (const node of oldMeaningNodes) {
    if (node.sourceText) {
        await newMeaning.indexText(objectHash, node.sourceText);
    }
}
```

This is why storing `sourceText` is recommended.

## Comparison with Vector Databases

| Feature | meaning.core | Pinecone | Weaviate |
|---------|--------------|----------|----------|
| Storage | ONE.core (local) | Cloud | Self-hosted/Cloud |
| Sync | CHUM (P2P) | API | API |
| Scale | ~1M vectors | Billions | Millions |
| Latency | < 20ms | ~50-100ms | ~20-50ms |
| Cost | Free | $$$ | $ (self-hosted) |
| Integration | Native Cube | External | External |

**Use meaning.core when:**
- Data should stay local / P2P sync
- < 1M embeddings
- Already using ONE.core / Cube
- Simplicity over scale

**Use external vector DB when:**
- Billions of vectors
- Global scale required
- Specialized vector operations needed

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Test
npm test

# Clean
npm run clean
```

## Related Packages

- **cube.core** - Main datacube orchestration
- **time.core** - Temporal dimension (when)
- **space.core** - Spatial dimension (where)
- **someone.core** - Identity dimension (who)

## License

MIT
