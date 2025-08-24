// packages/cli/src/ui/commands/vectorCommand.ts
import { CommandKind, SlashCommand } from './types.js';
import { MessageType } from '../types.js';
import * as path from 'path';
import * as fs from 'fs/promises';

// Import the vector DB client functions
import { uploadDocument, searchDocuments } from '@qwen-code/qwen-code-core';

// Define the result structure to match API response
interface SearchResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Extracts key terms from content for follow-up searches
 * @param content - The content to analyze
 * @param originalQuery - The original search query
 * @returns Array of key terms for follow-up searches
 */
function extractKeyTerms(content: string, originalQuery: string): string[] {
  // Simple term extraction - split content into words and filter
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => 
      word.length > 4 && // Only meaningful words
      !['the', 'and', 'for', 'with', 'this', 'that', 'will', 'from', 'into', 'during', 'including', 'until', 'against', 'among', 'throughout', 'despite', 'towards', 'upon'].includes(word)
    );

  // Get unique words (max 5) and also include query terms not already found
  const uniqueWords = [...new Set(words)].slice(0, 5);
  const queryTerms = originalQuery.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !uniqueWords.includes(word));
  
  return [...uniqueWords, ...queryTerms.slice(0, 3)];
}

/**
 * Generates refined search queries based on initial results and key terms
 * @param originalQuery - The original search query
 * @param initialResults - The initial search results
 * @param keyTerms - Extracted key terms from results
 * @returns Array of refined search queries
 */
function generateRefinedQueries(originalQuery: string, initialResults: SearchResult[], keyTerms: string[]): string[] {
  const refinedQueries: string[] = [];
  
  // Strategy 1: Combine original query with key terms
  for (const term of keyTerms.slice(0, 3)) {
    refinedQueries.push(`${originalQuery} ${term}`);
  }
  
  // Strategy 2: Extract specific concepts from results
  const resultTexts = initialResults.map(r => r.content).join(' ');
  const concepts = extractConcepts(resultTexts);
  for (const concept of concepts.slice(0, 2)) {
    refinedQueries.push(`${originalQuery} ${concept}`);
  }
  
  // Strategy 3: Create more specific queries based on content patterns
  if (initialResults.length > 0) {
    const firstResult = initialResults[0].content;
    const specificTerms = extractSpecificTerms(firstResult, originalQuery);
    for (const term of specificTerms.slice(0, 2)) {
      refinedQueries.push(`${term} ${originalQuery}`);
    }
  }
  
  return refinedQueries;
}

/**
 * Generates alternative search queries when no initial results are found
 * @param originalQuery - The original search query
 * @returns Array of alternative search queries
 */
function generateAlternativeQueries(originalQuery: string): string[] {
  const alternatives: string[] = [];
  
  // Strategy 1: Broaden the search by removing specific terms
  const words = originalQuery.split(/\s+/);
  if (words.length > 2) {
    alternatives.push(words.slice(0, -1).join(' ')); // Remove last word
    alternatives.push(words.slice(1).join(' ')); // Remove first word
  }
  
  // Strategy 2: Use synonyms or related terms
  const synonyms = getSynonyms(originalQuery);
  alternatives.push(...synonyms.slice(0, 2));
  
  // Strategy 3: Break down complex queries
  if (originalQuery.includes('how to') || originalQuery.includes('what is')) {
    alternatives.push(originalQuery.replace('how to', '').replace('what is', '').trim());
  }
  
  return alternatives;
}

/**
 * Extracts concepts from text content
 * @param text - The text to analyze
 * @returns Array of extracted concepts
 */
function extractConcepts(text: string): string[] {
  // Simple concept extraction - look for capitalized phrases and technical terms
  const concepts: string[] = [];
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i][0] === words[i][0]?.toUpperCase() && words[i + 1][0] === words[i + 1][0]?.toUpperCase()) {
        concepts.push(`${words[i]} ${words[i + 1]}`);
      }
    }
  }
  
  return concepts.slice(0, 5);
}

/**
 * Extracts specific technical terms from content
 * @param content - The content to analyze
 * @param _originalQuery - The original query for context (unused but kept for future use)
 * @returns Array of specific terms
 */
function extractSpecificTerms(content: string, _originalQuery: string): string[] {
  const terms: string[] = [];
  
  // Look for technical patterns (e.g., "API", "function", "method", etc.)
  const technicalPatterns = /\b(api|function|method|class|interface|module|package|service|endpoint|database|query|search|upload|download)\b/gi;
  const matches = content.match(technicalPatterns);
  
  if (matches) {
    terms.push(...matches.slice(0, 3));
  }
  
  // Look for domain-specific terms
  const domainTerms = content.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  terms.push(...domainTerms.slice(0, 3));
  
  return terms;
}

/**
 * Gets synonyms or related terms for a query
 * @param query - The query to find synonyms for
 * @returns Array of synonyms/related terms
 */
function getSynonyms(query: string): string[] {
  // Simple synonym mapping - can be expanded
  const synonymMap: Record<string, string[]> = {
    'error': ['issue', 'problem', 'bug', 'failure'],
    'help': ['assist', 'support', 'guide', 'tutorial'],
    'setup': ['install', 'configure', 'initialize', 'prepare'],
    'test': ['verify', 'validate', 'check', 'examine'],
    'create': ['build', 'make', 'generate', 'develop'],
    'update': ['modify', 'change', 'edit', 'revise'],
    'delete': ['remove', 'erase', 'clear', 'drop'],
    'search': ['find', 'lookup', 'query', 'discover'],
    'upload': ['import', 'add', 'insert', 'submit'],
    'download': ['export', 'save', 'retrieve', 'fetch']
  };
  
  const lowerQuery = query.toLowerCase();
  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (lowerQuery.includes(key)) {
      return synonyms;
    }
  }
  
  return [];
}

/**
 * Generates deep-dive search queries for more comprehensive exploration
 * @param originalQuery - The original search query
 * @param mostRelevantResult - The most relevant search result
 * @param keyTerms - Extracted key terms from the result
 * @returns Array of deep-dive search queries
 */
function generateDeepDiveQueries(originalQuery: string, mostRelevantResult: SearchResult, keyTerms: string[]): string[] {
  const deepDiveQueries: string[] = [];
  
  // Strategy 1: Focus on specific aspects mentioned in the result
  const content = mostRelevantResult.content.toLowerCase();
  const aspects = extractAspects(content);
  for (const aspect of aspects.slice(0, 2)) {
    deepDiveQueries.push(`${aspect} ${originalQuery}`);
  }
  
  // Strategy 2: Create more specific technical queries
  const technicalTerms = extractTechnicalTerms(content);
  for (const term of technicalTerms.slice(0, 2)) {
    deepDiveQueries.push(`${originalQuery} ${term} implementation`);
    deepDiveQueries.push(`${term} ${originalQuery} examples`);
  }
  
  // Strategy 3: Use key terms for additional queries
  for (const keyTerm of keyTerms.slice(0, 2)) {
    deepDiveQueries.push(`${keyTerm} ${originalQuery}`);
    deepDiveQueries.push(`${originalQuery} ${keyTerm} details`);
  }
  
  // Strategy 4: Generate contextual follow-up queries
  const contextualQueries = generateContextualQueries(originalQuery, content);
  deepDiveQueries.push(...contextualQueries.slice(0, 2));
  
  return deepDiveQueries;
}

/**
 * Extracts aspects or dimensions from content
 * @param content - The content to analyze
 * @returns Array of extracted aspects
 */
function extractAspects(content: string): string[] {
  const aspects: string[] = [];
  
  // Look for aspect indicators
  const aspectPatterns = [
    /\b(performance|speed|efficiency|optimization)\b/gi,
    /\b(security|authentication|authorization|encryption)\b/gi,
    /\b(scalability|scaling|load|capacity)\b/gi,
    /\b(compatibility|integration|api|interface)\b/gi,
    /\b(error|exception|handling|logging)\b/gi,
    /\b(testing|validation|verification|quality)\b/gi
  ];
  
  for (const pattern of aspectPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      aspects.push(...matches.slice(0, 2));
    }
  }
  
  return aspects;
}

/**
 * Extracts technical terms from content
 * @param content - The content to analyze
 * @returns Array of technical terms
 */
function extractTechnicalTerms(content: string): string[] {
  const terms: string[] = [];
  
  // Look for technical patterns
  const technicalPatterns = [
    /\b(database|sql|nosql|mongodb|postgresql)\b/gi,
    /\b(api|rest|graphql|http|https)\b/gi,
    /\b(cache|redis|memcached|session)\b/gi,
    /\b(queue|message|event|stream)\b/gi,
    /\b(microservice|service|endpoint|gateway)\b/gi,
    /\b(container|docker|kubernetes|deployment)\b/gi
  ];
  
  for (const pattern of technicalPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      terms.push(...matches.slice(0, 2));
    }
  }
  
  return terms;
}

/**
 * Generates contextual follow-up queries
 * @param originalQuery - The original query
 * @param content - The content to analyze
 * @returns Array of contextual queries
 */
function generateContextualQueries(originalQuery: string, content: string): string[] {
  const queries: string[] = [];
  
  // Look for "how to" opportunities
  if (content.includes('error') || content.includes('problem')) {
    queries.push(`how to fix ${originalQuery}`);
    queries.push(`troubleshooting ${originalQuery}`);
  }
  
  if (content.includes('setup') || content.includes('install')) {
    queries.push(`how to configure ${originalQuery}`);
    queries.push(`${originalQuery} best practices`);
  }
  
  if (content.includes('api') || content.includes('endpoint')) {
    queries.push(`${originalQuery} documentation`);
    queries.push(`${originalQuery} examples`);
  }
  
  return queries;
}

export const vectorCommand: SlashCommand = {
  name: 'vector',
  description: 'Commands for interacting with the vector database.',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'upload',
      description: 'Upload a file to the vector database.',
      kind: CommandKind.BUILT_IN,
      action: async (context, args) => {
        // Parse arguments - only file path is needed, collection is auto-generated
        const trimmedArgs = args.trim();
        
        // Debug: Show raw arguments for troubleshooting
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: `Raw arguments: "${args}"`,
          },
          Date.now(),
        );
        
        if (!trimmedArgs) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /vector upload <file_path>\\n\\nNote: File paths with spaces should be quoted (e.g., "C:\\path\\with spaces\\file.txt"). Collection name is automatically generated from your Terra credentials.',
            },
            Date.now(),
          );
          return;
        }

        // Handle quoted file paths properly
        let filePath = trimmedArgs;
        
        // Remove surrounding quotes if they exist
        if ((filePath.startsWith('"') && filePath.endsWith('"')) || 
            (filePath.startsWith("'") && filePath.endsWith("'"))) {
          filePath = filePath.slice(1, -1);
        }
        
        // Clean up any extra whitespace and handle Windows path issues
        filePath = filePath.trim();
        
                // Handle Windows path edge cases
        if (process.platform === 'win32') {
          // Remove any extra quotes that might have been added by the CLI framework
          filePath = filePath.replace(/^"+|"+$/g, '');
          // Handle backslash escaping issues
          filePath = filePath.replace(/\\\\/g, '\\');
        }
        
        // Additional validation for the parsed path
        if (!filePath || filePath.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'File path is required and cannot be empty.',
            },
            Date.now(),
          );
          return;
        }
        
        // Check if the path looks valid
        if (filePath.includes('undefined') || filePath.includes('null')) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Invalid file path detected: "${filePath}"`,
            },
            Date.now(),
          );
          return;
        }
        
        // Debug: Show the parsed file path
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: `Parsed file path: "${filePath}"`,
          },
          Date.now(),
        );
        
        // Handle both absolute and relative paths
        let absolutePath = '';
        
        try {
          if (path.isAbsolute(filePath)) {
            // If it's already an absolute path, use it as-is
            absolutePath = filePath;
          } else {
            // If it's a relative path, resolve it from current working directory
            absolutePath = context.services.config
              ? path.resolve(context.services.config.getWorkingDir(), filePath)
              : path.resolve(process.cwd(), filePath);
          }

          // Normalize the path to handle different path separators
          absolutePath = path.normalize(absolutePath);
          
          // Debug: Show the resolved absolute path
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Resolved absolute path: "${absolutePath}"`,
            },
            Date.now(),
          );

          // Check if file exists (basic validation)
          try {
            await fs.access(absolutePath);
          } catch {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `File not found: ${absolutePath}`,
              },
              Date.now(),
            );
            return;
          }

          // Get Terra credentials from environment or settings
          let terraApiKey = process.env.TERRA_API_KEY;
          let terraUsername = process.env.TERRA_USERNAME;
          
          // If not in env, try to get from settings
          if (!terraApiKey || !terraUsername) {
            if (context.services.settings) {
              terraApiKey = terraApiKey || context.services.settings.merged.terraApiKey;
              terraUsername = terraUsername || context.services.settings.merged.terraUsername;
            }
          }
          
          if (!terraApiKey || !terraUsername) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Terra credentials not found. Terra credentials are automatically registered when you authenticate with Qwen/OpenAI/Gemini. Please authenticate first.',
              },
              Date.now(),
            );
            return;
          }

          // Use user's collection name
          const userCollectionName = `${terraUsername}_kt`;
          
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Uploading file "${absolutePath}" to collection "${userCollectionName}"...`,
            },
            Date.now(),
          );
          
          // Read the file and upload
          const fileBuffer = await fs.readFile(absolutePath);
          const fileName = path.basename(absolutePath);
          const result = await uploadDocument(fileBuffer, fileName, userCollectionName, terraApiKey);

          if (result.success) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Successfully uploaded "${fileName}" to collection "${userCollectionName}".`,
              },
              Date.now(),
            );
          } else {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Failed to upload file: ${result.error || 'Unknown error'}`,
              },
              Date.now(),
            );
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error uploading file "${absolutePath}": ${errorMessage}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'search',
      description: 'Search documents in the vector database.',
      kind: CommandKind.BUILT_IN,
      action: async (context, args) => {
        // Parse arguments - only query is needed, collection is auto-generated
        const trimmedArgs = args.trim();
        
        if (!trimmedArgs) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /vector search <query>\\n\\nNote: Collection name is automatically generated from your Terra credentials.',
            },
            Date.now(),
          );
          return;
        }

        const query = trimmedArgs.trim();

        if (!query) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Search query is required.',
            },
            Date.now(),
          );
          return;
        }

        // Get Terra credentials
        const terraApiKey = process.env.TERRA_API_KEY;
        const terraUsername = process.env.TERRA_USERNAME;
        
        if (!terraApiKey || !terraUsername) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Terra credentials not found. Use /auth terra register to set up your credentials first.',
            },
            Date.now(),
          );
          return;
        }

        // Use user's collection name
        const userCollectionName = `${terraUsername}_kt`;
        
        try {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Searching collection '${userCollectionName}' for: "${query}"`,
            },
            Date.now(),
          );

          const result = await searchDocuments(query, userCollectionName, 5, terraApiKey); // Default limit of 5
          
          if (result.success) {
            const results = result.results ?? [];
            if (results.length === 0) {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: 'No results found.',
                },
                Date.now(),
              );
            } else {
              let responseText = `Found ${results.length} result(s):\\n`;
              results.forEach((res: SearchResult, index: number) => {
                responseText += `\n--- Result ${index + 1} (Score: ${res.score?.toFixed(4) ?? 'N/A'}) ---\n${res.content ?? 'No content'}\n`;
              });
              
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: responseText,
                },
                Date.now(),
              );
            }
          } else {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Search failed: ${result.error || 'Unknown error'}`,
              },
              Date.now(),
            );
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error during search: ${errorMessage}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'intelligent',
      description: 'Intelligent agentic search using the KT knowledge base with multi-depth exploration.',
      kind: CommandKind.BUILT_IN,
      action: async (context, args) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /vector intelligent <your question or query>\\n\\nThis command will intelligently search the KT knowledge base and provide comprehensive answers.',
            },
            Date.now(),
          );
          return;
        }

        const query = args.trim();
        
        // Get Terra credentials from environment or settings
        let terraApiKey = process.env.TERRA_API_KEY;
        let terraUsername = process.env.TERRA_USERNAME;
        
        // If not in env, try to get from settings
        if (!terraApiKey || !terraUsername) {
          if (context.services.settings) {
            terraApiKey = terraApiKey || context.services.settings.merged.terraApiKey;
            terraUsername = terraUsername || context.services.settings.merged.terraUsername;
          }
        }
        
        if (!terraApiKey || !terraUsername) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Terra credentials not found. Terra credentials are automatically registered when you authenticate with Qwen/OpenAI/Gemini. Please authenticate first.',
            },
            Date.now(),
          );
          return;
        }

        // Use user's collection name
        const collectionName = `${terraUsername}_kt`;
        
        try {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Performing intelligent search for: "${query}"`,
            },
            Date.now(),
          );

          // Initial search
          const initialResult = await searchDocuments(query, collectionName, 3, terraApiKey);
          
          if (!initialResult.success) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Search failed: ${initialResult.error || 'Unknown error'}`,
              },
              Date.now(),
            );
            return;
          }

          const initialResults = initialResult.results ?? [];
          let allResults: SearchResult[] = [...initialResults];
          
                    // If we have initial results, perform agentic search refinement
          if (initialResults.length > 0) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Found ${initialResults.length} initial result(s). Performing agentic search refinement...`,
              },
              Date.now(),
            );

            // Extract key terms and concepts from initial results
            const keyTerms = extractKeyTerms(initialResults[0].content, query);
            
            // Refine the search query based on initial results
            const refinedQueries = generateRefinedQueries(query, initialResults, keyTerms);
            
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Generated ${refinedQueries.length} refined search queries based on initial results.`,
              },
              Date.now(),
            );

            // Perform refined searches
            for (const refinedQuery of refinedQueries.slice(0, 3)) {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: `Searching with refined query: "${refinedQuery}"`,
                },
                Date.now(),
              );

              const refinedResult = await searchDocuments(refinedQuery, collectionName, 2, terraApiKey);
              if (refinedResult.success && refinedResult.results && refinedResult.results.length > 0) {
                context.ui.addItem(
                  {
                    type: MessageType.INFO,
                    text: `Found ${refinedResult.results.length} result(s) for refined query "${refinedQuery}":`,
                  },
                  Date.now(),
                );

                refinedResult.results.forEach((res: SearchResult, index: number) => {
                  context.ui.addItem(
                    {
                      type: MessageType.INFO,
                      text: `  ${index + 1}. (Score: ${res.score?.toFixed(4) ?? 'N/A'}) ${res.content?.substring(0, 200) ?? 'No content'}...`,
                    },
                    Date.now(),
                  );
                });

                allResults = allResults.concat(refinedResult.results);
              }
            }
          } else {
            // Try alternative search strategies if no initial results
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: 'No direct results found. Trying alternative search strategies...',
              },
              Date.now(),
            );
            
            // Generate alternative queries when no initial results
            const alternativeQueries = generateAlternativeQueries(query);
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Trying alternative search strategies: ${alternativeQueries.slice(0, 3).join(', ')}`,
              },
              Date.now(),
            );
            
            for (const altQuery of alternativeQueries.slice(0, 3)) {
              const altResult = await searchDocuments(altQuery, collectionName, 2, terraApiKey);
              if (altResult.success && altResult.results && altResult.results.length > 0) {
                context.ui.addItem(
                  {
                    type: MessageType.INFO,
                    text: `Found ${altResult.results.length} result(s) for alternative query "${altQuery}":`,
                  },
                  Date.now(),
                );
                allResults = allResults.concat(altResult.results);
              }
            }
          }

          // Display comprehensive results
          if (allResults.length === 0) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: 'No results found in the KT knowledge base for your query.',
              },
              Date.now(),
            );
          } else {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `\\n=== COMPREHENSIVE RESULTS (${allResults.length} total) ===`,
              },
              Date.now(),
            );

            allResults.forEach((res: SearchResult, index: number) => {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: `\\n--- Result ${index + 1} (Score: ${res.score?.toFixed(4) ?? 'N/A'}) ---\\n${res.content ?? 'No content'}`,
                },
                Date.now(),
              );
            });
          }

          // Perform agentic deep-dive search on most relevant result
          if (initialResults.length > 0) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `\\n=== PERFORMING AGENTIC DEEP-DIVE SEARCH ===`,
              },
              Date.now(),
            );
            
            const deepTerms = extractKeyTerms(initialResults[0].content, query);
            let deepResults: SearchResult[] = [];
            
            // Generate deep-dive queries based on the most relevant result
            const deepDiveQueries = generateDeepDiveQueries(query, initialResults[0], deepTerms);
            
            for (const deepQuery of deepDiveQueries.slice(0, 3)) {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: `Deep-dive search: "${deepQuery}"`,
                },
                Date.now(),
              );
              
              const deepResult = await searchDocuments(deepQuery, collectionName, 2, terraApiKey);
              if (deepResult.success && deepResult.results && deepResult.results.length > 0) {
                context.ui.addItem(
                  {
                    type: MessageType.INFO,
                    text: `\\n=== DEEP-DIVE RESULTS for "${deepQuery}" ===`,
                  },
                  Date.now(),
                );

                deepResult.results.forEach((res: SearchResult, index: number) => {
                  context.ui.addItem(
                    {
                      type: MessageType.INFO,
                      text: `${index + 1}. (Score: ${res.score?.toFixed(4) ?? 'N/A'}) ${res.content ?? 'No content'}`,
                    },
                    Date.now(),
                  );
                });

                deepResults = deepResults.concat(deepResult.results);
              }
            }

            if (deepResults.length > 0) {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: `\\n🎯 Agentic search completed! Found ${allResults.length + deepResults.length} total insights through intelligent query refinement.`,
                },
                Date.now(),
              );
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error during intelligent search: ${errorMessage}`,
            },
            Date.now(),
          );
        }
      },
    },
  ],
};