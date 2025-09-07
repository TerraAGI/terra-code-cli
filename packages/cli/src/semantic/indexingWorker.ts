/**
 * Background Worker for Semantic Indexing
 * Runs indexing in a separate process to avoid blocking the main UI
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import * as url from 'url';
import { SemanticEngine } from './engine.js';
import { ProgressTracker } from './progressTracker.js';
import { SemanticConfig } from './index.js';

export interface IndexingWorkerData {
  projectPath: string;
  config: SemanticConfig;
}

export interface IndexingWorkerMessage {
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
      // Initialize semantic engine
      await this.engine.initialize(this.config);

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
    // We need to modify the engine to support progress callbacks
    // For now, we'll simulate progress by processing files in batches
    const batchSize = 10; // Process 10 files at a time
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      // Process batch (simplified - in real implementation, we'd need to modify the engine)
      for (const file of batch) {
        // Simulate file processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await this.progressTracker.updateProgress(i + batch.indexOf(file) + 1, file);
        
        this.sendMessage('progress', {
          totalFiles: files.length,
          processedFiles: i + batch.indexOf(file) + 1,
          currentFile: file,
          status: 'running'
        });
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

// Main thread functions
export class BackgroundIndexer {
  private worker: Worker | null = null;
  private projectPath: string;
  private config: SemanticConfig;

  constructor(config: SemanticConfig, projectPath: string) {
    this.config = config;
    this.projectPath = projectPath;
  }

  async startIndexing(): Promise<void> {
    if (this.worker) {
      throw new Error('Indexing is already in progress');
    }

    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const workerPath = path.join(__dirname, 'indexingWorkerEntry.js');
    this.worker = new Worker(workerPath, {
      workerData: {
        projectPath: this.projectPath,
        config: this.config
      }
    });

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      this.worker.on('message', (message: IndexingWorkerMessage) => {
        if (message.type === 'complete') {
          this.worker?.terminate();
          this.worker = null;
          resolve();
        } else if (message.type === 'error') {
          this.worker?.terminate();
          this.worker = null;
          reject(new Error((message.data as { error?: string })?.error || 'Unknown error'));
        }
      });

      this.worker.on('error', (error) => {
        this.worker?.terminate();
        this.worker = null;
        reject(error);
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          this.worker = null;
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  async stopIndexing(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  isIndexing(): boolean {
    return this.worker !== null;
  }
}
