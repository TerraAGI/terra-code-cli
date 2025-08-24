/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@qwen-code/qwen-code-core';
import { loadEnvironment } from './settings.js';

export const validateAuthMethod = (authMethod: string): string | null => {
  loadEnvironment();
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.CLOUD_SHELL
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    if (!process.env.GEMINI_API_KEY) {
      return 'GEMINI_API_KEY environment variable not found. Add that to your environment and try again (no reload needed if using .env)!';
    }
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    const hasVertexProjectLocationConfig =
      !!process.env.GOOGLE_CLOUD_PROJECT && !!process.env.GOOGLE_CLOUD_LOCATION;
    const hasGoogleApiKey = !!process.env.GOOGLE_API_KEY;
    if (!hasVertexProjectLocationConfig && !hasGoogleApiKey) {
      return (
        'When using Vertex AI, you must specify either:\n' +
        '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
        '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  if (authMethod === AuthType.USE_OPENAI) {
    if (!process.env.OPENAI_API_KEY) {
      return 'OPENAI_API_KEY environment variable not found. You can enter it interactively or add it to your .env file.';
    }
    return null;
  }

  if (authMethod === AuthType.QWEN_OAUTH) {
    // Qwen OAuth doesn't require any environment variables for basic setup
    // The OAuth flow will handle authentication
    return null;
  }

  if (authMethod === AuthType.TERRA_VECTOR) {
    // Terra Vector requires API key and username
    // Check both environment variables and settings
    const apiKey = process.env.TERRA_API_KEY;
    const username = process.env.TERRA_USERNAME;
    
    if (!apiKey || !username) {
      return 'TERRA_API_KEY and TERRA_USERNAME not found. Use /auth terra register to set up Terra credentials.';
    }
    return null;
  }

  return 'Invalid auth method selected.';
};

export const setOpenAIApiKey = (apiKey: string): void => {
  process.env.OPENAI_API_KEY = apiKey;
};

export const setOpenAIBaseUrl = (baseUrl: string): void => {
  process.env.OPENAI_BASE_URL = baseUrl;
};

export const setOpenAIModel = (model: string): void => {
  process.env.OPENAI_MODEL = model;
};

export const getTerraApiKey = (): string | undefined => process.env.TERRA_API_KEY;

export const getTerraUsername = (): string | undefined => process.env.TERRA_USERNAME;

export const setTerraCredentials = (apiKey: string, username: string): void => {
  process.env.TERRA_API_KEY = apiKey;
  process.env.TERRA_USERNAME = username;
};

/**
 * Automatically registers Terra credentials after successful Qwen/OpenAI authentication
 * This happens silently in the background to provide seamless vector DB access
 */
export async function autoRegisterTerraCredentials(settings?: { setValue?: (scope: string, key: string, value: string) => void; terraApiKey?: string; terraUsername?: string }): Promise<{ success: boolean; message: string }> {
  try {
    // Check if Terra credentials already exist
    let terraApiKey = process.env.TERRA_API_KEY;
    let terraUsername = process.env.TERRA_USERNAME;
    
    // If not in env, try to get from settings
    if ((!terraApiKey || !terraUsername) && settings) {
      terraApiKey = terraApiKey || settings.terraApiKey;
      terraUsername = terraUsername || settings.terraUsername;
    }
    
    // If we already have Terra credentials, skip registration
    if (terraApiKey && terraUsername) {
      return { 
        success: true, 
        message: 'Terra credentials already available' 
      };
    }
    
    // Perform Terra registration
    const response = await fetch('http://13.61.2.7:8000/v1/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      return { 
        success: false, 
        message: `Terra registration failed: ${response.status} ${response.statusText}` 
      };
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data.api_key || !data.data.username) {
      return { 
        success: false, 
        message: 'Invalid Terra registration response' 
      };
    }
    
    // Store credentials in environment
    process.env.TERRA_API_KEY = data.data.api_key;
    process.env.TERRA_USERNAME = data.data.username;
    
    // Store credentials in settings if available
    if (settings && settings.setValue) {
      settings.setValue('User', 'terraApiKey', data.data.api_key);
      settings.setValue('User', 'terraUsername', data.data.username);
    }
    
    return { 
      success: true, 
      message: `TerraAGI vector search activated with username: ${data.data.username}` 
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      message: `Terra registration error: ${errorMessage}` 
    };
  }
}
