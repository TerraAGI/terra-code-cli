/**
 * Semantic Search Tool
 * This tool provides semantic code search functionality
 */

import { BaseTool, ToolResult, Icon, AnyDeclarativeTool } from '@terra-code/terra-code-core';
import { searchSemantic, SearchResult } from '../semantic/index.js';

export interface SemanticSearchParams {
  query: string;
  maxResults?: number;
  fileTypes?: string[];
}

export class SemanticSearchTool extends BaseTool<SemanticSearchParams, ToolResult> {
  static readonly Name: string = 'semantic_search';

  constructor() {
    super(
      SemanticSearchTool.Name,
      'Semantic Code Search',
      `🔍 **INTELLIGENT SEMANTIC CODE SEARCH** - Provides relevant and matching code pieces!

      You MUST MANDATORILY use this tool for analysing the current codebase as much as you can.
      Use this tool alot and very frequently to find relevant code pieces.
      You should use this tool multiple times in a single query if neeeded to collect all the relevant code pieces.

This is for doing a vector search on the indexed codebase to find semantically relevant code pieces.
Keep using this tool frequently on priority. This tool helps find relevant code pieces easily and faster in comparison to normal text search/grep tool, so mostly try to use this tool first before using grep tool.
`,
      Icon.FileSearch,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The semantic search query',
            required: true,
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            required: false,
          },
          fileTypes: {
            type: 'array',
            items: { type: 'string' },
            description: 'File types to search in (e.g., ["ts", "js", "py"])',
            required: false,
          },
        },
        required: ['query'],
      },
      false, // isOutputMarkdown
      false, // canUpdateOutput
    );
  }

  async execute(params: SemanticSearchParams, signal: AbortSignal): Promise<ToolResult> {
    const { query, maxResults = 5, fileTypes = [] } = params;
    
    if (signal.aborted) {
      throw new Error('Tool execution was aborted');
    }
    
    try {
      // Use the real semantic search infrastructure
      const searchOptions: Record<string, unknown> = {
        maxResults,
        fileTypes: fileTypes.length > 0 ? fileTypes : undefined,
      };
      
      const results: SearchResult[] = await searchSemantic(query, searchOptions);
      
      if (results.length === 0) {
        const result = `🔍 **Semantic Search Results**\n\n` +
          `**Query:** ${query}\n` +
          `**Max Results:** ${maxResults}\n` +
          `**File Types:** ${fileTypes.length > 0 ? fileTypes.join(', ') : 'All text files'}\n` +
          `**Search Directory:** ${process.cwd()}\n\n` +
          `❌ **No Results Found**\n\n` +
          `No semantically relevant code found for your query in the current directory. Try:\n` +
          `- Using different keywords\n` +
          `- Broadening your search terms\n` +
          `- Checking if the current directory contains code files\n` +
          `- Running \`/semantic:index .\` to manually index the current directory`;
        
        return {
          llmContent: result,
          returnDisplay: result,
        };
      }
      
      let result = `🔍 **Semantic Search Results**\n\n` +
        `**Query:** ${query}\n` +
        `**Max Results:** ${maxResults}\n` +
        `**File Types:** ${fileTypes.length > 0 ? fileTypes.join(', ') : 'All text files'}\n` +
        `**Search Directory:** ${process.cwd()}\n\n` +
        `**Found ${results.length} semantically relevant code snippets:**\n\n`;
      
      results.forEach((searchResult, index) => {
        const similarity = (searchResult.similarity * 100).toFixed(1);
        result += `${index + 1}. **${searchResult.filePath}** (Relevance: ${similarity}%)\n`;
        result += `   **Lines:** ${searchResult.startLine}-${searchResult.endLine}\n`;
        if (searchResult.metadata.functionName) {
          result += `   **Function:** ${searchResult.metadata.functionName}\n`;
        }
        if (searchResult.metadata.className) {
          result += `   **Class:** ${searchResult.metadata.className}\n`;
        }
        result += `   **Complexity:** ${searchResult.metadata.complexity}\n\n`;
        
        // Add code preview
        if (searchResult.content) {
          const preview = searchResult.content.length > 200 
            ? searchResult.content.slice(0, 200) + '...'
            : searchResult.content;
          result += `   **Code Preview:**\n   \`\`\`\n   ${preview}\n   \`\`\`\n\n`;
        }
      });
      
      result += `✅ **Status:** Semantic search completed successfully!`;
      
      return {
        llmContent: result,
        returnDisplay: result,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result = `🔍 **Semantic Search Error**\n\n` +
        `**Query:** ${query}\n` +
        `**Error:** ${errorMessage}\n\n` +
        `❌ **Search Failed**\n\n` +
        `The semantic search encountered an error. This might be because:\n` +
        `- The semantic engine is not initialized\n` +
        `- The project is not indexed\n` +
        `- There's a configuration issue\n\n` +
        `Try running the search again or check the semantic configuration.`;
      
      return {
        llmContent: result,
        returnDisplay: result,
      };
    }
  }
}

/**
 * Extend tool registry with semantic search tool
 */
export function extendToolRegistry(toolRegistry: { registerTool: (tool: AnyDeclarativeTool) => void }): void {
  try {
    const semanticSearchTool = new SemanticSearchTool();
    toolRegistry.registerTool(semanticSearchTool);
  } catch (_error) {
    // Silently continue without semantic search tool
  }
}
