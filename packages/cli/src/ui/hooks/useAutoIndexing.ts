/**
 * Auto-Indexing Hook
 * Manages auto-indexing detection and user interaction
 */

import { useState, useEffect, useCallback } from 'react';
import { AutoIndexingService } from '../../semantic/autoIndexingService.js';
import { BackgroundIndexer, SemanticConfig } from '../../semantic/index.js';

export interface AutoIndexingState {
  showDialog: boolean;
  isIndexing: boolean;
  projectPath: string;
  indexer: BackgroundIndexer | null;
  indexingStatus: 'indexing' | 'completed' | 'failed' | null;
}

export function useAutoIndexing(config: SemanticConfig | null) {
  const [state, setState] = useState<AutoIndexingState>({
    showDialog: false,
    isIndexing: false,
    projectPath: '',
    indexer: null,
    indexingStatus: null,
  });

  const autoIndexingService = new AutoIndexingService();

  const checkForAutoIndexing = useCallback(async () => {
    if (!config?.enabled) {
      return;
    }

    const projectPath = process.cwd();
    const shouldPrompt = await autoIndexingService.shouldPromptForIndexing(projectPath);
    
    if (shouldPrompt) {
      setState(prev => ({
        ...prev,
        showDialog: true,
        projectPath,
      }));
    } else {
      // Project is already indexed, show the indexed status
      setState(prev => ({
        ...prev,
        projectPath,
        indexingStatus: 'completed',
      }));
    }
  }, [config]);

  const startIndexing = useCallback(async () => {
    if (!config) return;

    try {
      // Set indexing status immediately
      setState(prev => ({
        ...prev,
        showDialog: false,
        isIndexing: true,
        indexingStatus: 'indexing',
      }));

      // Start background indexing (non-blocking)
      const indexer = await autoIndexingService.startBackgroundIndexing(
        state.projectPath,
        config
      );
      
      // Keep the indexer reference
      setState(prev => ({
        ...prev,
        indexer,
      }));
    } catch (error) {
      console.error('Failed to start indexing:', error);
      setState(prev => ({
        ...prev,
        showDialog: false,
        isIndexing: false,
        indexingStatus: 'failed',
      }));
    }
  }, [config, state.projectPath]);

  const skipIndexing = useCallback(() => {
    setState(prev => ({
      ...prev,
      showDialog: false,
    }));
  }, []);

  const disableAutoIndexing = useCallback(() => {
    autoIndexingService.disablePromptOnStartup();
    setState(prev => ({
      ...prev,
      showDialog: false,
    }));
  }, []);

  const onStatusUpdate = useCallback((status: 'indexing' | 'completed' | 'failed') => {
    setState(prev => ({
      ...prev,
      indexingStatus: status,
    }));
  }, []);

  const onIndexingComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isIndexing: false,
      indexer: null,
      indexingStatus: 'completed',
    }));
    
    // Keep the completed status permanently - don't clear it
  }, []);

  const onIndexingError = useCallback((error: string) => {
    console.error('Indexing error:', error);
    setState(prev => ({
      ...prev,
      isIndexing: false,
      indexer: null,
      indexingStatus: 'failed',
    }));
    
    // Clear the failed status after 5 seconds
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        indexingStatus: null,
      }));
    }, 5000);
  }, []);

  // Check for auto-indexing on mount
  useEffect(() => {
    checkForAutoIndexing();
  }, [checkForAutoIndexing]);

  return {
    ...state,
    startIndexing,
    skipIndexing,
    disableAutoIndexing,
    onIndexingComplete,
    onIndexingError,
    onStatusUpdate,
  };
}
