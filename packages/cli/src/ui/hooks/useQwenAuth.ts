/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { LoadedSettings } from '../../config/settings.js';
import {
  AuthType,
  qwenOAuth2Events,
  QwenOAuth2Event,
} from '@terra-code/terra-code-core';

export interface DeviceAuthorizationInfo {
  verification_uri: string;
  verification_uri_complete: string;
  user_code: string;
  expires_in: number;
}

interface QwenAuthState {
  isQwenAuthenticating: boolean;
  deviceAuth: DeviceAuthorizationInfo | null;
  authStatus:
    | 'idle'
    | 'polling'
    | 'success'
    | 'error'
    | 'timeout'
    | 'rate_limit';
  authMessage: string | null;
  hasAttempted: boolean; // Track if we've already attempted auth
}

export const useQwenAuth = (
  settings: LoadedSettings,
  isAuthenticating: boolean,
) => {
  const [qwenAuthState, setQwenAuthState] = useState<QwenAuthState>({
    isQwenAuthenticating: false,
    deviceAuth: null,
    authStatus: 'idle',
    authMessage: null,
    hasAttempted: false,
  });

  const isQwenAuth = settings.merged.selectedAuthType === AuthType.QWEN_OAUTH;

  // Set up event listeners when authentication starts
  useEffect(() => {
    // If we've already attempted auth or it's not Qwen auth, don't start again
    if (!isQwenAuth || !isAuthenticating || qwenAuthState.hasAttempted) {
      return;
    }

    setQwenAuthState((prev) => ({
      ...prev,
      isQwenAuthenticating: true,
      authStatus: 'idle',
      hasAttempted: true, // Mark that we've attempted auth
    }));

    // Set up event listeners
    const handleDeviceAuth = (deviceAuth: DeviceAuthorizationInfo) => {
      setQwenAuthState((prev) => ({
        ...prev,
        deviceAuth: {
          verification_uri: deviceAuth.verification_uri,
          verification_uri_complete: deviceAuth.verification_uri_complete,
          user_code: deviceAuth.user_code,
          expires_in: deviceAuth.expires_in,
        },
        authStatus: 'polling',
      }));
    };

    const handleAuthProgress = (
      status: 'success' | 'error' | 'polling' | 'timeout' | 'rate_limit',
      message?: string,
    ) => {
      setQwenAuthState((prev) => ({
        ...prev,
        authStatus: status,
        authMessage: message || null,
        // Only stop authenticating on final states
        isQwenAuthenticating: !['success', 'error', 'timeout', 'rate_limit'].includes(status),
      }));
    };

    // Add event listeners
    qwenOAuth2Events.on(QwenOAuth2Event.AuthUri, handleDeviceAuth);
    qwenOAuth2Events.on(QwenOAuth2Event.AuthProgress, handleAuthProgress);

    // Cleanup event listeners when component unmounts or auth finishes
    return () => {
      qwenOAuth2Events.off(QwenOAuth2Event.AuthUri, handleDeviceAuth);
      qwenOAuth2Events.off(QwenOAuth2Event.AuthProgress, handleAuthProgress);
      
      // Cancel any ongoing auth when unmounting
      qwenOAuth2Events.emit(QwenOAuth2Event.AuthCancel);
    };
  }, [isQwenAuth, isAuthenticating, qwenAuthState.hasAttempted]);

  // Reset Qwen auth state when auth type changes
  useEffect(() => {
    if (!isQwenAuth) {
      setQwenAuthState({
        isQwenAuthenticating: false,
        deviceAuth: null,
        authStatus: 'idle',
        authMessage: null,
        hasAttempted: false, // Reset attempt tracking when auth type changes
      });
    }
  }, [isQwenAuth]);

  const cancelQwenAuth = useCallback(() => {
    // Emit cancel event to stop polling
    qwenOAuth2Events.emit(QwenOAuth2Event.AuthCancel);

    setQwenAuthState({
      isQwenAuthenticating: false,
      deviceAuth: null,
      authStatus: 'idle',
      authMessage: null,
      hasAttempted: true, // Keep track that we attempted auth
    });
  }, []);

  return {
    ...qwenAuthState,
    isQwenAuth,
    cancelQwenAuth,
  };
};
