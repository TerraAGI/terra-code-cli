/**
 * Simple Progress Tracker for Background Indexing
 * Uses file-based storage for progress persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface IndexingProgress {
  projectPath: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  startTime: number;
  endTime?: number;
  error?: string;
}

export class ProgressTracker {
  private progressFile: string;
  private progress: IndexingProgress | null = null;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    // Store progress in temp directory
    const tempDir = os.tmpdir();
    const projectHash = Buffer.from(projectPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    this.progressFile = path.join(tempDir, `terra-indexing-${projectHash}.json`);
  }

  async initialize(totalFiles: number): Promise<void> {
    this.progress = {
      projectPath: this.projectPath,
      status: 'running',
      totalFiles,
      processedFiles: 0,
      startTime: Date.now(),
    };
    await this.saveProgress();
  }

  async updateProgress(processedFiles: number, currentFile?: string): Promise<void> {
    if (!this.progress) return;
    
    this.progress.processedFiles = processedFiles;
    this.progress.currentFile = currentFile;
    await this.saveProgress();
  }

  async complete(): Promise<void> {
    if (!this.progress) return;
    
    this.progress.status = 'completed';
    this.progress.endTime = Date.now();
    await this.saveProgress();
  }

  async fail(error: string): Promise<void> {
    if (!this.progress) return;
    
    this.progress.status = 'failed';
    this.progress.error = error;
    this.progress.endTime = Date.now();
    await this.saveProgress();
  }

  async getProgress(): Promise<IndexingProgress | null> {
    try {
      if (fs.existsSync(this.progressFile)) {
        const data = await fs.promises.readFile(this.progressFile, 'utf8');
        if (data.trim() === '') {
          // Empty file, treat as no progress
          return null;
        }
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read progress file:', error);
      // If there's a parse error, clean up the corrupted file
      try {
        if (fs.existsSync(this.progressFile)) {
          await fs.promises.unlink(this.progressFile);
        }
      } catch (cleanupError) {
        console.error('Failed to clean up corrupted progress file:', cleanupError);
      }
    }
    return null;
  }

  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.progressFile)) {
        await fs.promises.unlink(this.progressFile);
      }
    } catch (error) {
      console.error('Failed to cleanup progress file:', error);
    }
  }

  private async saveProgress(): Promise<void> {
    if (!this.progress) return;
    
    try {
      await fs.promises.writeFile(
        this.progressFile,
        JSON.stringify(this.progress, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  static async getProgressForProject(projectPath: string): Promise<IndexingProgress | null> {
    const tracker = new ProgressTracker(projectPath);
    return await tracker.getProgress();
  }

  static async cleanupProgressForProject(projectPath: string): Promise<void> {
    const tracker = new ProgressTracker(projectPath);
    await tracker.cleanup();
  }
}
