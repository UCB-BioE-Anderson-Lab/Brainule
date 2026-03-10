import * as fs from 'fs';
import * as path from 'path';
import { CorpusDocument, RetrievedChunk } from '@brainule/core';
import { RetrievalInput, RetrievedContentPack } from '@brainule/core';
import { generateId } from '@brainule/shared';
import { chunkDocument } from './chunker';

export type ManifestLoader = () => Promise<{ manifest: CorpusDocument[]; corpusDir: string }>;

export class TagRetriever {
  // Map from tag (leafTopicId or topicId) → chunks
  private index = new Map<string, RetrievedChunk[]>();
  private built = false;

  constructor(private readonly loader: ManifestLoader) {}

  async buildIndex(): Promise<void> {
    if (this.built) return;
    const { manifest: corpusManifest, corpusDir } = await this.loader();
    for (const doc of corpusManifest) {
      const filePath = path.join(corpusDir, doc.contentPath);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const chunks = chunkDocument(doc, content, doc.chunkingStrategy);
      const allTags = [...doc.leafTopicTags, ...doc.topicTags];
      for (const tag of allTags) {
        const existing = this.index.get(tag) ?? [];
        this.index.set(tag, [...existing, ...chunks]);
      }
    }
    this.built = true;
  }

  async retrieve(input: RetrievalInput): Promise<RetrievedContentPack> {
    await this.buildIndex();
    const maxChunks = input.maxChunks ?? 10;
    const seen = new Set<string>();
    const scored: RetrievedChunk[] = [];

    // Score 1.0: chunks tagged with the exact leafTopicId
    for (const chunk of this.index.get(input.leafTopicId) ?? []) {
      if (!seen.has(chunk.chunkId)) {
        seen.add(chunk.chunkId);
        scored.push({ ...chunk, score: 1.0 });
      }
    }

    // Score 0.5: chunks tagged with prerequisite topics
    for (const prereqId of input.prerequisiteTopicIds ?? []) {
      for (const chunk of this.index.get(prereqId) ?? []) {
        if (!seen.has(chunk.chunkId)) {
          seen.add(chunk.chunkId);
          scored.push({ ...chunk, score: 0.5 });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);

    return {
      packId: generateId(),
      leafTopicId: input.leafTopicId,
      chunks: scored.slice(0, maxChunks),
      retrievedAt: new Date().toISOString(),
    };
  }
}
