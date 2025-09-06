/**
 * Simple Progress Monitor for Background Indexing
 * Monitors progress and calls completion callbacks
 */

import { useEffect } from 'react';
import { ProgressTracker } from '../../semantic/progressTracker.js';

interface ProgressMonitorProps {
  projectPath: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onStatusUpdate?: (status: 'indexing' | 'completed' | 'failed') => void;
}

export const ProgressMonitor: React.FC<ProgressMonitorProps> = ({
  projectPath,
  onComplete,
  onError,
  onStatusUpdate,
}) => {
  useEffect(() => {
    let isMounted = true;

    const pollProgress = async () => {
      if (!isMounted) return;
      
      try {
        const currentProgress = await ProgressTracker.getProgressForProject(projectPath);
        
        if (currentProgress && isMounted) {
          // Update status based on progress
          if (currentProgress.status === 'running') {
            onStatusUpdate?.('indexing');
          } else if (currentProgress.status === 'completed') {
            console.log('ProgressMonitor: detected completion');
            onStatusUpdate?.('completed');
            if (isMounted) {
              onComplete?.();
            }
          } else if (currentProgress.status === 'failed') {
            console.log('ProgressMonitor: detected failure');
            onStatusUpdate?.('failed');
            if (isMounted) {
              onError?.(currentProgress.error || 'Unknown error');
            }
          }
        } else {
          // No progress file exists yet, but we're in indexing mode
          // This means indexing just started and hasn't created the progress file yet
          onStatusUpdate?.('indexing');
        }
      } catch (error) {
        console.error('Failed to poll progress:', error);
      }
    };

    // Start polling immediately
    pollProgress();
    
    // Poll more frequently initially (every 100ms) to catch quick completions
    const interval = setInterval(pollProgress, 100);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [projectPath, onComplete, onError, onStatusUpdate]);

  // This component doesn't render anything
  return null;
};
