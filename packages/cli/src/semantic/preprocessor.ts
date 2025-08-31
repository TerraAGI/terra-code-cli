/**
 * Basic Code Preprocessor
 * Handles file chunking and simple AST parsing
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { CodeChunk } from './index.js';

export class CodePreprocessor {
  private supportedExtensions: string[];

  constructor(
    supportedExtensions: string[] = [
      '.js',
      '.ts',
      '.py',
      '.java',
      '.cpp',
      '.go',
      '.rs',
    ],
  ) {
    this.supportedExtensions = supportedExtensions;
  }

  async discoverFiles(projectPath: string): Promise<string[]> {
    const patterns = this.supportedExtensions.map((ext) => `**/*${ext}`);
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        absolute: true,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
        ],
      });
      files.push(...matches);
    }

    return files;
  }

  async processFile(
    filePath: string,
    maxChunkSize: number = 1000,
    overlapSize: number = 100,
  ): Promise<CodeChunk[]> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const language = this.detectLanguage(filePath);

    return this.chunkFile(
      content,
      filePath,
      language,
      maxChunkSize,
      overlapSize,
    );
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.go': 'go',
      '.rs': 'rust',
    };
    return languageMap[ext] || 'unknown';
  }

  private chunkFile(
    content: string,
    filePath: string,
    language: string,
    maxChunkSize: number,
    overlapSize: number,
  ): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];

    for (let i = 0; i < lines.length; i += maxChunkSize - overlapSize) {
      const chunkLines = lines.slice(
        i,
        Math.min(i + maxChunkSize, lines.length),
      );
      const chunkContent = chunkLines.join('\n');

      if (chunkContent.trim().length === 0) continue;

      chunks.push({
        id: `${filePath}_${i}`,
        content: chunkContent,
        filePath,
        startLine: i + 1,
        endLine: Math.min(i + maxChunkSize, lines.length),
        language,
        metadata: {
          functionName: this.extractFunctionName(chunkContent, language),
          className: this.extractClassName(chunkContent, language),
          complexity: this.calculateComplexity(chunkContent),
          dependencies: this.extractDependencies(chunkContent, language),
        },
      });
    }

    return chunks;
  }

  private extractFunctionName(
    content: string,
    language: string,
  ): string | undefined {
    // Simple regex-based function extraction
    const patterns: Record<string, RegExp> = {
      javascript: /function\s+(\w+)\s*\(/,
      typescript: /function\s+(\w+)\s*\(/,
      python: /def\s+(\w+)\s*\(/,
      java: /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
      cpp: /(?:void|int|string|bool|auto)\s+(\w+)\s*\(/,
      go: /func\s+(\w+)\s*\(/,
      rust: /fn\s+(\w+)\s*\(/,
    };

    const pattern = patterns[language];
    if (pattern) {
      const match = content.match(pattern);
      return match ? match[1] : undefined;
    }
    return undefined;
  }

  private extractClassName(
    content: string,
    language: string,
  ): string | undefined {
    // Simple regex-based class extraction
    const patterns: Record<string, RegExp> = {
      javascript: /class\s+(\w+)/,
      typescript: /class\s+(\w+)/,
      python: /class\s+(\w+)/,
      java: /class\s+(\w+)/,
      cpp: /class\s+(\w+)/,
      go: /type\s+(\w+)\s+struct/,
      rust: /struct\s+(\w+)/,
    };

    const pattern = patterns[language];
    if (pattern) {
      const match = content.match(pattern);
      return match ? match[1] : undefined;
    }
    return undefined;
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on lines and control structures
    const lines = content.split('\n');
    let complexity = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('if ') || trimmed.includes('else')) complexity += 1;
      if (trimmed.includes('for ') || trimmed.includes('while '))
        complexity += 2;
      if (trimmed.includes('switch ') || trimmed.includes('case '))
        complexity += 1;
      if (trimmed.includes('try ') || trimmed.includes('catch '))
        complexity += 1;
    }

    return Math.min(complexity, 10); // Cap at 10
  }

  private extractDependencies(content: string, language: string): string[] {
    const dependencies: string[] = [];

    // Extract import/require statements
    const importPatterns: Record<string, RegExp[]> = {
      javascript: [
        /import\s+.*?from\s+['"]([^'"]+)['"]/g,
        /require\s*\(\s*['"]([^'"]+)['"]/g,
      ],
      typescript: [
        /import\s+.*?from\s+['"]([^'"]+)['"]/g,
        /require\s*\(\s*['"]([^'"]+)['"]/g,
      ],
      python: [/import\s+(\w+)/g, /from\s+(\w+)\s+import/g],
      java: [/import\s+([\w.]+)/g],
      cpp: [/#include\s+[<"]([^>"]+)[>"]/g],
      go: [/import\s+['"]([^'"]+)['"]/g],
      rust: [/use\s+([\w:]+)/g],
    };

    const patterns = importPatterns[language] || [];
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          dependencies.push(match[1]);
        }
      }
    }

    return dependencies.slice(0, 10); // Limit to 10 dependencies
  }
}
