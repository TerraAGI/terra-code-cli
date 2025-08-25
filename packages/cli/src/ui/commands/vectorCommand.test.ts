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
    name: 'upload' | 'search' | 'intelligent' | 'kt' | 'finish' | 'cancel',
  ): SlashCommand => {
    const subCommand = vectorCommand.subCommands?.find(
      (cmd) => cmd.name === name,
    );
    if (!subCommand) {
      throw new Error(`/vector ${name} command not found.`);
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
    expect(vectorCommand.name).toBe('vector');
    expect(vectorCommand.description).toBe('Commands for interacting with the vector database.');
    expect(vectorCommand.subCommands).toHaveLength(6); // upload, search, intelligent, kt, finish, cancel
  });

  describe('kt subcommand', () => {
    let ktCommand: SlashCommand;

    beforeEach(() => {
      ktCommand = getSubCommand('kt');
    });

    it('should have the correct definition', () => {
      expect(ktCommand.name).toBe('kt');
      expect(ktCommand.description).toBe('Interactive KT (Knowledge Transfer) collection from developers and team leads.');
    });

    it('should start KT session and return submit_prompt action', async () => {
      const result = await ktCommand.action!(mockContext, '');
      
      expect(result).toEqual({
        type: 'submit_prompt',
        content: expect.stringContaining('I\'m starting an interactive KT (Knowledge Transfer) collection session'),
      });
    });

    it('should check for Terra credentials', async () => {
      delete process.env.TERRA_API_KEY;
      delete process.env.TERRA_USERNAME;

      await ktCommand.action!(mockContext, '');
      
      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text: expect.stringContaining('Terra credentials not found'),
        }),
        expect.any(Number)
      );
    });
  });

  describe('finish subcommand', () => {
    let finishCommand: SlashCommand;

    beforeEach(() => {
      finishCommand = getSubCommand('finish');
    });

    it('should have the correct definition', () => {
      expect(finishCommand.name).toBe('finish');
      expect(finishCommand.description).toBe('Complete the current KT session and upload the conversation to the vector database.');
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
      cancelCommand = getSubCommand('cancel');
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
}); 