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
  private silent: boolean = false;
  // Removed: private indexedProjects: Map<string, VectorDB> = new Map();
  
  // NEW: Simple path-based cache (only one project at a time)
  private lastIndexedPath: string | null = null;
  private lastVectorDB: VectorDB | null = null;

  async initialize(config: SemanticConfig, silent: boolean = false): Promise<void> {
    this.config = config;
    this.silent = silent;

    if (config.enabled && config.voyageAI.apiKey) {
      // Initialize components
      this.preprocessor = new CodePreprocessor();
      this.embeddingClient = new VoyageAIClient(config.voyageAI);
      // Resolve relative path to current working directory
      const resolvedConfig = {
        ...config.vectorDB,
        dataDir: path.resolve(process.cwd(), config.vectorDB.dataDir),
        silent: this.silent,
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
    
    // Removed: Check if we already have a vector DB instance for this project
    // if (this.indexedProjects.has(projectPath)) {
    //   console.log(`Project already indexed: ${projectPath}`);
    //   return;
    // }

    const projectVectorDB = new VectorDB(resolvedConfig);
    await projectVectorDB.initialize();
    
    if (await projectVectorDB.isIndexed(resolvedConfig.dataDir)) {
      if (!this.silent) {
        console.log(`Project already indexed: ${projectPath}, skipping indexing`);
      }
      // Removed: Store the existing instance
      // this.indexedProjects.set(projectPath, projectVectorDB);
      return;
    }

    try {
      if (!this.silent) {
        console.log(`Discovering files in project: ${projectPath}`);
      }
      const files = await this.preprocessor.discoverFiles(projectPath);
      if (!this.silent) {
        console.log(`Found ${files.length} files to process`);
      }

      let totalChunks = 0;

      for (const file of files) {
        try {
          if (!this.silent) {
            console.log(`Processing file: ${file}`);
          }
          const chunks = await this.preprocessor.processFile(
            file,
            this.config.chunking.maxChunkSize,
            this.config.chunking.overlapSize,
          );

          if (chunks.length > 0) {
            if (!this.silent) {
              console.log(`Generating embeddings for ${chunks.length} chunks`);
            }
            const embeddings =
              await this.embeddingClient.createBatchEmbeddings(chunks);

            if (!this.silent) {
              console.log(`Storing embeddings in vector database`);
            }
            await projectVectorDB.addEmbeddings(embeddings, chunks);

            totalChunks += chunks.length;
          }
        } catch (error) {
          console.error(`Failed to process file ${file}:`, error);
          // Continue with other files
        }
      }

      if (!this.silent) {
        console.log(
          `Successfully indexed ${totalChunks} chunks from ${files.length} files`,
        );
      }
      
      // Removed: Store the instance for future use
      // this.indexedProjects.set(projectPath, projectVectorDB);
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

      // SMART CACHE: Check if we have the current project cached
      let searchVectorDB: VectorDB;
      
      if (this.lastIndexedPath === currentProjectPath && this.lastVectorDB) {
        console.log('Using cached vector database for current directory');
        searchVectorDB = this.lastVectorDB;
      } else {
        // Cache miss: Load from disk and potentially index
        console.log('Cache miss, loading vector database from disk...');
        const resolvedConfig = {
          ...this.config.vectorDB,
          dataDir: path.resolve(currentProjectPath, this.config.vectorDB.dataDir),
        };
        
        searchVectorDB = new VectorDB(resolvedConfig);
        await searchVectorDB.initialize();
        
        if (await searchVectorDB.isIndexed(resolvedConfig.dataDir)) {
          console.log('Current directory already indexed on disk, loading existing data...');
        } else {
          console.log('Current directory not indexed, indexing now...');
          await this.indexProject(currentProjectPath);
          await searchVectorDB.initialize(); // Reload after indexing
        }
        
        // Update cache with current project
        this.lastIndexedPath = currentProjectPath;
        this.lastVectorDB = searchVectorDB;
        console.log(`Cached vector database for: ${currentProjectPath}`);
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
