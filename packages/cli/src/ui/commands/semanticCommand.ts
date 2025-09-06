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
  description: 'Semantic code indexing and status commands',
  subCommands: [
    {
      name: 'index',
      description: 'Index a directory for semantic search',
      kind: CommandKind.BUILT_IN,
      action: async (context, args) => {
        if (!args.trim()) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /semantic index <project-path>',
          };
        }
        const content = await semanticCommands.index(args.trim());
        return {
          type: 'message',
          messageType: 'info',
          content,
        };
      },
    },
    {
      name: 'status',
      description: 'Check indexing status',
      kind: CommandKind.BUILT_IN,
      action: async () => {
        const content = await semanticCommands.status();
        return {
          type: 'message',
          messageType: 'info',
          content,
        };
      },
    },
  ],
  action: async (context, args) => {
    // Parse subcommand
    const parts = args.trim().split(' ');
    const subcommand = parts[0];
    const subArgs = parts.slice(1).join(' ');

    let content;

    if (subcommand) {
      switch (subcommand) {
        case 'index': {
          if (!subArgs) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Usage: /semantic index <project-path>',
            };
          }
          content = await semanticCommands.index(subArgs);
          break;
        }
        case 'status': {
          content = await semanticCommands.status();
          break;
        }
        default: {
          const suggestions = ['status', 'index'];
          const bestMatch = suggestions.find(s => s.startsWith(subcommand)) || suggestions[0];
          content = `Did you mean "/semantic ${bestMatch}"? Available commands: status, index`;
        }
      }
    } else {
      content = `Available semantic commands: status, index`;
    }

    return {
      type: 'message',
      messageType: 'info',
      content,
    };
  },
};
