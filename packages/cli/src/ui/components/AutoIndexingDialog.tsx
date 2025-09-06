/**
 * Auto-Indexing Confirmation Dialog
 * Prompts user to start indexing when Terra opens in a new directory
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';

interface AutoIndexingDialogProps {
  projectPath: string;
  onConfirm: () => void;
  onSkip: () => void;
}

export const AutoIndexingDialog: React.FC<AutoIndexingDialogProps> = ({
  projectPath,
  onConfirm,
  onSkip,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('yes');

  const options = [
    { value: 'yes', label: 'Yes, index this directory for semantic search' },
    { value: 'skip', label: 'Skip indexing for now' },
  ];

  const handleSelect = (value: string) => {
    setSelectedOption(value);
    // Auto-confirm when an option is selected
    switch (value) {
      case 'yes':
        onConfirm();
        break;
      case 'skip':
        onSkip();
        break;
    }
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text color="blue" bold>
          🔍 Semantic Search Setup
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text>
          Index you codebase to make code analysis faster.
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Directory: {projectPath}
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text bold>
          Would you like to index this directory?
        </Text>
      </Box>

      <RadioButtonSelect
        items={options}
        initialIndex={0}
        onSelect={(value: string) => handleSelect(value)}
        onHighlight={(value: string) => setSelectedOption(value)}
      />
      
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press Enter to confirm, or use arrow keys to select
        </Text>
      </Box>
    </Box>
  );
};
