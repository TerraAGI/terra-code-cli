/**
 * Semantic Module Tests
 * Basic unit tests for semantic functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodePreprocessor } from './preprocessor.js';
import { VoyageAIClient } from './embedding.js';
import { SearchEngine } from './search.js';
import { isSemanticAvailable, getSemanticEngine } from './index.js';

// Mock fetch for VoyageAI tests
global.fetch = vi.fn();

describe('Semantic Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CodePreprocessor', () => {
    it('should detect language correctly', () => {
      const preprocessor = new CodePreprocessor();

      expect(preprocessor['detectLanguage']('test.js')).toBe('javascript');
      expect(preprocessor['detectLanguage']('test.ts')).toBe('typescript');
      expect(preprocessor['detectLanguage']('test.py')).toBe('python');
      expect(preprocessor['detectLanguage']('test.java')).toBe('java');
      expect(preprocessor['detectLanguage']('test.cpp')).toBe('cpp');
      expect(preprocessor['detectLanguage']('test.go')).toBe('go');
      expect(preprocessor['detectLanguage']('test.rs')).toBe('rust');
      expect(preprocessor['detectLanguage']('test.unknown')).toBe('unknown');
    });

    it('should calculate complexity correctly', () => {
      const preprocessor = new CodePreprocessor();

      const simpleCode = 'function test() { return true; }';
      const complexCode = `
        function complex() {
          if (condition) {
            for (let i = 0; i < 10; i++) {
              while (another) {
                try {
                  // do something
                } catch (error) {
                  // handle error
                }
              }
            }
          }
        }
      `;

      expect(preprocessor['calculateComplexity'](simpleCode)).toBe(1);
      expect(preprocessor['calculateComplexity'](complexCode)).toBe(10); // Capped at 10
    });

    it('should extract function names', () => {
      const preprocessor = new CodePreprocessor();

      const jsCode = 'function testFunction() { return true; }';
      const pyCode = 'def test_function(): return True';

      expect(preprocessor['extractFunctionName'](jsCode, 'javascript')).toBe(
        'testFunction',
      );
      expect(preprocessor['extractFunctionName'](pyCode, 'python')).toBe(
        'test_function',
      );
    });
  });

  describe('VoyageAIClient', () => {
    it('should create enriched text correctly', () => {
      const client = new VoyageAIClient({
        apiKey: 'test-key',
        model: 'voyage-code-2',
        baseURL: 'https://api.voyageai.com/v1',
      });

      const chunk = {
        id: 'test',
        content: 'function test() { return true; }',
        filePath: '/test/file.js',
        startLine: 1,
        endLine: 1,
        language: 'javascript',
        metadata: {
          functionName: 'test',
          className: undefined,
          complexity: 1,
          dependencies: ['lodash'],
        },
      };

      const enrichedText = client['createEnrichedText'](chunk);

      expect(enrichedText).toContain('=== CODE CHUNK ===');
      expect(enrichedText).toContain('Language: javascript');
      expect(enrichedText).toContain('Function: test');
      expect(enrichedText).toContain('function test() { return true; }');
    });

    it('should generate cache key correctly', () => {
      const client = new VoyageAIClient({
        apiKey: 'test-key',
        model: 'voyage-code-2',
        baseURL: 'https://api.voyageai.com/v1',
      });

      const chunk = {
        id: 'test',
        content: 'function test() { return true; }',
        filePath: '/test/file.js',
        startLine: 1,
        endLine: 1,
        language: 'javascript',
        metadata: {
          functionName: 'test',
          className: undefined,
          complexity: 1,
          dependencies: [],
        },
      };

      const cacheKey = client['generateCacheKey'](chunk);
      expect(cacheKey).toBeDefined();
      expect(typeof cacheKey).toBe('string');
      expect(cacheKey.length).toBe(32);
    });
  });

  describe('SearchEngine', () => {
    it('should understand queries correctly', async () => {
      const mockVoyageAIClient = {} as VoyageAIClient;
      const searchEngine = new SearchEngine(mockVoyageAIClient);

      const queryIntent = await searchEngine.understandQuery(
        'find authentication functions',
      );

      expect(queryIntent.originalQuery).toBe('find authentication functions');
      expect(queryIntent.programmingConcepts).toContain('authentication');
      expect(queryIntent.searchPatterns).toContain('find');
      expect(queryIntent.complexity).toBe('low');
    });

    it('should detect language context', async () => {
      const mockVoyageAIClient = {} as VoyageAIClient;
      const searchEngine = new SearchEngine(mockVoyageAIClient);

      const jsQuery = await searchEngine.understandQuery(
        'find JavaScript functions',
      );
      const pyQuery = await searchEngine.understandQuery(
        'Python class implementation',
      );

      expect(jsQuery.languageContext).toBe('javascript');
      expect(pyQuery.languageContext).toBe('python');
    });

    it('should rank results correctly', () => {
      const mockVoyageAIClient = {} as VoyageAIClient;
      const searchEngine = new SearchEngine(mockVoyageAIClient);

      const results = [
        {
          id: '1',
          similarity: 0.5,
          content: 'result1',
          filePath: '/test1.js',
          startLine: 1,
          endLine: 1,
          metadata: {
            functionName: 'test1',
            className: undefined,
            complexity: 1,
            dependencies: [],
          },
        },
        {
          id: '2',
          similarity: 0.9,
          content: 'result2',
          filePath: '/test2.js',
          startLine: 1,
          endLine: 1,
          metadata: {
            functionName: 'test2',
            className: undefined,
            complexity: 1,
            dependencies: [],
          },
        },
        {
          id: '3',
          similarity: 0.3,
          content: 'result3',
          filePath: '/test3.js',
          startLine: 1,
          endLine: 1,
          metadata: {
            functionName: 'test3',
            className: undefined,
            complexity: 1,
            dependencies: [],
          },
        },
      ];

      const ranked = searchEngine.rankResults(results, {});

      expect(ranked[0].similarity).toBe(0.9);
      expect(ranked[1].similarity).toBe(0.5);
      expect(ranked[2].similarity).toBe(0.3);
    });
  });

  describe('Semantic Module Index', () => {
    it('should return false when semantic is not available', () => {
      expect(isSemanticAvailable()).toBe(false);
    });

    it('should throw error when getting engine before initialization', async () => {
      await expect(getSemanticEngine()).rejects.toThrow(
        'Failed to load semantic engine',
      );
    });
  });
});
