#!/usr/bin/env node

/**
 * Test script to verify semantic features
 */

import { spawn } from 'child_process';
import { homedir } from 'os';
import * as path from 'path';
import * as fs from 'fs';

const SEMANTIC_DATA_DIR = path.join(homedir(), '.terra-code', 'semantic');

console.log('🧪 Testing Semantic Integration...\n');

// Check if semantic data directory exists
console.log('📁 Checking semantic data directory...');
if (fs.existsSync(SEMANTIC_DATA_DIR)) {
  console.log(`✅ Semantic data directory exists: ${SEMANTIC_DATA_DIR}`);
  const files = fs.readdirSync(SEMANTIC_DATA_DIR);
  console.log(`📄 Files in directory: ${files.join(', ')}`);
} else {
  console.log(
    `⚠️  Semantic data directory doesn't exist yet: ${SEMANTIC_DATA_DIR}`,
  );
  console.log(
    '   (This is normal - it will be created when you first use semantic features)',
  );
}

console.log('\n🔧 Testing Terra CLI semantic commands...');

// Test semantic status command
const terra = spawn('terra', ['--prompt', '/semantic:status'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let output = '';
let error = '';

terra.stdout.on('data', (data) => {
  output += data.toString();
});

terra.stderr.on('data', (data) => {
  error += data.toString();
});

terra.on('close', (code) => {
  console.log(`\n📊 Semantic Status Test Results:`);
  console.log(`Exit code: ${code}`);

  if (output) {
    console.log('✅ Output:');
    console.log(output);
  }

  if (error) {
    console.log('⚠️  Errors:');
    console.log(error);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Start Terra CLI: terra');
  console.log('2. Enable semantic features in settings: /settings');
  console.log('3. Add your VoyageAI API key');
  console.log('4. Test indexing: /semantic:index ./your-project');
  console.log('5. Test search: /semantic:search "your query"');

  console.log('\n📂 Data Storage Location:');
  console.log(`   ${SEMANTIC_DATA_DIR}`);
  console.log('   - metadata.json: Code chunk metadata');
  console.log('   - embeddings.json: Vector embeddings (simplified backend)');
  console.log('   - index.faiss: FAISS index file (if using FAISS backend)');

  console.log('\n🔍 Verification Commands:');
  console.log(`   ls "${SEMANTIC_DATA_DIR}"`);
  console.log(`   cat "${path.join(SEMANTIC_DATA_DIR, 'metadata.json')}"`);
});
