/**
 * Comprehensive test suite for medical formatting
 * Tests the entire pipeline: prompt generation -> LLM formatting -> validation
 */

const { MedicalPromptV2 } = require('./src/prompts/medical-prompt-v2');
const { OllamaFormatter } = require('./src/ollama-formatter');

// Test cases covering all requirements
const TEST_CASES = {
    punctuation: [
        {
            id: 'PUNCT_001',
            input: "Patient stable period New line Medications colon",
            expected: "Patient stable.\nMedications:",
            description: "Basic punctuation commands"
        },
        {
            id: 'PUNCT_002', 
            input: "Mood quote okay unquote comma affect congruent period",
            expected: 'Mood "okay", affect congruent.',
            description: "Quotes and punctuation"
        },
        {
            id: 'PUNCT_003',
            input: "Plan dash Continue meds semicolon follow up colon 4 weeks",
            expected: "Plan - Continue meds; follow up: 4 weeks",
            description: "Complex punctuation"
        },
        {
            id: 'PUNCT_004',
            input: "Dosage open paren start low close paren slash titrate up",
            expected: "Dosage (start low)/titrate up",
            description: "Parentheses and slash"
        },
        {
            id: 'PUNCT_005',
            input: "New paragraph Assessment colon stable period",
            expected: "\n\nAssessment: stable.",
            description: "Paragraph breaks"
        }
    ],
    
    fillers: [
        {
            id: 'FILLER_001',
            input: "So, uh, the patient is like really improving, you know",
            expected: "The patient is really improving",
            description: "Remove common fillers"
        },
        {
            id: 'FILLER_002',
            input: "Yeah, so patient feels like crying, like, all the time",
            expected: "Patient feels like crying all the time",
            description: "Preserve clinical 'like'"
        },
        {
            id: 'FILLER_003',
            input: "Um, yeah, so, uh, sertraline, uhm, 50mg",
            expected: "Sertraline 50mg",
            description: "Multiple fillers"
        }
    ],
    
    medical: [
        {
            id: 'MED_001',
            input: "Diagnosed with ACHD, MDD, and GAD",
            expected: "Diagnosed with ADHD, MDD, and GAD",
            description: "ACHD to ADHD correction"
        },
        {
            id: 'MED_002',
            input: "Trazodone 50mg qhs for sleep",
            expected: "Trazodone 50mg QHS for sleep",
            description: "Medication frequency capitalization"
        },
        {
            id: 'MED_003',
            input: "Patient on jurn APM 60mg QHS",
            expected: "Patient on {unclear: Journay PM?} 60mg QHS",
            description: "Unclear medication marking"
        },
        {
            id: 'MED_004',
            input: "Lexapro 20mg bid, Adderall 10mg prn",
            expected: "Lexapro 20mg BID, Adderall 10mg PRN",
            description: "Multiple frequency corrections"
        }
    ],
    
    sections: [
        {
            id: 'SECT_001',
            input: "Chief complaint depression",
            expected: "**CC:** depression",
            description: "Chief complaint formatting"
        },
        {
            id: 'SECT_002',
            input: "problem list one depression two anxiety three ACHD",
            expected: "## Problem List\n1. Depression\n2. Anxiety\n3. ADHD",
            description: "Problem list with numbers"
        },
        {
            id: 'SECT_003',
            input: "current medications lexapro 20mg daily adderall 10mg bid",
            expected: "## Current Medications\n1. Lexapro 20mg (daily)\n2. Adderall 10mg (BID)",
            description: "Medication list formatting"
        }
    ],
    
    complex: [
        {
            id: 'REAL_001',
            input: "Identification comma John Smith is a 14 year old male with a history of ACHD and major depressive disorder period He's in the seventh grade period Chief complaint follow up period Next paragraph Problem list colon ACHD period Improving comma partial control period Two comma major depressive disorder comma stable period Current medications comma Lexapro 20 mg comma one pill per day comma jurn APM comma 60 milli comma qhs period",
            expected: `# Identification
John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He's in the seventh grade.

**CC:** Follow-up

## Problem List
1. ADHD: Improving, partial control
2. Major depressive disorder: stable

## Current Medications
1. Lexapro 20mg (daily)
2. {unclear: Journay PM?} 60mg (QHS)`,
            description: "Full complex dictation"
        }
    ]
};

class TestValidator {
    /**
     * Validate output against expected result
     */
    static validateOutput(actual, expected) {
        const issues = [];
        
        // Normalize for comparison
        const actualNorm = actual.trim().replace(/\s+/g, ' ');
        const expectedNorm = expected.trim().replace(/\s+/g, ' ');
        
        // Check for key differences
        if (!actualNorm.includes('ADHD') && expectedNorm.includes('ADHD') && actualNorm.includes('ACHD')) {
            issues.push('Failed to correct ACHD to ADHD');
        }
        
        if (expectedNorm.includes('**CC:**') && !actualNorm.includes('**CC:**')) {
            issues.push('Missing **CC:** formatting');
        }
        
        if (expectedNorm.includes('## Problem List') && !actualNorm.includes('## Problem List')) {
            issues.push('Missing ## Problem List header');
        }
        
        if (expectedNorm.includes('QHS') && actualNorm.includes('qhs')) {
            issues.push('Failed to capitalize qhs to QHS');
        }
        
        if (expectedNorm.includes('{unclear:') && !actualNorm.includes('{unclear:')) {
            if (actualNorm.includes('jurn') || actualNorm.includes('jour')) {
                issues.push('Failed to mark unclear medication');
            }
        }
        
        // Calculate similarity score
        const similarity = this.calculateSimilarity(actualNorm, expectedNorm);
        
        return {
            passed: issues.length === 0 && similarity > 0.8,
            issues: issues,
            similarity: similarity
        };
    }
    
    /**
     * Calculate similarity between two strings (0-1)
     */
    static calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

/**
 * Test the prompt generation
 */
async function testPromptGeneration() {
    console.log('\n📝 Testing Prompt Generation');
    console.log('=' .repeat(60));
    
    const testInput = "Test patient period";
    const prompt = MedicalPromptV2.build(testInput);
    
    const checks = [
        { name: 'Contains rules', check: prompt.includes('STRICT RULES') },
        { name: 'Contains examples', check: prompt.includes('Example 1:') },
        { name: 'Contains punctuation rules', check: prompt.includes('"period" →') },
        { name: 'Contains medical corrections', check: prompt.includes('ACHD → ADHD') },
        { name: 'Contains input text', check: prompt.includes(testInput) }
    ];
    
    let passed = 0;
    checks.forEach(({ name, check }) => {
        if (check) {
            console.log(`✅ ${name}`);
            passed++;
        } else {
            console.log(`❌ ${name}`);
        }
    });
    
    console.log(`\nPrompt generation: ${passed}/${checks.length} checks passed`);
    return passed === checks.length;
}

/**
 * Test Ollama formatter with mock responses
 */
async function testOllamaFormatter() {
    console.log('\n🤖 Testing Ollama Formatter');
    console.log('=' .repeat(60));
    
    const formatter = new OllamaFormatter();
    
    // Check if Ollama is available
    const available = await formatter.isOllamaAvailable();
    
    if (!available) {
        console.log('⚠️ Ollama not available. Skipping live tests.');
        console.log('To run full tests, ensure Ollama is running with: ollama serve');
        return false;
    }
    
    console.log(`✅ Ollama available`);
    console.log(`📦 Model selected: ${formatter.model}`);
    
    // Test a simple case
    const testCase = TEST_CASES.punctuation[0];
    console.log(`\nTesting: ${testCase.id} - ${testCase.description}`);
    
    try {
        const result = await formatter.formatMedicalDictation(testCase.input);
        
        if (result.success) {
            console.log(`✅ Formatting succeeded`);
            console.log(`   Model: ${result.model}`);
            console.log(`   Prompt version: ${result.promptVersion}`);
            console.log(`   Retries: ${result.retries || 0}`);
            
            const validation = TestValidator.validateOutput(result.formatted, testCase.expected);
            if (validation.passed) {
                console.log(`✅ Output validation passed`);
            } else {
                console.log(`⚠️ Output validation issues:`);
                validation.issues.forEach(issue => console.log(`   - ${issue}`));
            }
            console.log(`   Similarity: ${(validation.similarity * 100).toFixed(1)}%`);
        } else {
            console.log(`❌ Formatting failed: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
    
    return true;
}

/**
 * Run test suite on all test cases
 */
async function runFullTestSuite() {
    console.log('\n🧪 Running Full Test Suite');
    console.log('=' .repeat(60));
    
    const formatter = new OllamaFormatter();
    const available = await formatter.isOllamaAvailable();
    
    if (!available) {
        console.log('⚠️ Ollama not available. Cannot run full suite.');
        return;
    }
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        byCategory: {}
    };
    
    for (const [category, cases] of Object.entries(TEST_CASES)) {
        console.log(`\n📂 Testing ${category.toUpperCase()}`);
        console.log('-'.repeat(40));
        
        const categoryResults = { passed: 0, failed: 0, cases: [] };
        
        for (const testCase of cases) {
            results.total++;
            process.stdout.write(`  ${testCase.id}: `);
            
            try {
                const result = await formatter.formatMedicalDictation(testCase.input);
                
                if (result.success) {
                    const validation = TestValidator.validateOutput(result.formatted, testCase.expected);
                    
                    if (validation.passed) {
                        console.log(`✅ (${(validation.similarity * 100).toFixed(0)}%)`);
                        results.passed++;
                        categoryResults.passed++;
                    } else {
                        console.log(`❌ Issues: ${validation.issues.join(', ')}`);
                        results.failed++;
                        categoryResults.failed++;
                    }
                    
                    categoryResults.cases.push({
                        id: testCase.id,
                        passed: validation.passed,
                        similarity: validation.similarity,
                        issues: validation.issues
                    });
                } else {
                    console.log(`❌ Formatting failed`);
                    results.failed++;
                    categoryResults.failed++;
                }
            } catch (error) {
                console.log(`❌ Error: ${error.message}`);
                results.failed++;
                categoryResults.failed++;
            }
        }
        
        results.byCategory[category] = categoryResults;
        console.log(`  Category: ${categoryResults.passed}/${cases.length} passed`);
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed} (${(results.passed/results.total*100).toFixed(1)}%)`);
    console.log(`Failed: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)`);
    
    console.log('\nBy Category:');
    for (const [category, catResults] of Object.entries(results.byCategory)) {
        const total = catResults.passed + catResults.failed;
        const percentage = total > 0 ? (catResults.passed / total * 100).toFixed(1) : 0;
        console.log(`  ${category}: ${catResults.passed}/${total} (${percentage}%)`);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    const successRate = results.passed / results.total;
    if (successRate >= 0.9) {
        console.log('✅ Excellent performance! Ready for production.');
    } else if (successRate >= 0.7) {
        console.log('⚠️ Good performance, but review failed cases for improvements.');
    } else {
        console.log('❌ Needs improvement. Consider:');
        console.log('  - Adding more examples to prompts');
        console.log('  - Testing different models');
        console.log('  - Reviewing specific failure patterns');
    }
}

/**
 * Main test runner
 */
async function main() {
    console.log('🏥 Medical Formatting Test Suite v2.0');
    console.log('=' .repeat(60));
    
    // Test prompt generation
    const promptTestPassed = await testPromptGeneration();
    
    // Test Ollama formatter
    const ollamaTestPassed = await testOllamaFormatter();
    
    // Run full suite if basics pass
    if (promptTestPassed && ollamaTestPassed) {
        await runFullTestSuite();
    } else {
        console.log('\n⚠️ Basic tests failed. Fix issues before running full suite.');
    }
}

// Run tests
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { TEST_CASES, TestValidator };