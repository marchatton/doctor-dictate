#!/usr/bin/env node

/**
 * Simple test script for Ollama formatting
 * Uses direct API calls to test Ollama response
 */

const fs = require('fs');
const path = require('path');

async function testOllamaDirectly() {
    console.log('=' .repeat(80));
    console.log('🧪 DIRECT OLLAMA API TEST');
    console.log('=' .repeat(80));
    
    // Read the sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    console.log('\n📄 INPUT TEXT:');
    console.log('Length:', rawText.length, 'characters');
    console.log('First 300 chars:', rawText.substring(0, 300) + '...\n');
    
    // Create a simple prompt
    const prompt = `Format this medical dictation into a structured note with these sections:
### Identification
### CC
### Problem List
### Current Meds
### Interim History
### Past Medical History
### Social History
### Family History
### Review of Systems
### Mental Status Exam
### Risk Assessment
### Assessment
### Plan
### Therapy Notes

Important: Include ALL sections that are present in the input. Do not skip any sections.

INPUT TEXT:
${rawText}

FORMATTED OUTPUT:`;
    
    console.log('📝 PROMPT LENGTH:', prompt.length, 'characters\n');
    
    // Test with different configurations
    const configs = [
        { model: 'qwen2.5:1.5b', num_predict: 4000, num_ctx: 8192 },
        { model: 'qwen2.5:1.5b', num_predict: 8000, num_ctx: 16384 },
        { model: 'qwen2.5:1.5b', num_predict: 16000, num_ctx: 32768 }
    ];
    
    for (const config of configs) {
        console.log('='.repeat(80));
        console.log(`🤖 Testing with: ${config.model}`);
        console.log(`   num_predict: ${config.num_predict}, num_ctx: ${config.num_ctx}`);
        console.log('='.repeat(80));
        
        try {
            const startTime = Date.now();
            
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        top_p: 0.9,
                        repeat_penalty: 1.0,
                        num_predict: config.num_predict,
                        num_ctx: config.num_ctx,
                        stop: []
                    }
                })
            });
            
            if (!response.ok) {
                console.error('❌ API request failed:', response.status);
                continue;
            }
            
            const result = await response.json();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log('\n📊 RESPONSE METADATA:');
            console.log('  - Duration:', duration, 'seconds');
            console.log('  - Response length:', result.response?.length || 0, 'characters');
            console.log('  - Tokens generated:', result.eval_count || 'unknown');
            console.log('  - Prompt tokens:', result.prompt_eval_count || 'unknown');
            console.log('  - Done:', result.done);
            console.log('  - Done reason:', result.done_reason || 'not specified');
            
            if (result.done_reason === 'length') {
                console.log('  ⚠️ RESPONSE WAS TRUNCATED!');
            }
            
            if (result.response) {
                // Count sections in output
                const outputLower = result.response.toLowerCase();
                console.log('\n📋 SECTIONS FOUND IN OUTPUT:');
                const sections = [
                    'identification',
                    'cc',
                    'problem list',
                    'current med',
                    'interim history',
                    'past medical history',
                    'social history',
                    'family history',
                    'review of systems',
                    'mental status exam',
                    'risk assessment',
                    'assessment',
                    'plan',
                    'therapy notes'
                ];
                
                let foundCount = 0;
                for (const section of sections) {
                    const found = outputLower.includes(section);
                    console.log(`  - ${section}: ${found ? '✅' : '❌'}`);
                    if (found) foundCount++;
                }
                
                console.log(`\n  Total: ${foundCount}/${sections.length} sections found`);
                
                // Save output
                const outputFile = path.join(__dirname, `test-output-${config.num_predict}.md`);
                fs.writeFileSync(outputFile, result.response);
                console.log('\n💾 Output saved to:', outputFile);
                
                // Show preview
                console.log('\n📄 OUTPUT PREVIEW (first 800 chars):');
                console.log(result.response.substring(0, 800));
                console.log('...\n');
                
                // Show end of output to check if it was cut off
                console.log('📄 OUTPUT END (last 400 chars):');
                console.log('...');
                console.log(result.response.substring(result.response.length - 400));
            } else {
                console.error('❌ No response from Ollama');
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testOllamaDirectly().catch(console.error);