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
      `🔍 **INTELLIGENT SEMANTIC CODE SEARCH** - Advanced code discovery using semantic understanding!

This tool provides semantic understanding for code discovery, finding relevant code based on meaning, intent, and functionality rather than just exact text matches.

**CORE CAPABILITIES:**
- **AUTOMATIC CURRENT DIRECTORY SEARCH** - Always searches in the directory where Terra is currently running
- Semantic understanding of code intent and functionality
- Intelligent result ranking and relevance scoring
- Code context and relationship analysis
- Function/class discovery and dependency mapping
- Cross-file relationship understanding

**BEST USE CASES:**
- Finding code based on functionality rather than exact text
- Discovering similar implementations or patterns
- Understanding code architecture and relationships
- Exploring codebase structure and organization
- Finding related functionality across different files

**SEARCH APPROACH:**
- **Automatically detects and uses current working directory**
- **Auto-indexes current directory if not already indexed**
- Semantic analysis of your query intent
- Vector similarity search across indexed code
- Context-aware result ranking
- Intelligent filtering and relevance scoring

**INTELLIGENT INTEGRATION:**
This tool works best when combined with traditional search tools (grep, glob) for comprehensive coverage. Use semantic_search for understanding intent, and traditional tools for exact pattern matching.

**DIRECTORY AWARENESS:**
- Always searches in the current directory where Terra is running
- Automatically indexes new directories on first search
- No need to manually specify project paths
- Seamlessly follows directory changes`,
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
