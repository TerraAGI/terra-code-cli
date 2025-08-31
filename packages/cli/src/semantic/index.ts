/**
 * Semantic Module - Lazy Loading Entry Point
 * This module provides semantic code analysis and search capabilities
 * Only loads when explicitly requested by user
 */

export interface SemanticConfig {
  enabled: boolean;
  voyageAI: {
    apiKey?: string;
    model: string;
    baseURL: string;
  };
  vectorDB: {
    dataDir: string;
    indexFile: string;
    metadataFile: string;
  };
  chunking: {
    maxChunkSize: number;
    overlapSize: number;
    supportedExtensions: string[];
  };
}

export interface CodeChunk {
  id: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  metadata: {
    functionName?: string;
    className?: string;
    complexity: number;
    dependencies: string[];
  };
}

export interface SearchResult {
  id: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  similarity: number;
  metadata: CodeChunk['metadata'];
}

// Type for the semantic engine
export interface SemanticEngine {
  initialize(config: SemanticConfig): Promise<void>;
  indexProject(projectPath: string): Promise<void>;
  search(
    query: string,
    options: Record<string, unknown>,
  ): Promise<SearchResult[]>;
  getStats(): Promise<{
    totalChunks: number;
    indexSize: number;
    backend: string;
    isInitialized: boolean;
  }>;
}

// Lazy loading implementation
let semanticEngine: SemanticEngine | null = null;
let isInitialized = false;
let semanticConfig: SemanticConfig | null = null;

export async function getSemanticEngine(): Promise<SemanticEngine> {
  if (!semanticEngine && !isInitialized) {
    try {
      const { SemanticEngine } = await import('./engine.js');
      semanticEngine = new SemanticEngine();
      isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to load semantic engine: ${error}`);
    }
  }
  if (!semanticEngine) {
    throw new Error('Semantic engine failed to initialize');
  }
  return semanticEngine;
}

export function isSemanticAvailable(): boolean {
  // Check if semantic is enabled in config, even if not yet initialized
  return semanticConfig?.enabled === true;
}

export async function initializeSemantic(
  config: SemanticConfig,
): Promise<void> {
  semanticConfig = config;
  if (!config.enabled) {
    return;
  }

  const engine = await getSemanticEngine();
  await engine.initialize(config);
}

export async function searchSemantic(
  query: string,
  options: Record<string, unknown> = {},
): Promise<SearchResult[]> {
  const engine = await getSemanticEngine();
  return engine.search(query, options);
}

export async function getSemanticStats(): Promise<{
  totalChunks: number;
  indexSize: number;
  backend: string;
  isInitialized: boolean;
}> {
  try {
    const engine = await getSemanticEngine();
    return engine.getStats();
  } catch (_error) {
    return { totalChunks: 0, indexSize: 0, backend: 'error', isInitialized: false };
  }
}

export async function indexProject(projectPath: string): Promise<void> {
  const engine = await getSemanticEngine();
  return engine.indexProject(projectPath);
}
