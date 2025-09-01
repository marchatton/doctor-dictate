/**
 * Debug script to see what the LLM is actually outputting
 */

const { MedicalPromptV2 } = require('./src/prompts/medical-prompt-v2');
const { OllamaFormatter } = require('./src/ollama-formatter');

async function debugOutput() {
    console.log('🔍 Debug LLM Output');
    console.log('=' .repeat(60));
    
    const formatter = new OllamaFormatter();
    
    // Check if Ollama is available
    const available = await formatter.isOllamaAvailable();
    if (!available) {
        console.log('❌ Ollama not available');
        return;
    }
    
    console.log(`✅ Using model: ${formatter.model}`);
    
    // Test simple cases to see actual output
    const testCases = [
        {
            input: "Patient stable period",
            expected: "Patient stable."
        },
        {
            input: "Medications colon Lexapro 20mg comma Adderall 10mg",
            expected: "Medications: Lexapro 20mg, Adderall 10mg"
        },
        {
            input: "Diagnosed with ACHD",
            expected: "Diagnosed with ADHD"
        }
    ];
    
    for (const test of testCases) {
        console.log('\n' + '-'.repeat(40));
        console.log(`Input:    "${test.input}"`);
        console.log(`Expected: "${test.expected}"`);
        
        try {
            // Disable hallucination check temporarily to see raw output
            formatter.maxRetries = 0;
            const result = await formatter.formatMedicalDictation(test.input);
            
            if (result.success) {
                console.log(`Actual:   "${result.formatted}"`);
                console.log(`Length:   Input=${test.input.length}, Output=${result.formatted.length}`);
                
                // Show if it's adding content
                if (result.formatted.length > test.input.length * 1.2) {
                    console.log('⚠️ Output is significantly longer than input');
                }
            } else {
                console.log(`❌ Failed: ${result.error}`);
                console.log(`Fallback: "${result.formatted}"`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
    
    // Test the prompt directly
    console.log('\n' + '='.repeat(60));
    console.log('📝 Testing Raw Prompt');
    console.log('-'.repeat(40));
    
    const testInput = "Patient stable period Medications colon Lexapro 20mg";
    const prompt = MedicalPromptV2.build(testInput);
    
    // Show prompt length
    console.log(`Prompt length: ${prompt.length} characters`);
    console.log(`Prompt has ${prompt.split('\n').length} lines`);
    
    // Test raw generation
    try {
        console.log('\nGenerating with raw prompt...');
        const rawOutput = await formatter.generateCompletion(prompt, {
            temperature: 0.1,
            max_tokens: 500
        });
        
        console.log('\nRaw LLM Output:');
        console.log('-'.repeat(40));
        console.log(rawOutput);
        console.log('-'.repeat(40));
        console.log(`Output length: ${rawOutput.length} characters`);
    } catch (error) {
        console.log(`❌ Generation error: ${error.message}`);
    }
}

// Run debug
debugOutput().catch(console.error);