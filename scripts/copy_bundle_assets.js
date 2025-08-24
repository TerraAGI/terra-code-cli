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
// See the License for the specific license governing permissions and
// limitations under the License.

import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const bundleDir = join(root, 'bundle');

// Create the bundle directory if it doesn't exist
if (!existsSync(bundleDir)) {
  mkdirSync(bundleDir);
}

// Find and copy all .sb files from packages to the root of the bundle directory
const sbFiles = glob.sync('packages/**/*.sb', { cwd: root });
for (const file of sbFiles) {
  copyFileSync(join(root, file), join(bundleDir, basename(file)));
}

// Find and copy all .vsix files from packages to the root of the bundle directory
const vsixFiles = glob.sync('packages/vscode-ide-companion/*.vsix', {
  cwd: root,
});
for (const file of vsixFiles) {
  copyFileSync(join(root, file), join(bundleDir, basename(file)));
}

// Copy the bundled CLI to the CLI package dist directory
const cliDistDir = join(root, 'packages/cli/dist');
if (existsSync(join(bundleDir, 'terra.js'))) {
  copyFileSync(join(bundleDir, 'terra.js'), join(cliDistDir, 'terra.js'));
  console.log('Bundled CLI copied to packages/cli/dist/');
}

console.log('Assets copied to bundle/');
