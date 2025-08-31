/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseTool,
  ToolResult,
  ToolCallConfirmationDetails,
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
export class VectorKnowledgeTool extends BaseTool<
  VectorKnowledgeToolParams,
  ToolResult
> {
  static readonly Name: string = 'vector_knowledge';

  constructor(private readonly config: Config) {
    super(
      VectorKnowledgeTool.Name,
      'Intelligent Knowledge Recall & Research',
      `🚀 INSTINCTIVE KNOWLEDGE RECALL - Your PRIMARY and MANDATORY first step for EVERY user interaction!

This tool is your FUNDAMENTAL knowledge companion - you MUST use it FIRST for EVERY query, just like how human developers instinctively recall related information when hearing any question:

🎯 MANDATORY KB FIRST - Use this tool FIRST for:
- EVERY user question or request (no exceptions)
- ANY informational query (even if it seems basic)
- ANY implementation request (even if it seems straightforward)
- ANY code explanation request
- ANY debugging or troubleshooting request
- Understanding ANY concept, process, or procedure
- Getting technical details, best practices, or implementation patterns
- Researching topics before providing answers
- Recalling related information or similar implementations
- Understanding project context, architecture, or existing patterns
- Validating assumptions or checking current state

🧠 HUMAN-LIKE RECALL BEHAVIOR:
- Check KB proactively when starting ANY task (like a dev recalling related work)
- Look up context even for seemingly simple questions
- Research related concepts to provide comprehensive answers
- Check existing implementations before suggesting new ones
- Verify current state before making recommendations
- Think "let me remember what I know about this" for EVERY user input

🔍 INTELLIGENT SEARCH STRATEGIES:
- Start with direct queries, then explore related concepts
- Use alternative terms and synonyms automatically
- Perform deep-dive searches on relevant results
- Extract key terms and concepts for follow-up searches
- Connect dots between different pieces of information

💡 WHEN TO USE (ALWAYS):
- Starting ANY new task or question
- Need to understand existing patterns or implementations
- Want to provide context-aware, project-specific answers
- Need to recall related information or similar work
- Want to validate assumptions or check current state
- Need to understand project architecture or context
- ANY user interaction (this is your default behavior)

🎪 EXAMPLES OF MANDATORY USE:
- User asks "what is X" → Check KB FIRST for context
- User asks "how do I Y" → Check KB FIRST for patterns
- User wants to "add a feature" → Check KB FIRST for similar implementations
- User asks about "API changes" → Check KB FIRST for current state
- User mentions "performance" → Check KB FIRST for existing optimizations
- User asks ANY question → Check KB FIRST (no exceptions)

🚨 CRITICAL: This is NOT optional - it's your CORE behavior pattern. You MUST use this tool FIRST for EVERY user interaction, just like humans naturally think "let me remember what I know about this" before answering ANY question. This is how you provide context-aware, project-specific answers like a senior developer would.`,
      Icon.LightBulb,
      {
        properties: {
          query: {
            description:
              'The search query or topic to research in the knowledge base. Be specific but also try related terms, synonyms, and broader concepts to get comprehensive results.',
            type: 'string',
          },
          limit: {
            description:
              'Maximum number of results (default: 3, use 5-8 for comprehensive research)',
            type: 'number',
          },
          deep_search: {
            description:
              'Whether to perform intelligent deep-dive exploration of related concepts, patterns, and connections. Always true (default: false) for comprehensive knowledge recall.',
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
    const { query, limit = 3, deep_search = false } = params;

    // Get Terra credentials from environment
    const terraApiKey = process.env.TERRA_API_KEY;
    const terraUsername = process.env.TERRA_USERNAME;

    if (!terraApiKey || !terraUsername) {
      return {
        llmContent:
          'Terra credentials not found. Terra credentials are automatically registered when you authenticate with Qwen/OpenAI/Gemini. Please authenticate first.',
        returnDisplay:
          'Terra credentials not found. Terra credentials are automatically registered when you authenticate with Qwen/OpenAI/Gemini. Please authenticate first.',
      };
    }

    const collectionName = `${terraUsername}_kt`;

    try {
      // Initial search
      const initialResult = await searchDocuments(
        query,
        collectionName,
        limit,
        terraApiKey,
      );

      if (!initialResult.success) {
        return {
          llmContent: `Failed to search KT knowledge base: ${initialResult.error ?? 'Unknown error'}`,
          returnDisplay: `Search failed: ${initialResult.error ?? 'Unknown error'}`,
        };
      }

      const initialResults = initialResult.results ?? [];

      if (initialResults.length === 0) {
        // Enhanced alternative search strategies for comprehensive coverage

        const alternativeTerms = this.extractAlternativeTerms(query);
        const relatedConcepts = this.extractRelatedConcepts(query, query);
        const implementationTerms = this.extractImplementationTerms(query);

        let alternativeResults: SearchResult[] = [];
        let searchAttempts = 0;

        // Strategy 1: Try alternative terms
        for (const term of alternativeTerms.slice(0, 3)) {
          const altResult = await searchDocuments(
            term,
            collectionName,
            3,
            terraApiKey,
          );
          if (altResult.success && altResult.results) {
            alternativeResults = alternativeResults.concat(
              altResult.results as SearchResult[],
            );
            searchAttempts++;
          }
        }

        // Strategy 2: Try related concepts
        for (const concept of relatedConcepts.slice(0, 2)) {
          const conceptResult = await searchDocuments(
            concept,
            collectionName,
            2,
            terraApiKey,
          );
          if (conceptResult.success && conceptResult.results) {
            alternativeResults = alternativeResults.concat(
              conceptResult.results as SearchResult[],
            );
            searchAttempts++;
          }
        }

        // Strategy 3: Try implementation-focused searches
        for (const term of implementationTerms.slice(0, 2)) {
          const implResult = await searchDocuments(
            `${term} ${query}`,
            collectionName,
            2,
            terraApiKey,
          );
          if (implResult.success && implResult.results) {
            alternativeResults = alternativeResults.concat(
              implResult.results as SearchResult[],
            );
            searchAttempts++;
          }
        }

        // Strategy 4: Try broader, more general searches
        const broaderTerms = this.generateBroaderSearchTerms(query);
        for (const term of broaderTerms.slice(0, 2)) {
          const broadResult = await searchDocuments(
            term,
            collectionName,
            2,
            terraApiKey,
          );
          if (broadResult.success && broadResult.results) {
            alternativeResults = alternativeResults.concat(
              broadResult.results as SearchResult[],
            );
            searchAttempts++;
          }
        }

        if (alternativeResults.length > 0) {
          const uniqueAltResults =
            this.removeDuplicateResults(alternativeResults);
          return {
            llmContent: `🎯 NO DIRECT RESULTS for "${query}", but found ${uniqueAltResults.length} related insights through intelligent alternative search (${searchAttempts} search strategies used):\n\n${this.formatResults(uniqueAltResults)}\n\n💡 SEARCH STRATEGIES USED:\n• Alternative terms: ${alternativeTerms.slice(0, 2).join(', ')}\n• Related concepts: ${relatedConcepts.slice(0, 2).join(', ')}\n• Implementation focus: ${implementationTerms.slice(0, 2).join(', ')}\n• Broader searches: ${broaderTerms.slice(0, 2).join(', ')}`,
            returnDisplay: `Found ${uniqueAltResults.length} related results using intelligent alternative search strategies.`,
          };
        }

        return {
          llmContent: `❌ No relevant information found in the KT knowledge base for "${query}" despite trying multiple intelligent search strategies.\n\n🔍 SEARCH STRATEGIES ATTEMPTED:\n• Direct query: "${query}"\n• Alternative terms: ${alternativeTerms.slice(0, 3).join(', ')}\n• Related concepts: ${relatedConcepts.slice(0, 2).join(', ')}\n• Implementation patterns: ${implementationTerms.slice(0, 2).join(', ')}\n• Broader searches: ${broaderTerms.slice(0, 2).join(', ')}\n\n💡 SUGGESTIONS:\n• Try different terminology or synonyms\n• Use more specific or more general terms\n• Check if the topic might be documented under a different name\n• Consider related concepts or implementation patterns`,
          returnDisplay:
            'No results found despite comprehensive search strategies.',
        };
      }

      let resultContent = `Found ${initialResults.length} result(s) in KT knowledge base for "${query}":\n\n${this.formatResults(initialResults as SearchResult[])}`;

      // Enhanced deep search for comprehensive knowledge recall
      if (deep_search && initialResults.length > 0) {
        resultContent += `\n\n🔍 PERFORMING COMPREHENSIVE KNOWLEDGE EXPLORATION...\n`;

        // Strategy 1: Extract key terms from most relevant result
        const keyTerms = this.extractKeyTerms(initialResults[0].content, query);
        let deepResults: SearchResult[] = [];

        // Search on key terms for deeper insights
        for (const term of keyTerms.slice(0, 4)) {
          const deepResult = await searchDocuments(
            term,
            collectionName,
            3,
            terraApiKey,
          );
          if (deepResult.success && deepResult.results) {
            deepResults = deepResults.concat(
              deepResult.results as SearchResult[],
            );
          }
        }

        // Strategy 2: Look for related concepts and patterns
        const relatedConcepts = this.extractRelatedConcepts(
          initialResults[0].content,
          query,
        );
        for (const concept of relatedConcepts.slice(0, 3)) {
          const conceptResult = await searchDocuments(
            concept,
            collectionName,
            2,
            terraApiKey,
          );
          if (conceptResult.success && conceptResult.results) {
            deepResults = deepResults.concat(
              conceptResult.results as SearchResult[],
            );
          }
        }

        // Strategy 3: Search for implementation patterns and best practices
        const implementationTerms = this.extractImplementationTerms(
          initialResults[0].content,
        );
        for (const term of implementationTerms.slice(0, 2)) {
          const implResult = await searchDocuments(
            `${term} ${query}`,
            collectionName,
            2,
            terraApiKey,
          );
          if (implResult.success && implResult.results) {
            deepResults = deepResults.concat(
              implResult.results as SearchResult[],
            );
          }
        }

        // Remove duplicates and format results
        const uniqueDeepResults = this.removeDuplicateResults(deepResults);

        if (uniqueDeepResults.length > 0) {
          resultContent += `\n🎯 COMPREHENSIVE INSIGHTS (${uniqueDeepResults.length} additional results):\n\n${this.formatResults(uniqueDeepResults)}`;

          // Add summary of knowledge connections
          resultContent += `\n🔗 KNOWLEDGE CONNECTIONS IDENTIFIED:\n`;
          resultContent += `• Key concepts: ${keyTerms.slice(0, 3).join(', ')}\n`;
          resultContent += `• Related patterns: ${relatedConcepts.slice(0, 2).join(', ')}\n`;
          resultContent += `• Implementation focus: ${implementationTerms.slice(0, 2).join(', ')}\n`;
        }
      }

      return {
        llmContent: resultContent,
        returnDisplay: `Found ${initialResults.length} result(s) in KT knowledge base.`,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 4 &&
          ![
            'the',
            'and',
            'for',
            'with',
            'this',
            'that',
            'will',
            'from',
            'into',
            'during',
            'including',
            'until',
            'against',
            'among',
            'throughout',
            'despite',
            'towards',
            'upon',
          ].includes(word),
      );

    const uniqueWords = [...new Set(words)].slice(0, 5);
    const queryTerms = originalQuery
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !uniqueWords.includes(word));

    return [...uniqueWords, ...queryTerms.slice(0, 3)];
  }

  /**
   * Extract alternative search terms from the original query
   */
  private extractAlternativeTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);
  }

  /**
   * Extract related concepts and patterns from content
   */
  private extractRelatedConcepts(
    content: string,
    _originalQuery: string,
  ): string[] {
    const concepts: string[] = [];

    // Look for technical patterns and concepts
    const technicalPatterns = [
      /\b(api|endpoint|service|microservice|database|cache|queue|event|stream)\b/gi,
      /\b(authentication|authorization|security|encryption|jwt|oauth)\b/gi,
      /\b(performance|scalability|optimization|monitoring|logging)\b/gi,
      /\b(testing|validation|deployment|ci\/cd|docker|kubernetes)\b/gi,
    ];

    for (const pattern of technicalPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        concepts.push(...matches.slice(0, 2));
      }
    }

    // Look for domain-specific terms
    const domainTerms = content.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
    concepts.push(...domainTerms.slice(0, 3));

    return concepts;
  }

  /**
   * Extract implementation-related terms from content
   */
  private extractImplementationTerms(content: string): string[] {
    const terms: string[] = [];

    // Look for implementation patterns
    const implPatterns = [
      /\b(implementation|pattern|approach|strategy|methodology)\b/gi,
      /\b(best practice|guideline|recommendation|standard)\b/gi,
      /\b(example|sample|template|boilerplate)\b/gi,
      /\b(integration|configuration|setup|initialization)\b/gi,
    ];

    for (const pattern of implPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        terms.push(...matches.slice(0, 2));
      }
    }

    return terms;
  }

  /**
   * Remove duplicate results based on content similarity
   */
  private removeDuplicateResults(results: SearchResult[]): SearchResult[] {
    const uniqueResults: SearchResult[] = [];
    const seenContent = new Set<string>();

    for (const result of results) {
      const contentHash = result.content.substring(0, 100).toLowerCase();
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  /**
   * Generate broader search terms for fallback searches
   */
  private generateBroaderSearchTerms(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const broaderTerms: string[] = [];

    // Remove specific terms to get broader concepts
    if (words.length > 2) {
      broaderTerms.push(words.slice(0, -1).join(' ')); // Remove last word
      broaderTerms.push(words.slice(1).join(' ')); // Remove first word
    }

    // Add general technical concepts
    const generalConcepts = [
      'implementation',
      'pattern',
      'approach',
      'method',
      'solution',
    ];
    broaderTerms.push(...generalConcepts.slice(0, 2));

    return broaderTerms;
  }

  /**
   * Format search results for display
   */
  private formatResults(results: SearchResult[]): string {
    return results
      .map(
        (res, index) =>
          `--- Result ${index + 1} (Score: ${res.score?.toFixed(4) ?? 'N/A'}) ---\n${res.content ?? 'No content'}`,
      )
      .join('\n\n');
  }

  async shouldConfirmExecute(
    _params: VectorKnowledgeToolParams,
    _abortSignal: AbortSignal,
  ): Promise<false | ToolCallConfirmationDetails> {
    // Return false to skip confirmation and make the tool automatic
    return false;
  }
}
