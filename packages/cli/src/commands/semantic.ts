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

export const semanticCommands = {
  async index(projectPath?: string): Promise<string> {
    try {
      if (!isSemanticAvailable()) {
        return 'Semantic analysis is not available. Please enable it in settings first.';
      }

      const pathToIndex = projectPath || process.cwd();
      await indexProject(pathToIndex);
      return `Successfully indexed project: ${pathToIndex}`;
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
        return 'No semantically relevant code found for your query in the current directory.';
      }

      let output = `Found ${results.length} semantically relevant code snippets in the current directory:\n\n`;

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
      return 'Semantic search is not available. Please enable it in settings first.';
    }

    try {
      const stats = await getSemanticStats();
      
      let output = `🔍 **Semantic Search Status**\n\n`;
      output += `**Status:** ${stats.isInitialized ? '✅ Active' : '❌ Not Initialized'}\n`;
      output += `**Backend:** ${stats.backend}\n`;
      output += `**Total Chunks:** ${stats.totalChunks}\n`;
      output += `**Unique Files:** ${stats.uniqueFiles}\n`;
      output += `**Index Size:** ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB\n`;
      
      if (stats.duplicates > 0) {
        output += `⚠️ **Duplicates Detected:** ${stats.duplicates} chunks\n`;
        output += `   This may indicate indexing issues. Consider re-indexing.\n`;
      }
      
      if (stats.languages && Object.keys(stats.languages).length > 0) {
        output += `**Languages:** ${Object.entries(stats.languages)
          .map(([lang, count]) => `${lang} (${count})`)
          .join(', ')}\n`;
      }
      
      if (stats.lastIndexed) {
        output += `**Last Indexed:** ${stats.lastIndexed.toLocaleString()}\n`;
      }
      
      return output;
    } catch (error) {
      return `Failed to get semantic status: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};
