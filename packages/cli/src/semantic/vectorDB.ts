/**
 * Vector Database Manager
 * FAISS-based implementation with fallback to simplified version
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeChunk } from './index.js';

export interface VectorDBConfig {
  dataDir: string;
  indexFile: string;
  metadataFile: string;
}

export interface VectorMetadata {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  metadata: CodeChunk['metadata'];
}

// FAISS index interface
interface FAISSIndex {
  add(vectors: Float32Array): void;
  search(
    query: Float32Array,
    k: number,
  ): { distances: Float32Array; labels: Float32Array };
  ntotal(): number;
}

// FAISS module interface
interface FAISSModule {
  IndexFlatIP: new (dimension: number) => FAISSIndex;
  readIndex: (path: string) => FAISSIndex;
  writeIndex: (index: FAISSIndex, path: string) => void;
}

export class VectorDB {
  private config: VectorDBConfig;
  private faissIndex: FAISSIndex | null = null;
  private fallbackEmbeddings: number[][] = [];
  private metadata: VectorMetadata[] = [];
  private isInitialized = false;
  private useFAISS = false;

  constructor(config: VectorDBConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.promises.mkdir(this.config.dataDir, { recursive: true });

      // Try to initialize FAISS
      await this.initializeFAISS();

      // Load existing data
      await this.loadData();

      this.isInitialized = true;
      console.log(
        `Vector database initialized with ${this.useFAISS ? 'FAISS' : 'simplified'} backend`,
      );
    } catch (error) {
      console.error('Failed to initialize vector database:', error);
      throw error;
    }
  }

  private async initializeFAISS(): Promise<void> {
    try {
      // Try to import FAISS
      const faissModule = (await import('faiss-node')) as FAISSModule;
      this.faissIndex = new faissModule.IndexFlatIP(1536); // voyage-code-3 embedding dimension
      this.useFAISS = true;
      console.log('FAISS initialized successfully');
    } catch (error) {
      console.warn('FAISS not available, using simplified backend:', error);
      
      // Provide helpful error message for Windows users
      if (process.platform === 'win32') {
        console.log('💡 To enable FAISS on Windows:');
        console.log('   1. Install Visual Studio Build Tools 2019 or later');
        console.log('   2. Install Python 3.8+ and ensure it\'s in PATH');
        console.log('   3. Run: npm rebuild faiss-node');
        console.log('   4. Or use the simplified backend (current mode)');
      }
      
      this.useFAISS = false;
    }
  }

  async addEmbeddings(
    embeddings: number[][],
    chunks: CodeChunk[],
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      if (this.useFAISS && this.faissIndex) {
        await this.addToFAISS(embeddings);
      } else {
        await this.addToFallback(embeddings);
      }

      // Store metadata
      const newMetadata: VectorMetadata[] = chunks.map((chunk, _i) => ({
        id: chunk.id,
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        language: chunk.language,
        content: chunk.content,
        metadata: chunk.metadata,
      }));

      this.metadata.push(...newMetadata);

      // Save data
      await this.saveData();

      console.log(`Added ${embeddings.length} embeddings to vector database`);
    } catch (error) {
      console.error('Failed to add embeddings:', error);
      throw error;
    }
  }

  private async addToFAISS(embeddings: number[][]): Promise<void> {
    if (!this.faissIndex) return;

    // Convert embeddings to Float32Array for FAISS
    const vectors = embeddings.map((emb) => new Float32Array(emb));

    // Add to FAISS index
    const vectorsArray = new Float32Array(vectors.length * vectors[0].length);
    for (let i = 0; i < vectors.length; i++) {
      vectorsArray.set(vectors[i], i * vectors[0].length);
    }
    this.faissIndex.add(vectorsArray);
  }

  private async addToFallback(embeddings: number[][]): Promise<void> {
    // Store embeddings in memory
    this.fallbackEmbeddings.push(...embeddings);
  }

  async search(
    queryEmbedding: number[],
    k: number = 10,
  ): Promise<Array<VectorMetadata & { similarity: number }>> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      if (this.useFAISS && this.faissIndex) {
        return await this.searchFAISS(queryEmbedding, k);
      } else {
        return await this.searchFallback(queryEmbedding, k);
      }
    } catch (error) {
      console.error('Failed to search vector database:', error);
      throw error;
    }
  }

  private async searchFAISS(
    queryEmbedding: number[],
    k: number,
  ): Promise<Array<VectorMetadata & { similarity: number }>> {
    if (!this.faissIndex) return [];

    // Convert query to Float32Array
    const queryVector = new Float32Array(queryEmbedding);

    // Search FAISS index
    const result = this.faissIndex.search(queryVector, k);
    const { distances, labels } = result;

    // Build results with metadata
    const results: Array<VectorMetadata & { similarity: number }> = [];
    for (let i = 0; i < labels.length; i++) {
      const index = labels[i];
      const distance = distances[i];
      const metadata = this.metadata[index];

      if (metadata) {
        results.push({
          ...metadata,
          similarity: 1 - distance, // Convert distance to similarity
        });
      }
    }

    return results;
  }

  private async searchFallback(
    queryEmbedding: number[],
    k: number,
  ): Promise<Array<VectorMetadata & { similarity: number }>> {
    if (this.fallbackEmbeddings.length === 0) {
      return [];
    }

    // Simple cosine similarity search
    const similarities = this.fallbackEmbeddings.map((embedding) =>
      this.cosineSimilarity(queryEmbedding, embedding),
    );

    // Get top k results
    const indices = similarities
      .map((similarity, index) => ({ similarity, index }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);

    // Build results with metadata
    const results: Array<VectorMetadata & { similarity: number }> = [];
    for (const { similarity, index } of indices) {
      const metadata = this.metadata[index];
      if (metadata) {
        results.push({
          ...metadata,
          similarity,
        });
      }
    }

    return results;
  }

  async removeChunksByFile(filePath: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      // Find indices of chunks to remove
      const indicesToRemove: number[] = [];
      for (let i = 0; i < this.metadata.length; i++) {
        if (this.metadata[i].filePath === filePath) {
          indicesToRemove.push(i);
        }
      }

      if (indicesToRemove.length === 0) {
        return; // No chunks to remove
      }

      if (this.useFAISS) {
        console.warn(
          `Removing chunks for file ${filePath} requires reindexing the entire database`,
        );
        // For FAISS, we'll need to rebuild the index
        // For now, just remove from metadata
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          this.metadata.splice(indicesToRemove[i], 1);
        }
      } else {
        // Remove from metadata and embeddings (in reverse order to maintain indices)
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          const index = indicesToRemove[i];
          this.metadata.splice(index, 1);
          this.fallbackEmbeddings.splice(index, 1);
        }
      }

      // Save data
      await this.saveData();

      console.log(
        `Removed ${indicesToRemove.length} chunks for file: ${filePath}`,
      );
    } catch (error) {
      console.error('Failed to remove chunks:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalChunks: number;
    indexSize: number;
    backend: string;
  }> {
    if (!this.isInitialized) {
      return { totalChunks: 0, indexSize: 0, backend: 'none' };
    }

    return {
      totalChunks: this.metadata.length,
      indexSize:
        this.useFAISS && this.faissIndex
          ? this.faissIndex.ntotal()
          : this.fallbackEmbeddings.length,
      backend: this.useFAISS ? 'FAISS' : 'simplified',
    };
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private async loadData(): Promise<void> {
    const metadataPath = path.join(
      this.config.dataDir,
      this.config.metadataFile,
    );
    const embeddingsPath = path.join(this.config.dataDir, 'embeddings.json');
    const indexPath = path.join(this.config.dataDir, this.config.indexFile);

    try {
      // Load metadata
      if (
        await fs.promises
          .access(metadataPath)
          .then(() => true)
          .catch(() => false)
      ) {
        const metadataContent = await fs.promises.readFile(
          metadataPath,
          'utf8',
        );
        this.metadata = JSON.parse(metadataContent);
      }

      if (this.useFAISS) {
        // Load FAISS index
        if (
          await fs.promises
            .access(indexPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const faissModule = (await import('faiss-node')) as FAISSModule;
          this.faissIndex = faissModule.readIndex(indexPath);
          console.log(
            `Loaded existing FAISS index with ${this.metadata.length} chunks`,
          );
        }
      } else {
        // Load fallback embeddings
        if (
          await fs.promises
            .access(embeddingsPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const embeddingsContent = await fs.promises.readFile(
            embeddingsPath,
            'utf8',
          );
          this.fallbackEmbeddings = JSON.parse(embeddingsContent);
          console.log(
            `Loaded existing data with ${this.metadata.length} chunks`,
          );
        }
      }
    } catch (error) {
      console.warn('Failed to load existing data, starting fresh:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      const metadataPath = path.join(
        this.config.dataDir,
        this.config.metadataFile,
      );
      const embeddingsPath = path.join(this.config.dataDir, 'embeddings.json');
      const indexPath = path.join(this.config.dataDir, this.config.indexFile);

      // Save metadata
      await fs.promises.writeFile(
        metadataPath,
        JSON.stringify(this.metadata, null, 2),
      );

      if (this.useFAISS && this.faissIndex) {
        // Save FAISS index
        const faissModule = (await import('faiss-node')) as FAISSModule;
        faissModule.writeIndex(this.faissIndex, indexPath);
      } else {
        // Save fallback embeddings
        await fs.promises.writeFile(
          embeddingsPath,
          JSON.stringify(this.fallbackEmbeddings, null, 2),
        );
      }
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  }
}
