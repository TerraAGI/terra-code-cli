/**
 * Semantic Commands
 * CLI commands for semantic analysis and search
 */

import {
  indexProject,
  searchSemantic,
  isSemanticAvailable,
  getSemanticStats,
} from '../semantic/index.js';

export interface SemanticCommands {
  index: (projectPath: string) => Promise<string>;
  search: (query: string, options?: Record<string, unknown>) => Promise<string>;
  status: () => Promise<string>;
}

export const semanticCommands: SemanticCommands = {
  async index(projectPath: string): Promise<string> {
    try {
      if (!isSemanticAvailable()) {
        return 'Semantic analysis is not available. Please enable it in settings first.';
      }

      await indexProject(projectPath);
      return `Successfully indexed project: ${projectPath}`;
    } catch (error) {
      return `Failed to index project: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  async search(
    query: string,
    options: Record<string, unknown> = {},
  ): Promise<string> {
    try {
      if (!isSemanticAvailable()) {
        return 'Semantic search is not available. Please enable it in settings first.';
      }

      const results = await searchSemantic(query, options);

      if (results.length === 0) {
        return 'No semantically relevant code found for your query.';
      }

      let output = `Found ${results.length} semantically relevant code snippets:\n\n`;

      results.forEach((result, index) => {
        output += `${index + 1}. **${result.filePath}** (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n`;
        output += `   Function: ${result.metadata.functionName || 'N/A'}\n`;
        output += `   Lines: ${result.startLine}-${result.endLine}\n`;
        output += `   Complexity: ${result.metadata.complexity}\n\n`;

        if (result.content) {
          output += `   **Code Preview:**\n`;
          output += `   \`\`\`\n`;
          output += `   ${result.content.slice(0, 200)}${result.content.length > 200 ? '...' : ''}\n`;
          output += `   \`\`\`\n\n`;
        }
      });

      return output;
    } catch (error) {
      return `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  async status(): Promise<string> {
    const available = isSemanticAvailable();

    if (!available) {
      return 'Semantic analysis is disabled. Enable it in settings to use semantic features.';
    }

    try {
      const stats = await getSemanticStats();
      
      let status = 'Semantic analysis is enabled and available.\n\n';
      status += `**Backend**: ${stats.backend}\n`;
      status += `**Status**: ${stats.isInitialized ? 'Initialized' : 'Not initialized'}\n`;
      status += `**Indexed Chunks**: ${stats.totalChunks}\n`;
      status += `**Index Size**: ${stats.indexSize} bytes\n`;
      
      if (stats.backend === 'simplified') {
        status += '\n💡 **Note**: Using simplified backend (FAISS not available).\n';
        status += '   For better performance, install FAISS:\n';
        status += '   1. Install Visual Studio Build Tools 2019+\n';
        status += '   2. Install Python 3.8+ and ensure it\'s in PATH\n';
        status += '   3. Run: npm rebuild faiss-node\n';
      }
      
      return status;
    } catch (error) {
      return `Semantic analysis is enabled but failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};
