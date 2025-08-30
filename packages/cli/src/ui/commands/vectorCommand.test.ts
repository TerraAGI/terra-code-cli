/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';

import {
  type CommandContext,
  SlashCommand,
} from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { GeminiClient } from '@terra-code/terra-code-core';
import { vectorCommand } from './vectorCommand.js';

// Mock the vector DB client functions
vi.mock('@terra-code/terra-code-core', () => ({
  uploadDocument: vi.fn(),
  searchDocuments: vi.fn(),
}));

describe('vectorCommand', () => {
  let mockContext: CommandContext;
  let mockGetChat: ReturnType<typeof vi.fn>;
  let mockGetHistory: ReturnType<typeof vi.fn>;

  const getSubCommand = (
    name: 'upload' | 'search' | 'intelligent' | 'kt' | 'remember',
  ): SlashCommand => {
    const subCommand = vectorCommand.subCommands?.find(
      (cmd) => cmd.name === name,
    );
    if (!subCommand) {
      throw new Error(`/brain ${name} command not found.`);
    }
    return subCommand;
  };

  const getKtSubCommand = (
    name: 'start' | 'finish' | 'cancel',
  ): SlashCommand => {
    const ktCommand = vectorCommand.subCommands?.find(
      (cmd) => cmd.name === 'kt',
    );
    if (!ktCommand) {
      throw new Error('/brain kt command not found.');
    }
    const subCommand = ktCommand.subCommands?.find(
      (cmd) => cmd.name === name,
    );
    if (!subCommand) {
      throw new Error(`/brain kt ${name} command not found.`);
    }
    return subCommand;
  };

  beforeEach(() => {
    // Set up environment variables for Terra credentials
    process.env.TERRA_API_KEY = 'test-api-key';
    process.env.TERRA_USERNAME = 'test-user';

    mockGetHistory = vi.fn().mockReturnValue([
      {
        role: 'user',
        parts: [{ text: 'Hello, I want to share some knowledge' }],
      },
      {
        role: 'model',
        parts: [{ text: 'Great! What knowledge would you like to share?' }],
      },
    ]);
    
    mockGetChat = vi.fn().mockResolvedValue({
      getHistory: mockGetHistory,
    });

    mockContext = createMockCommandContext({
      services: {
        config: {
          getGeminiClient: () =>
            ({
              getChat: mockGetChat,
            }) as unknown as GeminiClient,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TERRA_API_KEY;
    delete process.env.TERRA_USERNAME;
  });

  it('should have the correct main command definition', () => {
    expect(vectorCommand.name).toBe('brain');
    expect(vectorCommand.description).toBe('Manage your Terra knowledge brain - capture knowledge, upload documents, and remember facts.');
    expect(vectorCommand.subCommands).toHaveLength(3); // kt, upload, remember
  });

  describe('kt subcommand', () => {
    let ktCommand: SlashCommand;

    beforeEach(() => {
      ktCommand = getSubCommand('kt');
    });

    it('should have the correct definition', () => {
      expect(ktCommand.name).toBe('kt');
      expect(ktCommand.description).toBe('Knowledge Transfer session management.');
    });

    it('should have subcommands', () => {
      expect(ktCommand.subCommands).toBeDefined();
      expect(ktCommand.subCommands).toHaveLength(3); // start, finish, cancel
    });
  });

  describe('finish subcommand', () => {
    let finishCommand: SlashCommand;

    beforeEach(() => {
      finishCommand = getKtSubCommand('finish');
    });

    it('should have the correct definition', () => {
      expect(finishCommand.name).toBe('finish');
      expect(finishCommand.description).toBe('Complete the current KT session and save the documentation locally and upload to your brain.');
    });

    it('should check for Terra credentials', async () => {
      delete process.env.TERRA_API_KEY;
      delete process.env.TERRA_USERNAME;

      await finishCommand.action!(mockContext, '');
      
      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text: expect.stringContaining('Terra credentials not found'),
        }),
        expect.any(Number)
      );
    });
  });

  describe('cancel subcommand', () => {
    let cancelCommand: SlashCommand;

    beforeEach(() => {
      cancelCommand = getKtSubCommand('cancel');
    });

    it('should have the correct definition', () => {
      expect(cancelCommand.name).toBe('cancel');
      expect(cancelCommand.description).toBe('Cancel the current KT session without saving.');
    });

    it('should show cancellation message', async () => {
      await cancelCommand.action!(mockContext, '');
      
      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          text: expect.stringContaining('KT session cancelled'),
        }),
        expect.any(Number)
      );
    });
  });

  describe('remember subcommand', () => {
    let rememberCommand: SlashCommand;

    beforeEach(() => {
      rememberCommand = getSubCommand('remember');
    });

    it('should have the correct definition', () => {
      expect(rememberCommand.name).toBe('remember');
      expect(rememberCommand.description).toBe('Store a personal fact or preference that persists across sessions.');
    });

    it('should return tool action for valid input with default global scope', async () => {
      const result = await rememberCommand.action!(mockContext, 'I prefer TypeScript over JavaScript');
      
      expect(result).toEqual({
        type: 'tool',
        toolName: 'save_memory',
        toolArgs: { fact: 'I prefer TypeScript over JavaScript', scope: 'global' },
      });
    });

    it('should return tool action for valid input with explicit global scope', async () => {
      const result = await rememberCommand.action!(mockContext, 'I prefer TypeScript over JavaScript --scope global');
      
      expect(result).toEqual({
        type: 'tool',
        toolName: 'save_memory',
        toolArgs: { fact: 'I prefer TypeScript over JavaScript', scope: 'global' },
      });
    });

    it('should return tool action for valid input with project scope', async () => {
      const result = await rememberCommand.action!(mockContext, 'This project uses React --scope project');
      
      expect(result).toEqual({
        type: 'tool',
        toolName: 'save_memory',
        toolArgs: { fact: 'This project uses React', scope: 'project' },
      });
    });

    it('should show error for empty input', async () => {
      await rememberCommand.action!(mockContext, '');
      
      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text: expect.stringContaining('Usage: /brain remember'),
        }),
        expect.any(Number)
      );
    });

    it('should show error for empty memory after scope removal', async () => {
      await rememberCommand.action!(mockContext, '--scope global');
      
      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text: expect.stringContaining('Please provide a fact or preference to remember'),
        }),
        expect.any(Number)
      );
    });
  });
}); 