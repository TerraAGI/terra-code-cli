/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { type Config } from '@terra-code/terra-code-core';

interface TipsProps {
  config: Config;
}

export const Tips: React.FC<TipsProps> = ({ config }) => {
  const geminiMdFileCount = config.getGeminiMdFileCount();
  return (
    <Box flexDirection="column">
      <Text bold color={Colors.AccentPurple}>🧠 Terra&apos;s Superpowers:</Text>
      <Text color={Colors.Foreground}>
        1. <Text bold color={Colors.AccentPurple}>/brain kt</Text> - Interactive Knowledge Transfer sessions to capture team expertise
      </Text>
      <Text color={Colors.Foreground}>
        2. <Text bold color={Colors.AccentPurple}>/brain upload</Text> - Build your development brain with docs, code, and knowledge
      </Text>
      <Text color={Colors.Foreground}>
        3. <Text bold color={Colors.AccentPurple}>/brain remember</Text> - Store personal facts and preferences that persist across sessions
      </Text>
      <Text color={Colors.Foreground}>
        4. <Text bold color={Colors.AccentPurple}>Auto-enhanced responses</Text> - AI automatically uses your brain&apos;s knowledge
      </Text>
      
      <Box height={1} />
      
      <Text bold color={Colors.Foreground}>Getting Started:</Text>
      <Text color={Colors.Foreground}>
        • Ask questions, edit files, or run commands naturally
      </Text>
      <Text color={Colors.Foreground}>
        • Use <Text bold color={Colors.AccentPurple}>@filename</Text> to reference specific files
      </Text>
      {geminiMdFileCount === 0 && (
        <Text color={Colors.Foreground}>
          • Create{' '}
          <Text bold color={Colors.AccentPurple}>
            TERRA.md
          </Text>{' '}
          files to customize your AI interactions
        </Text>
      )}
      <Text color={Colors.Foreground}>
        • Type <Text bold color={Colors.AccentPurple}>/help</Text> for complete command reference
      </Text>
    </Box>
  );
};
