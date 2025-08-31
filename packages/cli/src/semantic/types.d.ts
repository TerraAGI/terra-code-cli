declare module 'faiss-node' {
  export interface FAISSIndex {
    add(vectors: Float32Array): void;
    search(
      query: Float32Array,
      k: number,
    ): { distances: Float32Array; labels: Float32Array };
    ntotal(): number;
  }

  export class IndexFlatIP {
    constructor(dimension: number);
    add(vectors: Float32Array): void;
    search(
      query: Float32Array,
      k: number,
    ): { distances: Float32Array; labels: Float32Array };
    ntotal(): number;
  }

  export function readIndex(path: string): FAISSIndex;
  export function writeIndex(index: FAISSIndex, path: string): void;
}
