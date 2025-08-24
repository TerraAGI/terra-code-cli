/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const cliPackageJson = JSON.parse(
  readFileSync(join(__dirname, 'packages/cli/package.json'), 'utf8'),
);

const corePackageJson = JSON.parse(
  readFileSync(join(__dirname, 'packages/core/package.json'), 'utf8'),
);

const cliVersion = cliPackageJson.version;
const coreVersion = corePackageJson.version;

if (cliVersion !== coreVersion) {
  throw new Error(
    `Version mismatch: CLI version ${cliVersion} != Core version ${coreVersion}`,
  );
}

const result = await esbuild.build({
  entryPoints: [join(__dirname, 'packages/cli/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'bundle/terra.js',
  external: [
    // Only externalize core Node.js modules and a few problematic ones
    'fs',
    'path',
    'os',
    'crypto',
    'util',
    'stream',
    'events',
    'child_process',
    'http',
    'https',
    'url',
    'querystring',
    'zlib',
    'buffer',
    'process',
    'fsevents', // macOS-specific
    'esbuild'   // Build tool, not runtime
  ],
  define: {
    'process.env.CLI_VERSION': JSON.stringify(cliVersion),
    'process.env.CORE_VERSION': JSON.stringify(coreVersion),
  },
  banner: {
    js: `#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terra Code - AI-powered command-line workflow tool
 * Built from Gemini CLI and enhanced with Terra AGI services
 * 
 * Original Gemini CLI: https://github.com/google-gemini/gemini-cli
 * Qwen3-Coder models: https://github.com/QwenLM/Qwen3-Coder
 * 
 * Licensed under the Apache License, Version 2.0
 */`,
  },
  minify: false,
  sourcemap: false,
  format: 'esm',
  packages: 'bundle', // Bundle all npm packages
});

if (result.errors.length > 0) {
  console.error('Build failed:', result.errors);
  process.exit(1);
}

console.log('Build completed successfully!');
console.log(`CLI Version: ${cliVersion}`);
console.log(`Core Version: ${coreVersion}`);
console.log('Output: bundle/terra.js');
