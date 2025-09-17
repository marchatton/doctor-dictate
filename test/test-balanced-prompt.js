#!/usr/bin/env node

const { OllamaFormatter } = require('../src/services/formatting/ollama-formatter');
const fs = require('fs');
const path = require('path');

async function testBalanced() {
  console.log('\n🧪 BALANCED PROMPT TEST\n');

  const formatter = new OllamaFormatter({
    model: 'llama3.2:latest',
    temperature: 0.1
  });

  // Override with balanced prompt
  const balancedPath = path.join(__dirname, '../src/prompts/compiled/medicine-management-balanced.md');
  formatter.staticPrompt = fs.readFileSync(balancedPath, 'utf8');
  console.log('📝 Using balanced prompt (', formatter.staticPrompt.length, 'chars)');

  const available = await formatter.isOllamaAvailable();
  if (!available) {
    console.error('❌ Ollama is not available');
    process.exit(1);
  }

  // Test case 1: Simple
  console.log('\n=== TEST 1: Simple case ===');
  const input1 = `identification patient is john smith adhd current meds lexapro 10mg`;
  console.log('Input:', input1);

  const result1 = await formatter.formatMedicalDictation(input1);
  console.log('\n📄 OUTPUT:');
  console.log(result1.formatted);
  console.log('\n✅ Checks:');
  const output1 = result1.formatted.toLowerCase();
  console.log('  Has John Smith?', output1.includes('john smith') ? '✅' : '❌');
  console.log('  Has ADHD?', output1.includes('adhd') ? '✅' : '❌');
  console.log('  Has Lexapro 10mg?', output1.includes('lexapro 10mg') ? '✅' : '❌');
  console.log('  No hallucinated age?', (!output1.includes('14') && !output1.includes('year old')) ? '✅' : '❌');
  console.log('  No extra meds?', (!output1.includes('jornay') && !output1.includes('vyvanse')) ? '✅' : '❌');

  // Test case 2: With problem status
  console.log('\n\n=== TEST 2: With problem status ===');
  const input2 = `problem list adhd improving partial control major depression stable current meds lexapro 20mg journay 60mg`;
  console.log('Input:', input2);

  const result2 = await formatter.formatMedicalDictation(input2);
  console.log('\n📄 OUTPUT:');
  console.log(result2.formatted);
  console.log('\n✅ Checks:');
  const output2 = result2.formatted.toLowerCase();
  console.log('  Has ADHD with status?', (output2.includes('adhd') && output2.includes('improving') && output2.includes('partial control')) ? '✅' : '❌');
  console.log('  Has Major Depression stable?', (output2.includes('depression') && output2.includes('stable')) ? '✅' : '❌');
  console.log('  Has Lexapro 20mg?', output2.includes('lexapro 20mg') ? '✅' : '❌');
  console.log('  Has journay marked unclear?', output2.includes('{journay') ? '✅' : '❌');
  console.log('  No extra sections?', (!output2.includes('### interim') && !output2.includes('### mse')) ? '✅' : '❌');
}

testBalanced().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});