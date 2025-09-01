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

    let content;

    if (subcommand) {
      switch (subcommand) {
        case 'search': {
          if (!subArgs) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Usage: /semantic:search <query>',
            };
          }
          content = await semanticCommands.search(subArgs);
          break;
        }
        case 'index': {
          if (!subArgs) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Usage: /semantic:index <project-path>',
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
          const suggestions = ['status', 'index', 'search'];
          const bestMatch = suggestions.find(s => s.startsWith(subcommand)) || suggestions[0];
          content = `Did you mean "/semantic ${bestMatch}"? Available commands: status, index, search`;
        }
      }
    } else {
      content = `Unknown semantic subcommand: ${subcommand}. Available commands: status, index, search`;
    }

    return {
      type: 'message',
      messageType: 'info',
      content,
    };
  },
};
