/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand } from './types.js';
import { semanticCommands } from '../../commands/semantic.js';

export const semanticCommand: SlashCommand = {
  kind: CommandKind.BUILT_IN,
  name: 'semantic',
  description: 'Semantic code analysis and search commands',
  action: async (context, args) => {
    // Parse subcommand
    const parts = args.trim().split(' ');
    const subcommand = parts[0];
    const subArgs = parts.slice(1).join(' ');

    try {
      switch (subcommand) {
        case 'status':
          return {
            type: 'message',
            messageType: 'info',
            content: await semanticCommands.status(),
          };

        case 'index':
          if (!subArgs) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Usage: /semantic:index <project-path>',
            };
          }
          return {
            type: 'message',
            messageType: 'info',
            content: await semanticCommands.index(subArgs),
          };

        case 'search':
          if (!subArgs) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Usage: /semantic:search <query>',
            };
          }
          return {
            type: 'message',
            messageType: 'info',
            content: await semanticCommands.search(subArgs),
          };

        default: {
          // Add fuzzy matching for common typos
          const suggestions = ['status', 'index', 'search'];
          const bestMatch = suggestions.find(s => 
            s.startsWith(subcommand) || 
            subcommand.startsWith(s) ||
            s.includes(subcommand) ||
            subcommand.includes(s)
          );
          
          if (bestMatch && bestMatch !== subcommand) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Did you mean "/semantic ${bestMatch}"? Available commands: status, index, search`,
            };
          }
          
          return {
            type: 'message',
            messageType: 'error',
            content: `Unknown semantic subcommand: ${subcommand}. Available commands: status, index, search`,
          };
        }
      }
    } catch (error) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Semantic command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
