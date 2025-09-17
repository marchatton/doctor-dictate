#!/usr/bin/env node

/**
 * Test the static prompt system to ensure:
 * 1. Problem status is preserved (not lost)
 * 2. No medications are hallucinated
 * 3. Proper capitalization of medical terms
 * 4. Template rules are followed correctly
 */

const { OllamaFormatter } = require('../src/services/formatting/ollama-formatter');
const fs = require('fs');
const path = require('path');

// Test cases that previously failed
const testCases = [
  {
    name: "Preserves problem status",
    input: `identification john smith is a 14 year old male with a history of adhd and major depressive disorder. he is in the 7th grade. chief complaint follow up problem list adhd improving partial control major depressive disorder stable current medications lexapro twenty milligrams one pill per day jornay pm sixty milligrams qhs`,
    shouldContain: [
      "ADHD – improving, partial control",
      "Major Depressive Disorder – stable"
    ],
    shouldNotContain: [
      "Vyvanse",
      "Adderall",
      "Concerta",
      "Ritalin"
    ]
  },
  {
    name: "Doesn't hallucinate medications",
    input: `identification patient is 12 year old with adhd current medications guanfacine 2mg daily`,
    shouldContain: [
      "Guanfacine 2mg (daily)"
    ],
    shouldNotContain: [
      "Vyvanse",
      "Adderall",
      "Jornay",
      "Lexapro",
      "Concerta"
    ]
  },
  {
    name: "Capitalizes medical abbreviations",
    input: `problem list adhd mdd ptsd gad ocd current meds ssri for mdd`,
    shouldContain: [
      "ADHD",
      "MDD",
      "PTSD",
      "GAD",
      "OCD",
      "SSRI"
    ],
    shouldNotContain: [
      "adhd",
      "mdd",
      "ptsd",
      "gad",
      "ocd",
      "ssri"
    ]
  },
  {
    name: "Corrects medication names",
    input: `current medications journey 40mg at bedtime luxapro 10mg daily violence 30mg in morning`,
    shouldContain: [
      "Jornay PM 40mg",
      "Lexapro 10mg",
      "Vyvanse 30mg"
    ],
    shouldNotContain: [
      "journey",
      "luxapro",
      "violence"
    ]
  },
  {
    name: "Follows template format for lists",
    input: `problem list adhd improving major depression stable anxiety disorder well controlled current meds prozac 20mg daily`,
    shouldContain: [
      "1. ADHD – improving",
      "2. Major Depression – stable",
      "3. Anxiety Disorder – well controlled",
      "1. Prozac 20mg (daily)"
    ]
  }
];

async function runTests() {
  console.log('\n🧪 STATIC PROMPT SYSTEM TESTS\n');
  console.log('=' .repeat(60));

  // Check if static prompt exists
  const promptPath = path.join(__dirname, '../src/prompts/compiled/medicine-management-prompt.txt');
  if (!fs.existsSync(promptPath)) {
    console.error('❌ Static prompt not found! Run: npm run build-prompt');
    process.exit(1);
  }

  const promptContent = fs.readFileSync(promptPath, 'utf8');
  console.log('✅ Static prompt loaded');
  console.log(`📊 Prompt size: ${(promptContent.length / 1024).toFixed(1)} KB\n`);

  // Verify prompt contains critical rules
  console.log('🔍 Verifying prompt contains critical rules:');
  const criticalRules = [
    'NEVER hallucinate',
    'Only include medications explicitly mentioned',
    'improving, partial control',
    'Jornay PM',
    'ADHD',
    '{Diagnosis} – {status'
  ];

  for (const rule of criticalRules) {
    if (promptContent.includes(rule)) {
      console.log(`  ✅ Contains: "${rule.substring(0, 40)}..."`);
    } else {
      console.log(`  ❌ Missing: "${rule}"`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🚀 Running formatting tests with Ollama\n');

  // Initialize formatter
  const formatter = new OllamaFormatter({
    model: 'llama3.2:latest',
    temperature: 0.1
  });

  // Check Ollama availability
  const available = await formatter.isOllamaAvailable();
  if (!available) {
    console.error('❌ Ollama is not available. Please ensure Ollama is running.');
    console.log('💡 Start Ollama with: ollama serve');
    process.exit(1);
  }

  console.log(`✅ Ollama is available with model: ${formatter.model}\n`);

  // Run each test case
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`   Input: "${testCase.input.substring(0, 80)}..."`);

    try {
      const result = await formatter.formatMedicalDictation(testCase.input);

      if (!result.success) {
        console.log(`   ❌ Formatting failed: ${result.error}`);
        failed++;
        continue;
      }

      const output = result.formatted.toLowerCase();
      let testPassed = true;

      // Check for expected content
      for (const expected of testCase.shouldContain) {
        if (!output.includes(expected.toLowerCase())) {
          console.log(`   ❌ Missing expected: "${expected}"`);
          testPassed = false;
        }
      }

      // Check for unwanted content
      if (testCase.shouldNotContain) {
        for (const unwanted of testCase.shouldNotContain) {
          if (output.includes(unwanted.toLowerCase())) {
            console.log(`   ❌ Contains unwanted: "${unwanted}"`);
            testPassed = false;
          }
        }
      }

      if (testPassed) {
        console.log(`   ✅ Passed`);
        passed++;
      } else {
        console.log(`   ❌ Failed`);
        console.log(`   Output preview: "${result.formatted.substring(0, 200)}..."`);
        failed++;
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success rate: ${((passed / testCases.length) * 100).toFixed(0)}%`);

  if (failed > 0) {
    console.log('\n⚠️ Some tests failed. The static prompt may need adjustments.');
    console.log('💡 Try regenerating the prompt: npm run build-prompt');
  } else {
    console.log('\n🎉 All tests passed! The static prompt is working correctly.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});