/**
 * Semantic Search Tool
 * Integrates semantic search with the existing tool system
 */

import { searchSemantic } from '../semantic/index.js';

export const semanticSearchToolDefinition = {
  name: 'SemanticSearch',
  description:
    'Search for code using natural language queries with semantic understanding',
  parameters: {
    query: {
      type: 'string',
      description: "Natural language query describing what you're looking for",
      required: true,
    },
    filePattern: {
      type: 'string',
      description: 'Optional file pattern to limit search scope',
      required: false,
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results to return',
      required: false,
    },
    language: {
      type: 'string',
      description: 'Optional programming language filter',
      required: false,
    },
  },
};

export async function executeSemanticSearch(
  query: string,
  filePattern?: string,
  maxResults: number = 10,
  language?: string,
): Promise<string> {
  try {
    const results = await searchSemantic(query, {
      maxResults,
      filePattern,
      language,
    });

    return formatSearchResults(results);
  } catch (error) {
    return `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

function formatSearchResults(
  results: Array<{
    filePath: string;
    similarity: number;
    metadata: { functionName?: string; complexity: number };
    startLine: number;
    endLine: number;
    content: string;
  }>,
): string {
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
}
