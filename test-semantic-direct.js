#!/usr/bin/env node

/**
 * Direct test of semantic module
 */

import {
  isSemanticAvailable,
  initializeSemantic,
} from './src/semantic/index.js';

console.log('🧪 Testing Semantic Module Directly...\n');

// Test semantic availability
console.log('1. Testing semantic availability...');
const available = isSemanticAvailable();
console.log(`   Semantic available: ${available}`);

// Test semantic initialization
console.log('\n2. Testing semantic initialization...');
try {
  const config = {
    enabled: true,
    voyageAI: {
      apiKey: 'pa-q5eT52RKvJPJayM7PHVBtoA2I7WAMuhBBPkvre5pGXQ',
      model: 'voyage-code-3',
      baseURL: 'https://api.voyageai.com/v1',
    },
    vectorDB: {
      dataDir: 'C:\\Users\\Prabhjot Singh\\.terra-code\\semantic',
      indexFile: 'index.faiss',
      metadataFile: 'metadata.json',
    },
    chunking: {
      maxChunkSize: 1000,
      overlapSize: 100,
      supportedExtensions: ['.js', '.ts', '.py', '.java', '.cpp', '.go', '.rs'],
    },
  };

  await initializeSemantic(config);
  console.log('   ✅ Semantic initialization successful');

  // Test availability again
  const availableAfter = isSemanticAvailable();
  console.log(`   Semantic available after init: ${availableAfter}`);
} catch (error) {
  console.log(`   ❌ Semantic initialization failed: ${error}`);
}

console.log('\n🎯 Test Complete!');
