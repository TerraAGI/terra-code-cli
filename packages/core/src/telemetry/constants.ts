/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const SERVICE_NAME = 'terra-code';

export const EVENT_USER_PROMPT = 'terra-code.user_prompt';
export const EVENT_TOOL_CALL = 'terra-code.tool_call';
export const EVENT_API_REQUEST = 'terra-code.api_request';
export const EVENT_API_ERROR = 'terra-code.api_error';
export const EVENT_API_RESPONSE = 'terra-code.api_response';
export const EVENT_CLI_CONFIG = 'terra-code.config';
export const EVENT_FLASH_FALLBACK = 'terra-code.flash_fallback';
export const EVENT_NEXT_SPEAKER_CHECK = 'terra-code.next_speaker_check';
export const EVENT_SLASH_COMMAND = 'terra-code.slash_command';
export const EVENT_IDE_CONNECTION = 'terra-code.ide_connection';

export const METRIC_TOOL_CALL_COUNT = 'terra-code.tool.call.count';
export const METRIC_TOOL_CALL_LATENCY = 'terra-code.tool.call.latency';
export const METRIC_API_REQUEST_COUNT = 'terra-code.api.request.count';
export const METRIC_API_REQUEST_LATENCY = 'terra-code.api.request.latency';
export const METRIC_TOKEN_USAGE = 'terra-code.token.usage';
export const METRIC_SESSION_COUNT = 'terra-code.session.count';
export const METRIC_FILE_OPERATION_COUNT = 'terra-code.file.operation.count';
