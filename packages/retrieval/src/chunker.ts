import { CorpusDocument, RetrievedChunk } from '@brainule/core';

export function chunkDocument(
  doc: CorpusDocument,
  content: string,
  strategy: string,
): RetrievedChunk[] {
  const tags = [...doc.leafTopicTags, ...doc.topicTags];
  switch (strategy) {
    case 'section':
      return chunkBySection(doc.docId, content, tags);
    case 'fixed_tokens':
      return chunkByFixedTokens(doc.docId, content, tags);
    case 'paragraph':
    default:
      return chunkByParagraph(doc.docId, content, tags);
  }
}

function makeChunk(
  docId: string,
  index: number,
  content: string,
  tags: string[],
): RetrievedChunk {
  return { chunkId: `${docId}-${index}`, docId, content, tags, score: 0 };
}

function chunkByParagraph(docId: string, content: string, tags: string[]): RetrievedChunk[] {
  return content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p, i) => makeChunk(docId, i, p, tags));
}

function chunkBySection(docId: string, content: string, tags: string[]): RetrievedChunk[] {
  const parts = content.split(/(?=^## )/m);
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p, i) => makeChunk(docId, i, p, tags));
}

function chunkByFixedTokens(docId: string, content: string, tags: string[]): RetrievedChunk[] {
  const words = content.split(/\s+/);
  const windowSize = 300;
  const overlap = 50;
  const chunks: RetrievedChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < words.length) {
    const slice = words.slice(start, start + windowSize);
    chunks.push(makeChunk(docId, index++, slice.join(' '), tags));
    start += windowSize - overlap;
  }
  return chunks;
}
