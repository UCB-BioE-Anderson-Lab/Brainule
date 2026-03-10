export interface RetrievedChunk {
  chunkId: string;
  docId: string;
  content: string;
  tags: string[];
  score: number;
}

export interface RetrievedContentPack {
  packId: string;
  leafTopicId: string;
  chunks: RetrievedChunk[];
  retrievedAt: string;
}

export interface RetrievalInput {
  leafTopicId: string;
  prerequisiteTopicIds?: string[];
  allowedKnowledgeTags?: string[];
  maxChunks?: number;
  lessonMode?: string;
}
