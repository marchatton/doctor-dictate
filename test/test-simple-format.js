#!/usr/bin/env node

/**
 * Simple test to understand LLM output behavior
 */

const { OllamaFormatter } = require('../src/services/formatting/ollama-formatter');

async function testSimple() {
  console.log('\n🧪 SIMPLE FORMAT TEST\n');

  const formatter = new OllamaFormatter({
    model: 'llama3.2:latest',
    temperature: 0.1
  });

  const available = await formatter.isOllamaAvailable();
  if (!available) {
    console.error('❌ Ollama is not available');
    process.exit(1);
  }

  // Very simple test case
  const input = `identification patient is john smith adhd current meds lexapro 10mg`;

  console.log('📝 Input:', input);
  console.log('\nCalling formatter...\n');

  const result = await formatter.formatMedicalDictation(input);

  console.log('✅ Success:', result.success);
  console.log('\n📄 FULL OUTPUT:');
  console.log('=' .repeat(60));
  console.log(result.formatted);
  console.log('=' .repeat(60));

  // Check what we got
  const output = result.formatted.toLowerCase();
  console.log('\n🔍 Checking output:');

  if (output.includes('john smith')) {
    console.log('  ✅ Contains patient name');
  } else {
    console.log('  ❌ Missing patient name');
  }

  if (output.includes('adhd')) {
    console.log('  ✅ Contains ADHD diagnosis');
  } else {
    console.log('  ❌ Missing ADHD diagnosis');
  }

  if (output.includes('lexapro')) {
    console.log('  ✅ Contains Lexapro medication');
  } else {
    console.log('  ❌ Missing Lexapro medication');
  }

  if (output.includes('vyvanse') || output.includes('adderall')) {
    console.log('  ❌ HALLUCINATED medications!');
  } else {
    console.log('  ✅ No hallucinated medications');
  }
}

testSimple().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});