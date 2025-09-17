#!/usr/bin/env node

/**
 * Test the optimized prompt
 */

const fs = require('fs');
const path = require('path');
const { OptimizedMedicalPrompt } = require('./src/prompts/optimized-prompt');
const { TemplateLoader } = require('./src/prompts');

async function testOptimizedPrompt() {
    console.log('=' .repeat(80));
    console.log('🧪 OPTIMIZED PROMPT TEST');
    console.log('=' .repeat(80));
    
    // Read the sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    // Load template and create optimized prompt
    const template = TemplateLoader.load('medicine-management');
    const promptGen = new OptimizedMedicalPrompt(template);
    const optimizedPrompt = promptGen.generatePrompt(rawText);
    
    console.log('\n📊 PROMPT ANALYSIS:');
    console.log('  Optimized prompt length:', optimizedPrompt.length, 'characters');
    console.log('  Lines:', optimizedPrompt.split('\n').length);
    
    // Save the prompt
    const promptFile = path.join(__dirname, 'test-optimized-prompt.txt');
    fs.writeFileSync(promptFile, optimizedPrompt);
    console.log('  Saved to:', promptFile);
    
    // Show preview
    console.log('\n📄 PROMPT PREVIEW (first 1000 chars):');
    console.log(optimizedPrompt.substring(0, 1000));
    console.log('...');
    
    // Test with Ollama
    console.log('\n' + '='.repeat(80));
    console.log('🤖 Testing with Ollama');
    console.log('='.repeat(80));
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5:1.5b',
                prompt: optimizedPrompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    top_p: 0.9,
                    repeat_penalty: 1.0,
                    num_predict: 10000,
                    num_ctx: 20000,
                    stop: []
                }
            })
        });
        
        if (!response.ok) {
            console.error('❌ API request failed:', response.status);
            return;
        }
        
        const result = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n📊 RESPONSE METADATA:');
        console.log('  - Duration:', duration, 'seconds');
        console.log('  - Response length:', result.response?.length || 0, 'characters');
        console.log('  - Tokens generated:', result.eval_count || 'unknown');
        console.log('  - Prompt tokens:', result.prompt_eval_count || 'unknown');
        console.log('  - Done reason:', result.done_reason || 'not specified');
        
        if (result.response) {
            // Count sections
            const outputLower = result.response.toLowerCase();
            const sections = [
                'identification', 'cc', 'problem list', 'current med',
                'interim history', 'past medical', 'social history',
                'family history', 'review of systems', 'mental status',
                'risk assessment', 'assessment', 'plan', 'therapy notes'
            ];
            
            console.log('\n📋 SECTIONS FOUND:');
            let foundCount = 0;
            for (const section of sections) {
                const found = outputLower.includes(section);
                console.log(`  ${found ? '✅' : '❌'} ${section}`);
                if (found) foundCount++;
            }
            console.log(`\n  Total: ${foundCount}/${sections.length} sections`);
            
            // Save output
            const outputFile = path.join(__dirname, 'test-output-optimized.md');
            fs.writeFileSync(outputFile, result.response);
            console.log('\n💾 Output saved to:', outputFile);
            
            // Show preview
            console.log('\n📄 OUTPUT PREVIEW (first 600 chars):');
            console.log(result.response.substring(0, 600));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    // Compare sizes
    console.log('\n' + '='.repeat(80));
    console.log('📊 PROMPT SIZE COMPARISON');
    console.log('='.repeat(80));
    
    const complexPrompt = fs.readFileSync(path.join(__dirname, 'test-generated-prompt.txt'), 'utf8');
    const simplePrompt = fs.readFileSync(path.join(__dirname, 'test-simple-prompt.txt'), 'utf8');
    
    console.log('  Complex (v7):', complexPrompt.length, 'characters');
    console.log('  Simple:', simplePrompt.length, 'characters');
    console.log('  Optimized:', optimizedPrompt.length, 'characters');
    
    const ratio1 = (optimizedPrompt.length / complexPrompt.length * 100).toFixed(1);
    const ratio2 = (optimizedPrompt.length / simplePrompt.length * 100).toFixed(1);
    console.log(`\n  Optimized is ${ratio1}% of complex prompt size`);
    console.log(`  Optimized is ${ratio2}% of simple prompt size`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testOptimizedPrompt().catch(console.error);