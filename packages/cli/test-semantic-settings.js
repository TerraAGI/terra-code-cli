#!/usr/bin/env node

/**
 * Test semantic settings loading
 */

import { loadSettings } from './dist/src/config/settings.js';

console.log('🧪 Testing Semantic Settings Loading...\n');

try {
  const settings = await loadSettings();
  console.log('Settings loaded successfully');
  console.log(
    'Semantic settings:',
    JSON.stringify(settings.merged.semantic, null, 2),
  );
  console.log('Semantic enabled:', settings.merged.semantic?.enabled);

  if (settings.merged.semantic?.enabled) {
    console.log('✅ Semantic is enabled!');
  } else {
    console.log('❌ Semantic is disabled');
  }
} catch (error) {
  console.error('❌ Error loading settings:', error);
}

console.log('\n🎯 Test Complete!');
