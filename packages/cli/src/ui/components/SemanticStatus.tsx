/**
 * Semantic Status Component
 * Shows semantic analysis status in the UI
 */

import React from 'react';
import { Box, Text } from 'ink';
import { isSemanticAvailable } from '../../semantic/index.js';

interface SemanticStatusProps {
  showStatus?: boolean;
}

export const SemanticStatus: React.FC<SemanticStatusProps> = ({
  showStatus = false,
}) => {
  if (!showStatus) {
    return null;
  }

  const isAvailable = isSemanticAvailable();

  return (
    <Box marginLeft={1}>
      <Text color={isAvailable ? 'green' : 'gray'}>
        {isAvailable ? '🧠' : '⚪'} Semantic
      </Text>
    </Box>
  );
};
