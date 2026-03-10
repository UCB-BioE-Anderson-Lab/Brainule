import { RetrievalInput, RetrievedContentPack } from '@brainule/core';
import { TagRetriever } from './tagRetriever';

export interface RetrievalRepository {
  retrieve(input: RetrievalInput): Promise<RetrievedContentPack>;
}

export class TagRetrieverRepository implements RetrievalRepository {
  constructor(private readonly retriever: TagRetriever) {}

  retrieve(input: RetrievalInput): Promise<RetrievedContentPack> {
    return this.retriever.retrieve(input);
  }
}
