/**
 * Indexing Worker Entry Point
 * This file is executed in a worker thread for background indexing
 */

import { isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import { SemanticEngine } from './engine.js';
import { ProgressTracker } from './progressTracker.js';
import { SemanticConfig } from './index.js';
import { VectorDB } from './vectorDB.js';
import { VoyageAIClient } from './embedding.js';

interface IndexingWorkerData {
  projectPath: string;
  config: SemanticConfig;
}

interface IndexingWorkerMessage {
  type: 'progress' | 'complete' | 'error';
  data?: Record<string, unknown>;
}

class IndexingWorker {
  private engine: SemanticEngine;
  private progressTracker: ProgressTracker;
  private config: SemanticConfig;
  private projectPath: string;

  constructor(config: SemanticConfig, projectPath: string) {
    this.config = config;
    this.projectPath = projectPath;
    this.engine = new SemanticEngine();
    this.progressTracker = new ProgressTracker(projectPath);
  }

  async start(): Promise<void> {
    try {
      // Initialize semantic engine in silent mode
      await this.engine.initialize(this.config, true);

      // Get file count for progress tracking
      const { CodePreprocessor } = await import('./preprocessor.js');
      const preprocessor = new CodePreprocessor();
      const files = await preprocessor.discoverFiles(this.projectPath);
      
      await this.progressTracker.initialize(files.length);

      // Send initial progress
      this.sendMessage('progress', {
        totalFiles: files.length,
        processedFiles: 0,
        status: 'running'
      });

      // Start indexing with progress callbacks
      await this.indexWithProgress(files);

      // Complete
      await this.progressTracker.complete();
      this.sendMessage('complete', {
        totalFiles: files.length,
        processedFiles: files.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.progressTracker.fail(errorMessage);
      this.sendMessage('error', { error: errorMessage });
    }
  }

  private async indexWithProgress(files: string[]): Promise<void> {
    // Create VectorDB once for all files
    const { VectorDB } = await import('./vectorDB.js');
    const resolvedConfig = {
      ...this.config.vectorDB,
      dataDir: path.resolve(this.projectPath, this.config.vectorDB.dataDir),
      silent: true, // Enable silent mode for background indexing
    };
    const vectorDB = new VectorDB(resolvedConfig);
    await vectorDB.initialize();

    // Create embedding client once for all files
    const { VoyageAIClient } = await import('./embedding.js');
    const embeddingClient = new VoyageAIClient(this.config.voyageAI);

    // Process files in batches for better performance
    const batchSize = 10; // Process 10 files at a time for better throughput
    let processedCount = 0;

    for (let i = 0; i < files.length; i += batchSize) {
      const fileBatch = files.slice(i, Math.min(i + batchSize, files.length));
      
      // Collect all chunks from this batch of files
      const allChunks: any[] = [];
      const fileChunkMap = new Map<string, any[]>(); // Track which chunks belong to which file
      
      for (const file of fileBatch) {
        try {
          const { CodePreprocessor } = await import('./preprocessor.js');
          const preprocessor = new CodePreprocessor();
          const chunks = await preprocessor.processFile(
            file,
            this.config.chunking.maxChunkSize,
            this.config.chunking.overlapSize,
          );
          
          if (chunks.length > 0) {
            allChunks.push(...chunks);
            fileChunkMap.set(file, chunks);
          }
          
          processedCount++;
          await this.progressTracker.updateProgress(processedCount, file);
          
          this.sendMessage('progress', {
            totalFiles: files.length,
            processedFiles: processedCount,
            currentFile: file,
            status: 'running'
          });
          
        } catch (error) {
          console.error(`Failed to process file ${file}:`, error);
          processedCount++;
          await this.progressTracker.updateProgress(processedCount, file);
          
          this.sendMessage('progress', {
            totalFiles: files.length,
            processedFiles: processedCount,
            currentFile: file,
            status: 'running'
          });
        }
      }
      
      // Generate embeddings for all chunks in this batch at once
      if (allChunks.length > 0) {
        try {
          const embeddings = await embeddingClient.createBatchEmbeddings(allChunks);
          
          // Store all embeddings at once
          await vectorDB.addEmbeddings(embeddings, allChunks);
        } catch (error) {
          console.error('Failed to process batch embeddings:', error);
        }
      }
    }
  }

  private sendMessage(type: IndexingWorkerMessage['type'], data?: Record<string, unknown>): void {
    if (parentPort) {
      parentPort.postMessage({ type, data });
    }
  }
}

// Worker thread execution
if (!isMainThread && parentPort) {
  const { projectPath, config }: IndexingWorkerData = workerData;
  
  const worker = new IndexingWorker(config, projectPath);
  worker.start().catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  });
}
