# M4 — Corpus Retrieval

**Goal:** Implement the `CorpusRetrievalAgent` that loads approved corpus documents from disk,
chunks them, and returns topic-relevant content packs for lesson generation. The initial
version uses deterministic tag-based retrieval (no vector embeddings needed yet).

**Depends on:** M1 (course schemas, `CorpusDocument`, `LeafTopic`), M0

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/retrieval.ts`)
- [ ] `RetrievedChunk` interface:
  - `chunkId: string`
  - `docId: string`
  - `content: string`
  - `tags: string[]` (inherited from parent document)
  - `score: number` (0–1, relevance score)
- [ ] `RetrievedContentPack` interface:
  - `packId: string`
  - `leafTopicId: string`
  - `chunks: RetrievedChunk[]`
  - `retrievedAt: string`

### Corpus chunking (`packages/retrieval/src/chunker.ts`)
- [ ] `chunkDocument(doc: CorpusDocument, content: string, strategy: string): RetrievedChunk[]`
- [ ] Strategy `"paragraph"`: split on double newlines, filter empty strings, assign chunkIds as `${docId}-${index}`
- [ ] Strategy `"section"`: split on `## ` markdown headings
- [ ] Strategy `"fixed_tokens"`: split into ~300-word windows with 50-word overlap
- [ ] Default to `"paragraph"` if strategy is unknown
- [ ] Each chunk inherits all tags from its parent `CorpusDocument`

### Tag-based retriever (`packages/retrieval/src/tagRetriever.ts`)
- [ ] `TagRetriever` class:
  - Constructor: `(corpusManifest: CorpusDocument[], corpusDir: string)`
  - `buildIndex(): Promise<void>` — reads all document files, chunks them, indexes by `leafTopicTag` and `topicTag`
  - `retrieve(input: RetrievalInput): Promise<RetrievedContentPack>`
- [ ] `RetrievalInput` interface:
  - `leafTopicId: string`
  - `prerequisiteTopicIds?: string[]`
  - `allowedKnowledgeTags?: string[]`
  - `maxChunks?: number` (default: 10)
  - `lessonMode?: string` (future use)
- [ ] Retrieval scoring: chunks whose tags include the exact `leafTopicId` score 1.0; chunks whose tags include prerequisite topics score 0.5; others excluded
- [ ] Sort chunks by score descending, return top `maxChunks`

### CorpusRetrievalAgent (`packages/core/src/agents/corpusRetrievalAgent.ts`)
- [ ] `CorpusRetrievalAgent` class:
  - Constructor: `(retriever: TagRetriever)`
  - `retrieve(leafTopic: LeafTopic, prerequisiteTopics: string[], maxChunks?: number): Promise<RetrievedContentPack>`
- [ ] Passes `leafTopic.allowedKnowledgeTags` as filter if present
- [ ] Returns empty pack (not error) if no matching chunks found

### RetrievalRepository interface (`packages/storage/src/index.ts`)
- [ ] `RetrievalRepository` interface: `retrieve(input: RetrievalInput): Promise<RetrievedContentPack>`
- [ ] `FileSystemRetrievalRepository` in `packages/storage/src/memory/retrieval.ts` — wraps `TagRetriever`

### Fixture corpus content (`/course/corpus/`)
- [ ] At least 3 markdown corpus files covering BioE 134/234 content
- [ ] Each file tagged with appropriate `leafTopicTags` in `corpus-manifest.yaml`
- [ ] At least one file with multiple sections (to test section-level chunking)

### Wire into server
- [ ] Server initializes `TagRetriever` on startup (reads corpus once)
- [ ] `GET /corpus/:leafTopicId` — returns retrieved content pack for dev inspection

---

## Behavioral Acceptance Checklist

- [ ] `GET /corpus/python_data_types` returns a content pack with at least 1 chunk whose `tags` include `"python_data_types"`
- [ ] A chunk from a prerequisite topic is included with `score: 0.5`, lower than leaf-topic chunks
- [ ] Setting `maxChunks: 2` returns at most 2 chunks
- [ ] Requesting corpus for a leaf topic with no tagged documents returns an empty `chunks: []` array (not an error)
- [ ] A corpus document tagged with two leaf topics appears in retrieval for both
- [ ] `"paragraph"` chunking splits a multi-paragraph markdown file into individual paragraph chunks
- [ ] `"section"` chunking splits at `## ` headings, keeping the heading text in the chunk
- [ ] Each chunk has a unique `chunkId` within a document
- [ ] `buildIndex()` is called once at startup; subsequent `retrieve()` calls do not re-read disk
- [ ] No chunk from a document whose `leafTopicTags` exclude the requested topic appears in results
- [ ] TypeScript: `RetrievedContentPack` and `RetrievedChunk` are fully typed
