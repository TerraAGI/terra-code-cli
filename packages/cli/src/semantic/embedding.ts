/**
 * VoyageAI Embedding Client
 * Handles embedding generation for code chunks
 */

import { CodeChunk } from './index.js';

export interface VoyageAIConfig {
  apiKey?: string;
  model: string;
  baseURL: string;
}

export interface EmbeddingRequest {
  input: string | string[];
  model: string;
}

export interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

export class VoyageAIClient {
  private config: VoyageAIConfig;
  private cache: Map<string, number[]> = new Map();

  constructor(config: VoyageAIConfig) {
    this.config = config;
  }

  async createEmbedding(chunk: CodeChunk): Promise<number[]> {
    const cacheKey = this.generateCacheKey(chunk);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Create enriched text for better embeddings
    const enrichedText = this.createEnrichedText(chunk);

    try {
      const embedding = await this.makeRequest({
        input: enrichedText,
        model: this.config.model,
      });

      // Cache the result
      this.cache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error('Failed to create embedding:', error);
      // Return a fallback embedding (zeros) if API fails
      return new Array(1024).fill(0);
    }
  }

  async createBatchEmbeddings(chunks: CodeChunk[]): Promise<number[][]> {
    if (chunks.length === 0) {
      return [];
    }

    // Process in small batches to avoid rate limits
    const batchSize = 5;
    const embeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

      try {
        // For batch processing, send all texts in one request
        const texts = batch.map((chunk) => this.createEnrichedText(chunk));
        const batchEmbeddings = await this.makeBatchRequest({
          input: texts,
          model: this.config.model,
        });

        embeddings.push(...batchEmbeddings);
      } catch (error) {
        console.error('Failed to create batch embeddings:', error);
        // Fallback: process each chunk individually
        for (const chunk of batch) {
          const embedding = await this.createEmbedding(chunk);
          embeddings.push(embedding);
        }
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return embeddings;
  }

  private createEnrichedText(chunk: CodeChunk): string {
    const { content, metadata, language } = chunk;

    return `
=== CODE CHUNK ===
Language: ${language}
Function: ${metadata.functionName || 'N/A'}
Class: ${metadata.className || 'N/A'}
Complexity: ${metadata.complexity}
Dependencies: ${metadata.dependencies.join(', ')}

=== CODE ===
${content}

=== CONTEXT ===
File: ${chunk.filePath}
Lines: ${chunk.startLine}-${chunk.endLine}
`.trim();
  }

  private generateCacheKey(chunk: CodeChunk): string {
    // Simple hash based on content and metadata
    const content =
      chunk.content + chunk.filePath + chunk.startLine + chunk.endLine;
    return Buffer.from(content).toString('base64').slice(0, 32);
  }

  private async makeRequest(request: EmbeddingRequest): Promise<number[]> {
    if (!this.config.apiKey) {
      throw new Error('VoyageAI API key not configured');
    }

    const response = await fetch(`${this.config.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `VoyageAI API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data: EmbeddingResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embedding data received from VoyageAI');
    }

    return data.data[0].embedding;
  }

  private async makeBatchRequest(
    request: EmbeddingRequest,
  ): Promise<number[][]> {
    if (!this.config.apiKey) {
      throw new Error('VoyageAI API key not configured');
    }

    const response = await fetch(`${this.config.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `VoyageAI API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data: EmbeddingResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embedding data received from VoyageAI');
    }

    // Sort by index to ensure correct order
    const sortedData = data.data.sort((a, b) => a.index - b.index);
    return sortedData.map((item) => item.embedding);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
