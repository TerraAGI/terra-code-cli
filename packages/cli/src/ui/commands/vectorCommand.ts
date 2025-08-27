// packages/cli/src/ui/commands/vectorCommand.ts
import { CommandKind, SlashCommand, SlashCommandActionReturn } from './types.js';
import { MessageType } from '../types.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Content } from '@google/genai';
import { GeminiClient } from '@terra-code/terra-code-core';

// Import the vector DB client functions
import { uploadDocument, searchDocuments as _searchDocuments } from '@terra-code/terra-code-core';

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
function _extractKeyTerms(content: string, originalQuery: string): string[] {
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
function _generateRefinedQueries(originalQuery: string, initialResults: SearchResult[], keyTerms: string[]): string[] {
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
function _generateAlternativeQueries(originalQuery: string): string[] {
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
function _generateDeepDiveQueries(originalQuery: string, mostRelevantResult: SearchResult, keyTerms: string[]): string[] {
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

// KT Session state management
interface KTSession {
  isActive: boolean;
  startHistoryIndex: number;
  sessionId: string;
}

// Global KT session state (could be moved to context if needed)
let currentKTSession: KTSession | null = null;

// Helper function to extract knowledge from KT session messages using LLM
async function extractKnowledgeFromKTSession(
  history: Content[], 
  startIndex: number, 
  geminiClient: GeminiClient | null
): Promise<string> {
  // Fallback: static extraction if no LLM available
  if (!geminiClient) {
    return extractKnowledgeStatically(history, startIndex);
  }

  // Get raw conversation content
  const rawContent = extractKnowledgeStatically(history, startIndex);
  
  if (!rawContent.trim()) {
    return '';
  }

  // Use LLM to intelligently process the knowledge
  try {
    const enhancedKnowledge = await processKnowledgeWithLLM(rawContent, geminiClient);
    return enhancedKnowledge || rawContent; // Fallback to raw if LLM fails
  } catch (error) {
    console.warn('LLM knowledge processing failed, using static extraction:', error);
    return rawContent;
  }
}

// Static extraction as fallback
function extractKnowledgeStatically(history: Content[], startIndex: number): string {
  let knowledgeContent = '';
  
  console.log(`[KT Debug] Processing ${history.length - startIndex} messages from index ${startIndex}`);
  
  // Process messages from KT session start to current
  for (let i = startIndex; i < history.length; i++) {
    const message = history[i];
    const content = message.parts?.map((part) => part.text).join('') || '';
    
    if (content.trim() && message.role === 'user') {
      const text = content.trim();
      
      console.log(`[KT Debug] User message ${i}: "${text.substring(0, 100)}..."`);
      
      // Skip KT commands
      if (text.startsWith('/brain') || text.startsWith('/finish') || text.startsWith('/cancel')) {
        console.log(`[KT Debug] Skipping command: ${text}`);
        continue;
      }
      
      // Skip tool calls and system-generated content
      if (text.includes('<tool_call>') || 
          text.includes('<function=') || 
          text.includes('🚀 MANDATORY KNOWLEDGE RECALL') ||
          text.includes('🚀 KNOWLEDGE RECALL FIRST') ||
          text.includes('USER QUERY:') ||
          text.includes('MANDATORY INSTRUCTIONS:') ||
          text.includes('CRITICAL INSTRUCTIONS:')) {
        console.log(`[KT Debug] Skipping tool call/system content: ${text.substring(0, 50)}...`);
        continue;
      }
      
      // Only include meaningful user knowledge content
      if (text.length > 10) { // Minimum meaningful content length
        console.log(`[KT Debug] Adding knowledge content: "${text}"`);
        knowledgeContent += text + '\n\n';
      }
    }
  }
  
  const result = knowledgeContent.trim();
  console.log(`[KT Debug] Final extracted content length: ${result.length}`);
  console.log(`[KT Debug] Final content preview: "${result.substring(0, 200)}..."`);
  
  return result;
}

// LLM-based knowledge processing
async function processKnowledgeWithLLM(rawContent: string, geminiClient: GeminiClient): Promise<string> {
  const prompt = `You are a technical knowledge curator. Transform the following conversational knowledge sharing into structured, professional technical documentation.

INSTRUCTIONS:
1. Extract the core technical knowledge, processes, and insights
2. Remove conversational filler and redundancy
3. Organize into logical sections with clear headings
4. Maintain all specific technical details, commands, configurations, etc.
5. Use professional technical writing style
6. Focus on actionable information that would help other developers
7. If the content is minimal, create a brief but professional documentation entry
8. Expand on implied technical details where appropriate

CONTENT ANALYSIS:
- Look for service names, technologies, architectures, processes
- Identify implementation details, patterns, best practices
- Note any business logic, workflows, or system interactions
- Extract technical specifications and requirements

RAW KNOWLEDGE CONTENT:
${rawContent}

FORMATTING REQUIREMENTS:
- Use markdown formatting with clear section headers
- Start with a brief overview if sufficient context exists
- Include relevant technical sections (Architecture, Implementation, Configuration, etc.)
- For minimal content, create a concise but complete knowledge entry
- Do not include meta-commentary about the content quality

Transform this into well-structured technical documentation:`;

  const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
  
  try {
    const response = await geminiClient.generateContent(
      contents,
      { 
        maxOutputTokens: 2000,
        temperature: 0.1 // Low temperature for consistent, factual output
      },
      new AbortController().signal
    );
    
    // Extract text from response
    if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const result = response.candidates[0].content.parts[0].text.trim();
      console.log(`[KT Debug] LLM processed content length: ${result.length}`);
      console.log(`[KT Debug] LLM result preview: "${result.substring(0, 200)}..."`);
      return result;
    }
    
    return '';
  } catch (error) {
    throw new Error(`LLM processing failed: ${error}`);
  }
}

// Helper function to format knowledge as technical documentation
function formatAsTechnicalDoc(processedKnowledge: string, username: string): string {
  const timestamp = new Date().toISOString();
  const title = generateDocTitle(processedKnowledge);
  
  let doc = `# ${title}\n\n`;
  doc += `**Author:** ${username}\n`;
  doc += `**Date:** ${timestamp.split('T')[0]}\n`;
  doc += `**Type:** Knowledge Transfer Documentation\n\n`;
  doc += `---\n\n`;
  
  // The processedKnowledge should already be well-structured from LLM processing
  doc += processedKnowledge;
  
  return doc;
}

// Helper function to generate a meaningful title from content
function generateDocTitle(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return 'Knowledge Transfer Session';
  
  const firstLine = lines[0].trim();
  // Extract key topics/concepts for title
  const words = firstLine.split(' ').slice(0, 8).join(' ');
  return words.length > 50 ? words.substring(0, 47) + '...' : words;
}



// Helper function to ensure .kt directory exists
async function ensureKTDirectory(projectRoot: string): Promise<string> {
  const ktDir = path.join(projectRoot, '.kt');
  try {
    await fs.access(ktDir);
  } catch {
    await fs.mkdir(ktDir, { recursive: true });
  }
  return ktDir;
}

export const vectorCommand: SlashCommand = {
  name: 'brain',
  description: 'Manage your Terra knowledge brain - upload documents, start KT sessions, and search knowledge.',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'upload',
      description: 'Upload a document to your brain.',
      kind: CommandKind.BUILT_IN,
      action: async (context, args) => {
        // Parse arguments - only file path is needed, collection is auto-generated
        const trimmedArgs = args.trim();
        
        if (!trimmedArgs) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /brain upload <file_path>\\n\\nNote: File paths with spaces should be quoted (e.g., "C:\\path\\with spaces\\file.txt"). Collection name is automatically generated from your Terra credentials.',
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
              text: `Uploading file "${path.basename(absolutePath)}"...`,
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
                text: `Successfully uploaded "${fileName}".`,
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
              text: `Error uploading file "${path.basename(absolutePath)}": ${errorMessage}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'remember',
      description: 'Remember a fact or preference in your brain.',
      kind: CommandKind.BUILT_IN,
      action: (context, args): SlashCommandActionReturn | void => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /brain remember <fact to remember>',
            },
            Date.now(),
          );
          return;
        }

        const fact = args.trim();
        
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: `🧠 Remembering: "${fact}"`,
          },
          Date.now(),
        );

        return {
          type: 'tool',
          toolName: 'save_memory',
          toolArgs: { fact },
        };
      },
    },
    /*
    {
      name: 'search',
      description: 'Search documents in your brain.',
      kind: CommandKind.BUILT_IN,
      action: async (context, args) => {
        // Parse arguments - only query is needed, collection is auto-generated
        const trimmedArgs = args.trim();
        
        if (!trimmedArgs) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /brain search <query>\\n\\nNote: Collection name is automatically generated from your Terra credentials.',
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
              text: 'Terra credentials not found. Terra credentials are automatically registered when you authenticate with Qwen/OpenAI/Gemini. Please authenticate first.',
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
      description: 'Intelligent agentic search using your brain with multi-depth exploration.',
      kind: CommandKind.BUILT_IN,
      action: async (context, args) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Usage: /brain intelligent <your question or query>\\n\\nThis command will intelligently search the KT knowledge base and provide comprehensive answers.',
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
    */
    {
      name: 'kt',
      description: 'Interactive Knowledge Transfer session to feed your brain.',
      kind: CommandKind.BUILT_IN,
      action: async (context, _args) => {
        // Check if we have Terra credentials
        let terraApiKey = process.env.TERRA_API_KEY;
        let terraUsername = process.env.TERRA_USERNAME;
        
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

        // Initialize KT session state
        const chat = await context.services.config?.getGeminiClient()?.getChat();
        if (!chat) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'No chat client available to start KT session.',
            },
            Date.now(),
          );
          return;
        }

        const currentHistory = chat.getHistory();
        currentKTSession = {
          isActive: true,
          startHistoryIndex: currentHistory.length,
          sessionId: `kt_${Date.now()}`
        };

        // Start interactive KT collection session
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: '🚀 Starting Interactive KT (Knowledge Transfer) Session...\n\n' +
                  'This session will help you collect knowledge from developers and team leads.\n' +
                  'The entire conversation will be recorded and saved as technical documentation.\n\n' +
                  'Available commands during this session:\n' +
                  '• Type "/finish" when you\'re done sharing knowledge to complete and save the session\n' +
                  '• Type "/cancel" to abort the collection without saving\n\n' +
                  'What knowledge would you like to share with the team?',
          },
          Date.now(),
        );

        // Return a special action that will handle the interactive collection
        return {
          type: 'submit_prompt',
          content: `I'm starting an interactive KT (Knowledge Transfer) collection session. 

The user (a developer or team lead) wants to share their knowledge through a conversation with me. This entire conversation will be recorded and saved as technical documentation.

IMPORTANT: This is a special KT collection session. I need to:

1. Help them share their knowledge in a conversational way
2. Ask follow-up questions to get more details
3. Help them structure their knowledge clearly
4. Watch for special commands during the session

Available commands during this session:
• When they type "/finish" - I should help them complete the session and summarize what we've collected
• When they type "/cancel" - I should acknowledge that they want to abort the session

The goal is to capture valuable knowledge that can help other team members. I should be collaborative and ask good follow-up questions to get comprehensive information.

Start by asking them what specific knowledge, processes, or information they want to share with the team.`
        };
      },
    },
    {
      name: 'finish',
      description: 'Complete the current KT session and save the documentation locally and upload to your brain.',
      kind: CommandKind.BUILT_IN,
      action: async (context, _args) => {
        // Check if we have an active KT session
        if (!currentKTSession || !currentKTSession.isActive) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'No active KT session found. Start a session with `/brain kt` first.',
            },
            Date.now(),
          );
          return;
        }

        // Check if we have Terra credentials
        let terraApiKey = process.env.TERRA_API_KEY;
        let terraUsername = process.env.TERRA_USERNAME;
        
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

        // Get the current conversation history
        const chat = await context.services.config?.getGeminiClient()?.getChat();
        if (!chat) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'No chat client available to save conversation.',
            },
            Date.now(),
          );
          return;
        }

        const history = chat.getHistory();
        if (history.length <= currentKTSession.startHistoryIndex) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'No conversation found to save in this KT session.',
            },
            Date.now(),
          );
          return;
        }

        try {
          // Extract knowledge from KT session
          const geminiClient = context.services.config?.getGeminiClient() || null;
          const rawKnowledge = await extractKnowledgeFromKTSession(history, currentKTSession.startHistoryIndex, geminiClient);
          
          if (!rawKnowledge.trim()) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'No meaningful knowledge content found in this session.\n\n' +
                      'Tips for better KT sessions:\n' +
                      '• Share specific technical details, processes, or insights\n' +
                      '• Explain implementation approaches, configurations, or workflows\n' +
                      '• Provide concrete examples, code snippets, or step-by-step procedures\n' +
                      '• Avoid finishing the session too early - add substantial content first\n\n' +
                      'Try starting a new session with "/brain kt" and sharing more detailed knowledge.',
              },
              Date.now(),
            );
            return;
          }

          // Format as technical documentation
          const technicalDoc = formatAsTechnicalDoc(rawKnowledge, terraUsername);

          // Create filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `kt_${terraUsername}_${timestamp}.md`;
          const uploadFileName = `kt_${terraUsername}_${timestamp}.txt`;

                     // Ensure .kt directory exists
           const projectRoot = context.services.config?.getWorkingDir() || process.cwd();
          const ktDir = await ensureKTDirectory(projectRoot);
          const localFilePath = path.join(ktDir, fileName);

          // Save file locally
          await fs.writeFile(localFilePath, technicalDoc, 'utf8');

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `📝 KT session completed! Saving documentation to ".kt/${fileName}"...`,
            },
            Date.now(),
          );

          // Upload to vector database
          const userCollectionName = `${terraUsername}_kt`;
          const fileBuffer = Buffer.from(technicalDoc, 'utf8');
          const result = await uploadDocument(fileBuffer, uploadFileName, userCollectionName, terraApiKey);

          if (result.success) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `✅ Successfully saved KT documentation:\n` +
                      `   📁 Local: .kt/${fileName}\n` +
                      `   🧠 Brain: Collection "${userCollectionName}"\n\n` +
                      `The knowledge you shared has been documented and can now be searched by other team members.`,
              },
              Date.now(),
            );
          } else {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `⚠️ Documentation saved locally but failed to upload to brain: ${result.error || 'Unknown error'}\n` +
                      `Local file: .kt/${fileName}`,
              },
              Date.now(),
            );
          }

          // Clear KT session state
          currentKTSession = null;

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error saving KT session: ${errorMessage}`,
            },
            Date.now(),
          );
          // Clear KT session state on error
          currentKTSession = null;
        }
      },
    },
    {
      name: 'cancel',
      description: 'Cancel the current KT session without saving to your brain.',
      kind: CommandKind.BUILT_IN,
      action: async (context, _args) => {
        if (!currentKTSession || !currentKTSession.isActive) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: 'No active KT session to cancel.',
            },
            Date.now(),
          );
          return;
        }

        // Clear KT session state
        currentKTSession = null;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: '❌ KT session cancelled. No knowledge was saved.\n\n' +
                  'You can start a new KT session anytime with `/brain kt`.',
          },
          Date.now(),
        );
      },
    },
  ],
};
