/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseTool,
  ToolResult,
  ToolCallConfirmationDetails,
  ToolInfoConfirmationDetails,
  Icon,
} from './tools.js';
import { Config } from '../config/config.js';
import { searchDocuments } from '../services/vectorDbClient.js';

// Define the result structure based on the API response
interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Parameters for the VectorKnowledgeTool
 */
export interface VectorKnowledgeToolParams {
  /**
   * The query to search for in the KT knowledge base
   */
  query: string;
  /**
   * Maximum number of results to return (default: 5)
   */
  limit?: number;
  /**
   * Whether to perform deep-dive search on related concepts
   */
  deep_search?: boolean;
}

/**
 * Vector Knowledge Tool - Allows Qwen to automatically search the KT knowledge base
 * This tool is designed to be used automatically by Qwen when it needs information
 * from the knowledge base, not just when users explicitly request it.
 */
export class VectorKnowledgeTool extends BaseTool<VectorKnowledgeToolParams, ToolResult> {
  static readonly Name: string = 'vector_knowledge';

  constructor(private readonly config: Config) {
    super(
      VectorKnowledgeTool.Name,
      'Vector Knowledge Search',
      `Automatically searches the KT knowledge base (prabhjots664_kt) for relevant information.
      
This tool is designed to be used automatically by Qwen when it needs to:
- Find specific information from the knowledge base
- Understand concepts, processes, or procedures
- Get technical details or best practices
- Access project-specific knowledge
- Research topics before providing answers

The tool performs intelligent search with optional deep-dive exploration of related concepts.
Use this when you need to find information from the KT knowledge base to answer questions or complete tasks.`,
      Icon.LightBulb,
      {
        properties: {
          query: {
            description: 'The search query to find relevant information in the KT knowledge base',
            type: 'string',
          },
          limit: {
            description: 'Maximum number of results to return (default: 5)',
            type: 'number',
          },
          deep_search: {
            description: 'Whether to perform deep-dive search on related concepts (default: true)',
            type: 'boolean',
          },
        },
        required: ['query'],
        type: 'object',
      },
    );
  }

  async execute(
    params: VectorKnowledgeToolParams,
    _signal: AbortSignal,
  ): Promise<ToolResult> {
    const { query, limit = 5, deep_search = true } = params;
    const collectionName = 'prabhjots664_kt'; // Hardcoded collection name

    try {
      // Initial search
      const initialResult = await searchDocuments(query, collectionName, limit);
      
      if (!initialResult.success) {
        return {
          llmContent: `Failed to search KT knowledge base: ${initialResult.error ?? 'Unknown error'}`,
          returnDisplay: `Search failed: ${initialResult.error ?? 'Unknown error'}`,
        };
      }

      const initialResults = initialResult.results ?? [];
      
      if (initialResults.length === 0) {
        // Try alternative search strategies
        const alternativeTerms = this.extractAlternativeTerms(query);
        let alternativeResults: SearchResult[] = [];
        
        for (const term of alternativeTerms.slice(0, 2)) {
          const altResult = await searchDocuments(term, collectionName, 2);
          if (altResult.success && altResult.results) {
            alternativeResults = alternativeResults.concat(altResult.results as SearchResult[]);
          }
        }
        
        if (alternativeResults.length > 0) {
          return {
            llmContent: `No direct results found for "${query}", but found ${alternativeResults.length} related results using alternative terms:\n\n${this.formatResults(alternativeResults)}`,
            returnDisplay: `Found ${alternativeResults.length} related results using alternative search terms.`,
          };
        }
        
        return {
          llmContent: `No relevant information found in the KT knowledge base for "${query}".`,
          returnDisplay: 'No results found in KT knowledge base.',
        };
      }

      let resultContent = `Found ${initialResults.length} result(s) in KT knowledge base for "${query}":\n\n${this.formatResults(initialResults as SearchResult[])}`;

      // Deep search if requested and we have results
      if (deep_search && initialResults.length > 0) {
        const followUpTerms = this.extractKeyTerms(initialResults[0].content, query);
        let deepResults: SearchResult[] = [];
        
        for (const term of followUpTerms.slice(0, 3)) {
          const deepResult = await searchDocuments(term, collectionName, 2);
          if (deepResult.success && deepResult.results) {
            deepResults = deepResults.concat(deepResult.results as SearchResult[]);
          }
        }
        
        if (deepResults.length > 0) {
          resultContent += `\n\nAdditional insights from deep-dive search on related concepts:\n\n${this.formatResults(deepResults)}`;
        }
      }

      return {
        llmContent: resultContent,
        returnDisplay: `Found ${initialResults.length} result(s) in KT knowledge base.`,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error searching KT knowledge base: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
      };
    }
  }

  /**
   * Extract key terms from content for follow-up searches
   */
  private extractKeyTerms(content: string, originalQuery: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 4 &&
        !['the', 'and', 'for', 'with', 'this', 'that', 'will', 'from', 'into', 'during', 'including', 'until', 'against', 'among', 'throughout', 'despite', 'towards', 'upon'].includes(word)
      );

    const uniqueWords = [...new Set(words)].slice(0, 5);
    const queryTerms = originalQuery.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !uniqueWords.includes(word));
    
    return [...uniqueWords, ...queryTerms.slice(0, 3)];
  }

  /**
   * Extract alternative search terms from the original query
   */
  private extractAlternativeTerms(query: string): string[] {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  /**
   * Format search results for display
   */
  private formatResults(results: SearchResult[]): string {
    return results.map((res, index) => 
      `--- Result ${index + 1} (Score: ${res.score?.toFixed(4) ?? 'N/A'}) ---\n${res.content ?? 'No content'}`
    ).join('\n\n');
  }

  async shouldConfirmExecute(
    _params: VectorKnowledgeToolParams,
    _abortSignal: AbortSignal,
  ): Promise<false | ToolCallConfirmationDetails> {
    const confirmationDetails: ToolInfoConfirmationDetails = {
      type: 'info',
      title: 'Search KT Knowledge Base',
      prompt: 'Qwen wants to search the KT knowledge base for relevant information. This will help provide more accurate and comprehensive answers.',
      onConfirm: async () => {
        // This will be handled by the tool execution system
      },
    };
    
    return confirmationDetails;
  }
} 