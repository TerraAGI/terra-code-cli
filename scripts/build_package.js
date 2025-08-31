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

import { execSync } from 'child_process';
import { writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';

if (!process.cwd().includes('packages')) {
  console.error('must be invoked from a package directory');
  process.exit(1);
}

// build typescript files
execSync('tsc --build', { stdio: 'inherit' });

// copy .{md,json} files
execSync('node ../../scripts/copy_files.js', { stdio: 'inherit' });

// copy package.json to dist
copyFileSync('package.json', join('dist', 'package.json'));

// If this is the CLI package, copy the bundled file and create launcher
if (process.cwd().includes('cli')) {
  try {
    copyFileSync('../../bundle/terra.js', join('dist', 'terra.js'));
  } catch (_error) {
    console.warn(
      'Warning: Could not copy bundled file, bundle may not exist yet',
    );
  }
  
  // Create the terra-launcher.js file with correct working directory
  const launcherContent = `#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the CLI using the compiled JavaScript
const args = process.argv.slice(2);
const child = spawn(process.execPath, [join(__dirname, 'index.js'), ...args], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
});

child.on('exit', (code) => {
  process.exit(code);
});`;
  
  writeFileSync(join('dist', 'terra-launcher.js'), launcherContent);
  
  // Install dependencies in dist directory
  try {
    execSync('npm install --omit=dev', { stdio: 'inherit', cwd: join(process.cwd(), 'dist') });
  } catch (error) {
    console.warn('Warning: Could not install dependencies in dist directory:', error.message);
  }
}

// touch dist/.last_build
writeFileSync(join(process.cwd(), 'dist', '.last_build'), '');
process.exit(0);
