import { LeafTopic, RetrievedContentPack, RetrievalInput } from '../types/index';

export interface Retriever {
  retrieve(input: RetrievalInput): Promise<RetrievedContentPack>;
}

export class CorpusRetrievalAgent {
  constructor(private readonly retriever: Retriever) {}

  async retrieve(
    leafTopic: LeafTopic,
    prerequisiteTopicIds: string[] = [],
    maxChunks = 10,
  ): Promise<RetrievedContentPack> {
    const input: RetrievalInput = {
      leafTopicId: leafTopic.leafTopicId,
      prerequisiteTopicIds,
      allowedKnowledgeTags: leafTopic.allowedKnowledgeTags,
      maxChunks,
    };
    return this.retriever.retrieve(input);
  }
}
