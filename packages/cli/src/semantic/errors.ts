/**
 * Semantic Analysis Error Types
 * Provides specific error classes for semantic analysis operations
 */

export class SemanticError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'SemanticError';
  }
}

export class SemanticInitializationError extends SemanticError {
  constructor(
    message: string,
    readonly cause?: Error,
  ) {
    super(message, 'INITIALIZATION_ERROR');
    this.name = 'SemanticInitializationError';
  }
}

export class SemanticSearchError extends SemanticError {
  constructor(
    message: string,
    readonly query?: string,
  ) {
    super(message, 'SEARCH_ERROR');
    this.name = 'SemanticSearchError';
  }
}

export class SemanticIndexingError extends SemanticError {
  constructor(
    message: string,
    readonly filePath?: string,
  ) {
    super(message, 'INDEXING_ERROR');
    this.name = 'SemanticIndexingError';
  }
}

export class VoyageAIError extends SemanticError {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message, 'VOYAGEAI_ERROR');
    this.name = 'VoyageAIError';
  }
}

export class VectorDBError extends SemanticError {
  constructor(
    message: string,
    readonly operation?: string,
  ) {
    super(message, 'VECTOR_DB_ERROR');
    this.name = 'VectorDBError';
  }
}

export class SemanticConfigError extends SemanticError {
  constructor(
    message: string,
    readonly setting?: string,
  ) {
    super(message, 'CONFIG_ERROR');
    this.name = 'SemanticConfigError';
  }
}

// Error codes for easy identification
export const SEMANTIC_ERROR_CODES = {
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  SEARCH_ERROR: 'SEARCH_ERROR',
  INDEXING_ERROR: 'INDEXING_ERROR',
  VOYAGEAI_ERROR: 'VOYAGEAI_ERROR',
  VECTOR_DB_ERROR: 'VECTOR_DB_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

// Helper function to create user-friendly error messages
export function createUserFriendlyError(error: Error): string {
  if (error instanceof SemanticError) {
    switch (error.code) {
      case SEMANTIC_ERROR_CODES.INITIALIZATION_ERROR:
        return 'Failed to initialize semantic analysis. Please check your configuration.';
      case SEMANTIC_ERROR_CODES.SEARCH_ERROR:
        return 'Semantic search failed. Please try again with a different query.';
      case SEMANTIC_ERROR_CODES.INDEXING_ERROR:
        return 'Failed to index project files. Please check file permissions and try again.';
      case SEMANTIC_ERROR_CODES.VOYAGEAI_ERROR:
        return 'VoyageAI API error. Please check your API key and try again.';
      case SEMANTIC_ERROR_CODES.VECTOR_DB_ERROR:
        return 'Vector database error. Please try reindexing your project.';
      case SEMANTIC_ERROR_CODES.CONFIG_ERROR:
        return 'Configuration error. Please check your semantic settings.';
      case SEMANTIC_ERROR_CODES.NOT_AVAILABLE:
        return 'Semantic analysis is not available. Please enable it in settings.';
      case SEMANTIC_ERROR_CODES.INVALID_INPUT:
        return 'Invalid input provided. Please check your parameters.';
      default:
        return error.message;
    }
  }

  return error.message;
}

// Helper function to check if an error is semantic-related
export function isSemanticError(error: Error): error is SemanticError {
  return error instanceof SemanticError;
}
