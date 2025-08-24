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
        // Parse arguments more intelligently to handle file paths with spaces
        const trimmedArgs = args.trim();
        
        // Find the last space to separate file path from collection name
        const lastSpaceIndex = trimmedArgs.lastIndexOf(' ');
        
        if (lastSpaceIndex === -1) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /vector upload <file_path> <collection_name>\\n\\nNote: File paths with spaces are supported.',
            },
            Date.now(),
          );
          return;
        }

        const filePath = trimmedArgs.substring(0, lastSpaceIndex).trim();
        const collectionName = trimmedArgs.substring(lastSpaceIndex + 1).trim();

        if (!filePath || !collectionName) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Both file path and collection name are required.',
            },
            Date.now(),
          );
          return;
        }
        
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

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Uploading file "${absolutePath}" to collection "${collectionName}"...`,
            },
            Date.now(),
          );

          // Read the file and upload
          const fileBuffer = await fs.readFile(absolutePath);
          const fileName = path.basename(absolutePath);
          const result = await uploadDocument(fileBuffer, fileName, collectionName);

          if (result.success) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Successfully uploaded "${fileName}" to collection "${collectionName}".`,
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
        // Parse arguments more intelligently to handle collection names with spaces
        const trimmedArgs = args.trim();
        
        // Find the first space to separate collection name from query
        const firstSpaceIndex = trimmedArgs.indexOf(' ');
        
        if (firstSpaceIndex === -1) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /vector search <collection_name> <query>\\n\\nNote: Collection names with spaces are supported.',
            },
            Date.now(),
          );
          return;
        }

        const collectionName = trimmedArgs.substring(0, firstSpaceIndex).trim();
        const query = trimmedArgs.substring(firstSpaceIndex + 1).trim();

        if (!collectionName || !query) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Both collection name and search query are required.',
            },
            Date.now(),
          );
          return;
        }

        try {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Searching collection '${collectionName}' for: "${query}"`,
            },
            Date.now(),
          );

          const result = await searchDocuments(query, collectionName, 5); // Default limit of 5
          
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
        const collectionName = 'prabhjots664_kt'; // Hardcoded collection name
        
        try {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Performing intelligent search for: "${query}"`,
            },
            Date.now(),
          );

          // Initial search
          const initialResult = await searchDocuments(query, collectionName, 3);
          
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
          
          // If we have initial results, try to find related concepts
          if (initialResults.length > 0) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Found ${initialResults.length} initial result(s). Exploring related concepts...`,
              },
              Date.now(),
            );

            // Extract key terms for follow-up searches
            const keyTerms = extractKeyTerms(initialResults[0].content, query);
            
            // Perform follow-up searches
            for (const term of keyTerms.slice(0, 3)) {
              const altResult = await searchDocuments(term, collectionName, 2);
              if (altResult.success && altResult.results && altResult.results.length > 0) {
                context.ui.addItem(
                  {
                    type: MessageType.INFO,
                    text: `Found ${altResult.results.length} result(s) for alternative term "${term}":`,
                  },
                  Date.now(),
                );

                altResult.results.forEach((res: SearchResult, index: number) => {
                  context.ui.addItem(
                    {
                      type: MessageType.INFO,
                      text: `  ${index + 1}. (Score: ${res.score?.toFixed(4) ?? 'N/A'}) ${res.content?.substring(0, 200) ?? 'No content'}...`,
                    },
                    Date.now(),
                  );
                });

                allResults = allResults.concat(altResult.results);
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

          // Perform deep-dive search on most relevant result
          if (initialResults.length > 0) {
            const deepTerms = extractKeyTerms(initialResults[0].content, query);
            let deepResults: SearchResult[] = [];
            
            for (const term of deepTerms.slice(0, 3)) {
              const deepResult = await searchDocuments(term, collectionName, 2);
              if (deepResult.success && deepResult.results && deepResult.results.length > 0) {
                context.ui.addItem(
                  {
                    type: MessageType.INFO,
                    text: `\\n=== DEEP-DIVE RESULTS for "${term}" ===`,
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
                  text: `\\n🎯 Intelligent search completed! Found ${allResults.length + deepResults.length} total insights.`,
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