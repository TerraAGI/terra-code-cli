/**
 * Semantic Engine - Core Implementation
 * Handles code analysis, embedding generation, and vector search
 */

import * as path from 'path';
import { SemanticConfig, SearchResult } from './index.js';
import { CodePreprocessor } from './preprocessor.js';
import { VoyageAIClient } from './embedding.js';
import { VectorDB } from './vectorDB.js';

export class SemanticEngine {
  private config: SemanticConfig | null = null;
  private isInitialized = false;
  private preprocessor: CodePreprocessor | null = null;
  private embeddingClient: VoyageAIClient | null = null;
  private vectorDB: VectorDB | null = null;

  async initialize(config: SemanticConfig): Promise<void> {
    this.config = config;

    if (config.enabled && config.voyageAI.apiKey) {
      // Initialize components
      this.preprocessor = new CodePreprocessor(
        config.chunking.supportedExtensions,
      );
      this.embeddingClient = new VoyageAIClient(config.voyageAI);
      // Resolve relative path to current working directory
      const resolvedConfig = {
        ...config.vectorDB,
        dataDir: path.resolve(process.cwd(), config.vectorDB.dataDir),
      };
      this.vectorDB = new VectorDB(resolvedConfig);

      // Initialize vector database
      await this.vectorDB.initialize();
    }

    this.isInitialized = true;
  }

  async indexProject(projectPath: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Semantic engine not initialized');
    }

    if (
      !this.config?.enabled ||
      !this.preprocessor ||
      !this.embeddingClient ||
      !this.vectorDB
    ) {
      throw new Error(
        'Semantic analysis is not enabled or not properly configured',
      );
    }

    // Re-initialize vectorDB with the correct project path
    const resolvedConfig = {
      ...this.config.vectorDB,
      dataDir: path.resolve(projectPath, this.config.vectorDB.dataDir),
    };
    this.vectorDB = new VectorDB(resolvedConfig);
    await this.vectorDB.initialize();

    try {
      console.log(`Discovering files in project: ${projectPath}`);
      const files = await this.preprocessor.discoverFiles(projectPath);
      console.log(`Found ${files.length} files to process`);

      let totalChunks = 0;

      for (const file of files) {
        try {
          console.log(`Processing file: ${file}`);
          const chunks = await this.preprocessor.processFile(
            file,
            this.config.chunking.maxChunkSize,
            this.config.chunking.overlapSize,
          );

          if (chunks.length > 0) {
            console.log(`Generating embeddings for ${chunks.length} chunks`);
            const embeddings =
              await this.embeddingClient.createBatchEmbeddings(chunks);

            console.log(`Storing embeddings in vector database`);
            await this.vectorDB.addEmbeddings(embeddings, chunks);

            totalChunks += chunks.length;
          }
        } catch (error) {
          console.error(`Failed to process file ${file}:`, error);
          // Continue with other files
        }
      }

      console.log(
        `Successfully indexed ${totalChunks} chunks from ${files.length} files`,
      );
    } catch (error) {
      console.error('Failed to index project:', error);
      throw error;
    }
  }

  async search(
    query: string,
    _options: Record<string, unknown> = {},
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Semantic engine not initialized');
    }

    if (!this.config?.enabled || !this.embeddingClient || !this.vectorDB) {
      throw new Error(
        'Semantic analysis is not enabled or not properly configured',
      );
    }

    try {
      console.log(`Creating embedding for query: "${query}"`);
      // Create a mock chunk for the query
      const queryChunk = {
        id: 'query',
        content: query,
        filePath: '',
        startLine: 0,
        endLine: 0,
        language: 'query',
        metadata: {
          functionName: undefined,
          className: undefined,
          complexity: 1,
          dependencies: [],
        },
      };

      const queryEmbedding =
        await this.embeddingClient.createEmbedding(queryChunk);

      console.log(`Searching vector database`);
      const results = await this.vectorDB.search(queryEmbedding, 10);

      // Convert to SearchResult format
      return results.map((result) => ({
        id: result.id,
        content: result.content,
        filePath: result.filePath,
        startLine: result.startLine,
        endLine: result.endLine,
        similarity: result.similarity,
        metadata: result.metadata,
      }));
    } catch (error) {
      console.error('Failed to perform semantic search:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalChunks: number;
    indexSize: number;
    backend: string;
    isInitialized: boolean;
  }> {
    if (!this.isInitialized) {
      return { totalChunks: 0, indexSize: 0, backend: 'none', isInitialized: false };
    }

    if (!this.vectorDB) {
      return { totalChunks: 0, indexSize: 0, backend: 'none', isInitialized: true };
    }

    try {
      const stats = await this.vectorDB.getStats();
      return {
        ...stats,
        isInitialized: true,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { totalChunks: 0, indexSize: 0, backend: 'unknown', isInitialized: true };
    }
  }
}
