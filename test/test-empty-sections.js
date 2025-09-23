#!/usr/bin/env node

/**
 * Test that empty sections are not created
 */

const { OllamaFormatter } = require('../src/services/formatting/ollama-formatter');

async function testEmptySections() {
  console.log('\n🧪 EMPTY SECTIONS TEST\n');

  const formatter = new OllamaFormatter({
    model: 'llama3.2:latest',
    temperature: 0.1
  });

  const available = await formatter.isOllamaAvailable();
  if (!available) {
    console.error('❌ Ollama is not available');
    process.exit(1);
  }

  // Test case 1: Sections mentioned but no content
  console.log('=== TEST 1: Section names without content ===');
  const input1 = `identification john smith adhd problem list current meds lexapro 10mg assessment plan`;
  console.log('Input:', input1);

  const result1 = await formatter.formatMedicalDictation(input1);
  console.log('\n📄 OUTPUT:');
  console.log(result1.formatted);

  const output1 = result1.formatted;
  console.log('\n✅ Checks:');

  // Should have sections with content
  console.log('  Has Identification?', output1.includes('### Identification') ? '✅' : '❌');
  console.log('  Has Current Medication?', output1.includes('### Current Medication') ? '✅' : '❌');

  // Should NOT have empty sections
  const hasEmptyAssessment = output1.includes('### Assessment') &&
    !output1.includes('### Assessment\n###'); // Check if Assessment is followed immediately by another section
  console.log('  Has empty Assessment section?', hasEmptyAssessment ? '❌ BAD' : '✅ Good (skipped)');

  const hasEmptyPlan = output1.includes('### Plan');
  console.log('  Has empty Plan section?', hasEmptyPlan ? '❌ BAD' : '✅ Good (skipped)');

  // Check for placeholder text
  const hasPlaceholder = output1.toLowerCase().includes('no additional information') ||
                        output1.toLowerCase().includes('not mentioned') ||
                        output1.toLowerCase().includes('not provided');
  console.log('  Has placeholder text?', hasPlaceholder ? '❌ BAD' : '✅ Good');

  // Test case 2: Mixed - some sections with content, some without
  console.log('\n\n=== TEST 2: Mixed content and empty sections ===');
  const input2 = `problem list adhd improving mdd stable interim history assessment doing well on current regimen plan`;
  console.log('Input:', input2);

  const result2 = await formatter.formatMedicalDictation(input2);
  console.log('\n📄 OUTPUT:');
  console.log(result2.formatted);

  const output2 = result2.formatted;
  console.log('\n✅ Checks:');
  console.log('  Has Problem List with content?', output2.includes('### Problem List') && output2.includes('ADHD') ? '✅' : '❌');
  console.log('  Has Assessment with "doing well"?', output2.includes('### Assessment') && output2.includes('doing well') ? '✅' : '❌');
  console.log('  Has empty Plan section?', output2.includes('### Plan') ? '❌ BAD' : '✅ Good (skipped)');
  console.log('  Has empty Interim History?', output2.includes('### Interim History') && !output2.includes('doing well') ? '❌ BAD' : '✅ Good');
}

testEmptySections().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});