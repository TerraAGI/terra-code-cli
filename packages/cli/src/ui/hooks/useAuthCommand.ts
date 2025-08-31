/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import {
  AuthType,
  Config,
  clearCachedCredentialFile,
  getErrorMessage,
} from '@terra-code/terra-code-core';
import { autoRegisterTerraCredentials } from '../../config/auth.js';
import { runExitCleanup } from '../../utils/cleanup.js';

export const useAuthCommand = (
  settings: LoadedSettings,
  setAuthError: (error: string | null) => void,
  config: Config,
) => {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(
    settings.merged.selectedAuthType === undefined,
  );

  const openAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(true);
  }, []);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const authFlow = async () => {
      const authType = settings.merged.selectedAuthType;
      if (isAuthDialogOpen || !authType) {
        return;
      }

      try {
        setIsAuthenticating(true);
        await config.refreshAuth(authType);
        console.log(`Authenticated via "${authType}".`);

        // Auto-register Terra credentials after successful authentication
        if (
          authType === AuthType.QWEN_OAUTH ||
          authType === AuthType.USE_OPENAI ||
          authType === AuthType.USE_GEMINI
        ) {
          try {
            const terraResult = await autoRegisterTerraCredentials({
              setValue: (scope: string, key: string, value: string) => {
                if (key === 'terraApiKey' || key === 'terraUsername') {
                  settings.setValue(scope as SettingScope, key, value);
                }
              },
              terraApiKey: settings.merged.terraApiKey,
              terraUsername: settings.merged.terraUsername,
            });

            if (terraResult.success) {
              console.log(
                `Successfully authenticated for ${authType} as well as TerraAGI - ${terraResult.message}`,
              );
            } else {
              console.log(
                `Authenticated via "${authType}". TerraAGI registration skipped: ${terraResult.message}`,
              );
            }
          } catch (_terraError) {
            // Don't fail the main auth flow if Terra registration fails
            console.log(
              `Authenticated via "${authType}". TerraAGI registration failed silently.`,
            );
          }
        }
      } catch (e) {
        setAuthError(`Failed to login. Message: ${getErrorMessage(e)}`);
        openAuthDialog();
      } finally {
        setIsAuthenticating(false);
      }
    };

    void authFlow();
  }, [isAuthDialogOpen, settings, config, setAuthError, openAuthDialog]);

  const handleAuthSelect = useCallback(
    async (authType: AuthType | undefined, scope: SettingScope) => {
      if (authType) {
        await clearCachedCredentialFile();

        settings.setValue(scope, 'selectedAuthType', authType);
        if (
          authType === AuthType.LOGIN_WITH_GOOGLE &&
          config.isBrowserLaunchSuppressed()
        ) {
          runExitCleanup();
          console.log(
            `
----------------------------------------------------------------
Logging in with Google... Please restart Gemini CLI to continue.
----------------------------------------------------------------
            `,
          );
          process.exit(0);
        }
      }
      setIsAuthDialogOpen(false);
      setAuthError(null);
    },
    [settings, setAuthError, config],
  );

  const cancelAuthentication = useCallback(() => {
    setIsAuthenticating(false);
  }, []);

  return {
    isAuthDialogOpen,
    openAuthDialog,
    handleAuthSelect,
    isAuthenticating,
    cancelAuthentication,
  };
};
