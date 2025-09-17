#!/usr/bin/env node

const { OllamaFormatter } = require('../src/services/formatting/ollama-formatter');
const fs = require('fs');
const path = require('path');

async function testMinimal() {
  console.log('\n🧪 MINIMAL PROMPT TEST\n');

  // Temporarily replace the prompt
  const formatter = new OllamaFormatter({
    model: 'llama3.2:latest',
    temperature: 0.1
  });

  // Override with minimal prompt
  const minimalPath = path.join(__dirname, '../src/prompts/compiled/medicine-management-minimal.md');
  formatter.staticPrompt = fs.readFileSync(minimalPath, 'utf8');
  console.log('📝 Using minimal prompt (', formatter.staticPrompt.length, 'chars)');

  const available = await formatter.isOllamaAvailable();
  if (!available) {
    console.error('❌ Ollama is not available');
    process.exit(1);
  }

  // Test case 1: Simple
  console.log('\n=== TEST 1: Simple ===');
  const input1 = `identification patient is john smith adhd current meds lexapro 10mg`;
  console.log('Input:', input1);

  const result1 = await formatter.formatMedicalDictation(input1);
  console.log('\n📄 OUTPUT:');
  console.log(result1.formatted);
  console.log('\n✅ Check:');
  const output1 = result1.formatted.toLowerCase();
  console.log('  Has John Smith?', output1.includes('john smith') ? '✅' : '❌');
  console.log('  Has ADHD?', output1.includes('adhd') ? '✅' : '❌');
  console.log('  Has Lexapro 10mg?', output1.includes('lexapro 10mg') ? '✅' : '❌');
  console.log('  Added age/grade?', (output1.includes('14') || output1.includes('7th')) ? '❌ HALLUCINATED!' : '✅ Clean');
  console.log('  Added other meds?', (output1.includes('jornay') || output1.includes('vyvanse')) ? '❌ HALLUCINATED!' : '✅ Clean');

  // Test case 2: With status
  console.log('\n=== TEST 2: With problem status ===');
  const input2 = `problem list adhd improving partial control current meds lexapro 20mg`;
  console.log('Input:', input2);

  const result2 = await formatter.formatMedicalDictation(input2);
  console.log('\n📄 OUTPUT:');
  console.log(result2.formatted);
  console.log('\n✅ Check:');
  const output2 = result2.formatted.toLowerCase();
  console.log('  Has status "improving, partial control"?', output2.includes('improving') && output2.includes('partial control') ? '✅' : '❌');
  console.log('  Has Lexapro 20mg?', output2.includes('lexapro 20mg') ? '✅' : '❌');
  console.log('  Added extra meds?', (output2.includes('jornay') || output2.includes('vyvanse') || output2.includes('adderall')) ? '❌ HALLUCINATED!' : '✅ Clean');
}

testMinimal().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});