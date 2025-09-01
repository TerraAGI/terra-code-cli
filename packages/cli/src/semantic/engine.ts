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
  private indexedProjects: Map<string, VectorDB> = new Map();

  async initialize(config: SemanticConfig): Promise<void> {
    this.config = config;

    if (config.enabled && config.voyageAI.apiKey) {
      // Initialize components
      this.preprocessor = new CodePreprocessor();
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

    // Check if already indexed
    const resolvedConfig = {
      ...this.config.vectorDB,
      dataDir: path.resolve(projectPath, this.config.vectorDB.dataDir),
    };
    
    // Check if we already have a vector DB instance for this project
    if (this.indexedProjects.has(projectPath)) {
      console.log(`Project already indexed: ${projectPath}`);
      return;
    }

    const projectVectorDB = new VectorDB(resolvedConfig);
    await projectVectorDB.initialize();
    
    if (await projectVectorDB.isIndexed(resolvedConfig.dataDir)) {
      console.log(`Project already indexed: ${projectPath}`);
      // Store the existing instance
      this.indexedProjects.set(projectPath, projectVectorDB);
      return;
    }

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
            await projectVectorDB.addEmbeddings(embeddings, chunks);

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
      
      // Store the instance for future use
      this.indexedProjects.set(projectPath, projectVectorDB);
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
      // Always use current working directory for search
      const currentProjectPath = process.cwd();
      console.log(`Searching in current directory: ${currentProjectPath}`);
      console.log(`Current indexedProjects cache size: ${this.indexedProjects.size}`);
      console.log(`Cached projects: ${Array.from(this.indexedProjects.keys()).join(', ')}`);

      // Check if we already have a vector DB instance for this project
      let searchVectorDB = this.indexedProjects.get(currentProjectPath);

      if (!searchVectorDB) {
        // Check if the directory is already indexed on disk
        const resolvedConfig = {
          ...this.config.vectorDB,
          dataDir: path.resolve(currentProjectPath, this.config.vectorDB.dataDir),
        };
        const tempVectorDB = new VectorDB(resolvedConfig);
        await tempVectorDB.initialize();
        
        if (await tempVectorDB.isIndexed(resolvedConfig.dataDir)) {
          console.log('Current directory already indexed on disk, loading existing data...');
          // Use the existing indexed data
          searchVectorDB = tempVectorDB;
          this.indexedProjects.set(currentProjectPath, searchVectorDB);
        } else {
          console.log('Current directory not indexed, indexing now...');
          // Auto-index the current directory
          await this.indexProject(currentProjectPath);
          searchVectorDB = this.indexedProjects.get(currentProjectPath);
          
          if (!searchVectorDB) {
            throw new Error('Failed to create vector database for current directory');
          }
          console.log(`Successfully indexed and cached project: ${currentProjectPath}`);
        }
      } else {
        console.log('Using existing cached index for current directory');
      }

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

      console.log(`Searching vector database in: ${currentProjectPath}`);
      const results = await searchVectorDB.search(queryEmbedding, 10);

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
    uniqueFiles: number;
    languages: Record<string, number>;
    duplicates: number;
    lastIndexed: Date | null;
  }> {
    if (!this.isInitialized) {
      return { 
        totalChunks: 0, 
        indexSize: 0, 
        backend: 'none', 
        isInitialized: false,
        uniqueFiles: 0,
        languages: {},
        duplicates: 0,
        lastIndexed: null
      };
    }

    if (!this.vectorDB) {
      return { 
        totalChunks: 0, 
        indexSize: 0, 
        backend: 'none', 
        isInitialized: true,
        uniqueFiles: 0,
        languages: {},
        duplicates: 0,
        lastIndexed: null
      };
    }

    try {
      const stats = await this.vectorDB.getStats();
      const detailedStats = this.vectorDB.getIndexStats();
      
      return {
        ...stats,
        isInitialized: true,
        uniqueFiles: detailedStats.uniqueFiles,
        languages: detailedStats.languages,
        duplicates: detailedStats.duplicates,
        lastIndexed: detailedStats.lastIndexed
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { 
        totalChunks: 0, 
        indexSize: 0, 
        backend: 'unknown', 
        isInitialized: true,
        uniqueFiles: 0,
        languages: {},
        duplicates: 0,
        lastIndexed: null
      };
    }
  }
}
