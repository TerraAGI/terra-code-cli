/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, OpenDialogActionReturn, SlashCommand } from './types.js';
import { SettingScope } from '../../config/settings.js';
import { AuthType } from '@terra-code/terra-code-core';

export const authCommand: SlashCommand = {
  name: 'auth',
  description: 'Change authentication method or manage credentials',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'qwen',
      description: 'Switch to Qwen OAuth (Free - 2,000 requests/day)',
      kind: CommandKind.BUILT_IN,
      action: async (context, _args) => {
        try {
          context.ui.addItem(
            {
              type: 'info',
              text: '🔄 Switching to Qwen OAuth authentication...',
            },
            Date.now(),
          );

          // Set Qwen OAuth as the selected auth type
          if (context.services.settings) {
            context.services.settings.setValue(SettingScope.User, 'selectedAuthType', AuthType.QWEN_OAUTH);
          }

          // Actually authenticate with Qwen OAuth
          if (context.services.config) {
            await context.services.config.refreshAuth(AuthType.QWEN_OAUTH);
            
            // Auto-register Terra credentials after successful authentication
            try {
              const { autoRegisterTerraCredentials } = await import('../../config/auth.js');
              const terraResult = await autoRegisterTerraCredentials({
                setValue: (scope: string, key: string, value: string) => {
                  if (context.services.settings && (key === 'terraApiKey' || key === 'terraUsername')) {
                    context.services.settings.setValue(scope as SettingScope, key, value);
                  }
                },
                terraApiKey: context.services.settings?.merged.terraApiKey,
                terraUsername: context.services.settings?.merged.terraUsername
              });
              
              if (terraResult.success) {
                context.ui.addItem(
                  {
                    type: 'info',
                    text: `🧠 TerraAGI Vector Search: ${terraResult.message}`,
                  },
                  Date.now(),
                );
              } else {
                context.ui.addItem(
                  {
                    type: 'info',
                    text: `⚠️ TerraAGI registration skipped: ${terraResult.message}`,
                  },
                  Date.now(),
                );
              }
            } catch (_terraError) {
              // Don't fail the main auth flow if Terra registration fails
              context.ui.addItem(
                {
                  type: 'info',
                  text: '⚠️ TerraAGI registration failed silently.',
                },
                Date.now(),
              );
            }
          }

          context.ui.addItem(
            {
              type: 'info',
              text: '✅ Successfully switched to Qwen OAuth!\n\n🚀 Benefits:\n• 2,000 free requests per day\n• 60 requests per minute\n• No API key management needed\n• Automatic credential refresh\n\n🧠 TerraAGI Vector Search: Automatically activated when you authenticate!',
            },
            Date.now(),
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.ui.addItem(
            {
              type: 'error',
              text: `Failed to switch to Qwen OAuth: ${errorMessage}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'openai',
      description: 'Switch to OpenAI-compatible API',
      kind: CommandKind.BUILT_IN,
      action: async (context, _args) => {
        try {
          context.ui.addItem(
            {
              type: 'info',
              text: '🔄 Switching to OpenAI-compatible API...',
            },
            Date.now(),
          );

          // Set OpenAI as the selected auth type
          if (context.services.settings) {
            context.services.settings.setValue(SettingScope.User, 'selectedAuthType', AuthType.USE_OPENAI);
          }

          // Validate OpenAI authentication requirements
          const { validateAuthMethod } = await import('../../config/auth.js');
          const validationError = validateAuthMethod(AuthType.USE_OPENAI);
          if (validationError) {
            context.ui.addItem(
              {
                type: 'error',
                text: `OpenAI authentication validation failed: ${validationError}`,
              },
              Date.now(),
            );
            return;
          }

          // Actually authenticate with OpenAI
          if (context.services.config) {
            await context.services.config.refreshAuth(AuthType.USE_OPENAI);
            
            // Auto-register Terra credentials after successful authentication
            try {
              const { autoRegisterTerraCredentials } = await import('../../config/auth.js');
              const terraResult = await autoRegisterTerraCredentials({
                setValue: (scope: string, key: string, value: string) => {
                  if (context.services.settings && (key === 'terraApiKey' || key === 'terraUsername')) {
                    context.services.settings.setValue(scope as SettingScope, key, value);
                  }
                },
                terraApiKey: context.services.settings?.merged.terraApiKey,
                terraUsername: context.services.settings?.merged.terraUsername
              });
              
              if (terraResult.success) {
                context.ui.addItem(
                  {
                    type: 'info',
                    text: `🧠 TerraAGI Vector Search: ${terraResult.message}`,
                  },
                  Date.now(),
                );
              } else {
                context.ui.addItem(
                  {
                    type: 'info',
                    text: `⚠️ TerraAGI registration skipped: ${terraResult.message}`,
                  },
                  Date.now(),
                );
              }
            } catch (_terraError) {
              // Don't fail the main auth flow if Terra registration fails
              context.ui.addItem(
                {
                  type: 'info',
                  text: '⚠️ TerraAGI registration failed silently.',
                },
                Date.now(),
              );
            }
          }

          context.ui.addItem(
            {
              type: 'info',
              text: '✅ Successfully switched to OpenAI-compatible API!\n\n📝 Setup required:\n• Set OPENAI_API_KEY environment variable\n• Optionally set OPENAI_BASE_URL and OPENAI_MODEL\n• Use .env file for persistent configuration\n\n💡 Free tier options:\n• Mainland China: ModelScope (2,000 free calls/day)\n• International: OpenRouter (1,000 free calls/day)\n\n🧠 TerraAGI Vector Search: Automatically activated when you authenticate!',
            },
            Date.now(),
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.ui.addItem(
            {
              type: 'error',
              text: `Failed to switch to OpenAI: ${errorMessage}`,
            },
            Date.now(),
          );
        }
      },
    },
    // Hidden from users - Gemini auth option removed for Terra branding
    // {
    //   name: 'gemini',
    //   description: 'Switch to Gemini API key',
    //   kind: CommandKind.BUILT_IN,
    //   action: async (context, _args) => {
    //     try {
    //       context.ui.addItem(
    //         {
    //           type: 'info',
    //           text: '🔄 Switching to Gemini API key authentication...',
    //         },
    //         Date.now(),
    //       );

    //       // Set Gemini as the selected auth type
    //       if (context.services.settings) {
    //         context.services.settings.setValue(SettingScope.User, 'selectedAuthType', AuthType.USE_GEMINI);
    //       }

    //       // Actually authenticate with Gemini
    //       if (context.services.config) {
    //         await context.services.config.refreshAuth(AuthType.USE_GEMINI);
            
    //         // Auto-register Terra credentials after successful authentication
    //         try {
    //           const { autoRegisterTerraCredentials } = await import('../../config/auth.js');
    //           const terraResult = await autoRegisterTerraCredentials({
    //             setValue: (scope: string, key: string, value: string) => {
    //               if (context.services.settings && (key === 'terraApiKey' || key === 'terraUsername')) {
    //                 context.services.settings.setValue(scope as SettingScope, key, value);
    //               }
    //             },
    //             terraApiKey: context.services.settings?.merged.terraApiKey,
    //             terraUsername: context.services.settings?.merged.terraUsername
    //           });
              
    //           if (terraResult.success) {
    //             context.ui.addItem(
    //               {
    //                 type: 'info',
    //                 text: `🧠 TerraAGI Vector Search: ${terraResult.message}`,
    //               },
    //               Date.now(),
    //             );
    //           } else {
    //             context.ui.addItem(
    //               {
    //                 type: 'info',
    //                 text: `⚠️ TerraAGI registration skipped: ${terraResult.message}`,
    //               },
    //               Date.now(),
    //             );
    //           }
    //         } catch (_terraError) {
    //           // Don't fail the main auth flow if Terra registration fails
    //           context.ui.addItem(
    //             {
    //               type: 'info',
    //               text: '⚠️ TerraAGI registration failed silently.',
    //             },
    //             Date.now(),
    //           );
    //         }
    //       }

    //       context.ui.addItem(
    //         {
    //           type: 'info',
    //           text: '✅ Successfully switched to Gemini API key!\n\n�� Setup required:\n• Set GEMINI_API_KEY environment variable\n• Use .env file for persistent configuration\n\n🧠 TerraAGI Vector Search: Automatically activated when you authenticate!',
    //         },
    //         Date.now(),
    //       );
    //     } catch (error) {
    //       const errorMessage = error instanceof Error ? error.message : String(error);
    //       context.ui.addItem(
    //         {
    //           type: 'error',
    //           text: `Failed to switch to Gemini: ${errorMessage}`,
    //         },
    //         Date.now(),
    //       );
    //     }
    //   },
    // },
    {
      name: 'status',
      description: 'Check current authentication status',
      kind: CommandKind.BUILT_IN,
      action: async (context, _args) => {
        try {
          let authType = 'Not set';

          if (context.services.settings) {
            authType = context.services.settings.merged.selectedAuthType || 'Not set';
          }

          // Check Terra credentials
          let terraApiKey = process.env.TERRA_API_KEY;
          let terraUsername = process.env.TERRA_USERNAME;
          
          if (!terraApiKey || !terraUsername) {
            if (context.services.settings) {
              terraApiKey = terraApiKey || context.services.settings.merged.terraApiKey;
              terraUsername = terraUsername || context.services.settings.merged.terraUsername;
            }
          }

          // Build status message
          let statusText = `🔐 Authentication Status:\n\n`;
          statusText += `📡 LLM Provider: ${authType}\n`;
          
          if (terraApiKey && terraUsername) {
            statusText += `✅ Terra Vector: Configured (${terraUsername})\n`;
          } else {
            statusText += `❌ Terra Vector: Not configured\n`;
          }

          // Add provider-specific details
          switch (authType) {
            case 'qwen-oauth':
              statusText += `\n🚀 Qwen OAuth (Free Tier):\n`;
              statusText += `• 2,000 requests per day\n`;
              statusText += `• 60 requests per minute\n`;
              statusText += `• No API key needed\n`;
              break;
            case 'openai':
              statusText += `\n🌐 OpenAI-compatible API:\n`;
              if (process.env.OPENAI_API_KEY) {
                statusText += `• API Key: Configured\n`;
                if (process.env.OPENAI_BASE_URL) {
                  statusText += `• Base URL: ${process.env.OPENAI_BASE_URL}\n`;
                }
                if (process.env.OPENAI_MODEL) {
                  statusText += `• Model: ${process.env.OPENAI_MODEL}\n`;
                }
              } else {
                statusText += `• API Key: Not configured\n`;
                statusText += `• Set OPENAI_API_KEY environment variable\n`;
              }
              break;
            case 'gemini-api-key':
              statusText += `\n🤖 Gemini API:\n`;
              if (process.env.GEMINI_API_KEY) {
                statusText += `• API Key: Configured\n`;
              } else {
                statusText += `• API Key: Not configured\n`;
                statusText += `• Set GEMINI_API_KEY environment variable\n`;
              }
              break;
            default:
              statusText += `\n❓ No authentication method selected\n`;
              statusText += `• Use /auth qwen for free Qwen OAuth\n`;
              statusText += `• Use /auth openai for OpenAI-compatible API\n`;
          }

          if (!terraApiKey || !terraUsername) {
            statusText += `\n💡 To enable Terra Vector features:\n`;
            statusText += `• TerraAGI credentials are automatically registered when you authenticate with Qwen/OpenAI\n`;
            statusText += `• If you need to manually manage Terra credentials, use the /vector commands\n`;
          }

          context.ui.addItem(
            {
              type: 'info',
              text: statusText,
            },
            Date.now(),
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.ui.addItem(
            {
              type: 'error',
              text: `Failed to check authentication status: ${errorMessage}`,
            },
            Date.now(),
          );
        }
      },
    },
  ],
  action: (_context, _args): OpenDialogActionReturn => ({
    type: 'dialog',
    dialog: 'auth',
  }),
};
