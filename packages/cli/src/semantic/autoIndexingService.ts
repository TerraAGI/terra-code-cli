/**
 * Auto-Indexing Service
 * Detects when Terra starts in a working directory and prompts for indexing
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SemanticConfig } from './index.js';
import { BackgroundIndexer } from './indexingWorker.js';
import { ProgressTracker } from './progressTracker.js';

export interface AutoIndexingSettings {
  enabled: boolean;
  promptOnStartup: boolean;
  indexedPaths: string[];
}

export class AutoIndexingService {
  private settingsFile: string;
  private settings: AutoIndexingSettings;

  constructor() {
    const homeDir = os.homedir();
    this.settingsFile = path.join(homeDir, '.terra', 'auto-indexing.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): AutoIndexingSettings {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load auto-indexing settings:', error);
    }

    return {
      enabled: true,
      promptOnStartup: true,
      indexedPaths: []
    };
  }

  private saveSettings(): void {
    try {
      const dir = path.dirname(this.settingsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error('Failed to save auto-indexing settings:', error);
    }
  }

  async shouldPromptForIndexing(projectPath: string): Promise<boolean> {
    if (!this.settings.enabled || !this.settings.promptOnStartup) {
      return false;
    }

    // Check if there's already a completed index (not just remembered path)
    const progress = await ProgressTracker.getProgressForProject(projectPath);
    if (progress && progress.status === 'completed') {
      // Double-check that the actual index files exist
      const hasActualIndex = await this.hasActualIndexFiles(projectPath);
      if (hasActualIndex) {
        return false;
      }
    }

    // Check if there are code files in the directory
    const hasCodeFiles = await this.hasCodeFiles(projectPath);
    if (!hasCodeFiles) {
      return false;
    }

    return true;
  }

  private async hasCodeFiles(projectPath: string): Promise<boolean> {
    try {
      const { CodePreprocessor } = await import('./preprocessor.js');
      const preprocessor = new CodePreprocessor();
      const files = await preprocessor.discoverFiles(projectPath);
      return files.length > 0;
    } catch (_error) {
      return false;
    }
  }

  private async hasActualIndexFiles(projectPath: string): Promise<boolean> {
    try {
      // Check for the semantic index directory and files
      const semanticDir = path.join(projectPath, '.terra-code', 'semantic');
      const indexFile = path.join(semanticDir, 'index.faiss');
      const metadataFile = path.join(semanticDir, 'metadata.json');
      
      // Check if both files exist
      const indexExists = fs.existsSync(indexFile);
      const metadataExists = fs.existsSync(metadataFile);
      
      return indexExists && metadataExists;
    } catch (error) {
      console.error('Error checking index files:', error);
      return false;
    }
  }

  markAsIndexed(projectPath: string): void {
    if (!this.settings.indexedPaths.includes(projectPath)) {
      this.settings.indexedPaths.push(projectPath);
      this.saveSettings();
    }
  }

  async startBackgroundIndexing(
    projectPath: string,
    config: SemanticConfig
  ): Promise<BackgroundIndexer> {
    // Clear any existing progress file to ensure fresh start
    await ProgressTracker.cleanupProgressForProject(projectPath);
    
    const indexer = new BackgroundIndexer(config, projectPath);
    // Start indexing in background without waiting for completion
    indexer.startIndexing().catch(error => {
      console.error('Background indexing failed:', error);
    });
    this.markAsIndexed(projectPath);
    return indexer;
  }

  disablePromptOnStartup(): void {
    this.settings.promptOnStartup = false;
    this.saveSettings();
  }

  enablePromptOnStartup(): void {
    this.settings.promptOnStartup = true;
    this.saveSettings();
  }

  getSettings(): AutoIndexingSettings {
    return { ...this.settings };
  }
}
