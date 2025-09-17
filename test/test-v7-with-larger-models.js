#!/usr/bin/env node

/**
 * Test the v7 prompt with larger models
 */

const fs = require('fs');
const path = require('path');
const { MedicalPromptV7, TemplateLoader } = require('./src/prompts/medical-prompt-v7');

async function testV7WithLargerModels() {
    console.log('=' .repeat(80));
    console.log('🧪 TESTING V7 PROMPT WITH LARGER MODELS');
    console.log('=' .repeat(80));
    
    // Read the sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    console.log('\n📄 INPUT TEXT:');
    console.log('  Length:', rawText.length, 'characters');
    
    // Load template and create v7 prompt
    const template = TemplateLoader.load('medicine-management');
    const promptGen = new MedicalPromptV7(template);
    const v7Prompt = promptGen.generatePrompt(rawText);
    
    console.log('\n📊 V7 PROMPT:');
    console.log('  Length:', v7Prompt.length, 'characters');
    
    // Test with different models
    const models = [
        { name: 'qwen2.5:1.5b', size: '1.5B', numPredict: 8000 },
        { name: 'llama3.2:latest', size: '3B', numPredict: 10000 },
        { name: 'mistral:latest', size: '7B', numPredict: 12000 }
    ];
    
    for (const model of models) {
        console.log('\n' + '='.repeat(80));
        console.log(`🤖 Testing: ${model.name} (${model.size} parameters)`);
        console.log('='.repeat(80));
        
        try {
            const startTime = Date.now();
            
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model.name,
                    prompt: v7Prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        top_p: 0.9,
                        repeat_penalty: 1.0,
                        num_predict: model.numPredict,
                        num_ctx: 32768,  // Large context for v7 prompt
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
            
            console.log('\n📊 RESPONSE:');
            console.log('  - Duration:', duration, 'seconds');
            console.log('  - Response length:', result.response?.length || 0, 'characters');
            console.log('  - Tokens generated:', result.eval_count || 'unknown');
            console.log('  - Done reason:', result.done_reason || 'not specified');
            
            if (result.done_reason === 'length') {
                console.log('  ⚠️ RESPONSE WAS TRUNCATED!');
            }
            
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
                const missingSections = [];
                
                for (const section of sections) {
                    const found = outputLower.includes(section);
                    if (found) {
                        foundCount++;
                        console.log(`  ✅ ${section}`);
                    } else {
                        missingSections.push(section);
                    }
                }
                
                console.log(`\n  Total: ${foundCount}/${sections.length} sections`);
                if (missingSections.length > 0) {
                    console.log('  Missing:', missingSections.join(', '));
                }
                
                // Check if headers use ###
                const hashHeaders = (result.response.match(/###\s+\w+/g) || []).length;
                console.log(`\n  ### Headers found: ${hashHeaders}`);
                
                // Check if medications were fixed
                const hasJornayPM = result.response.includes('Jornay PM');
                const hasJohnAPM = result.response.toLowerCase().includes('john apm');
                console.log(`\n  Medication fixes:`);
                console.log(`    Jornay PM (correct): ${hasJornayPM ? '✅' : '❌'}`);
                console.log(`    John APM (incorrect): ${hasJohnAPM ? '❌ Still present' : '✅ Fixed'}`);
                
                // Save output
                const outputFile = path.join(__dirname, `test-v7-output-${model.name.replace(':', '-')}.md`);
                fs.writeFileSync(outputFile, result.response);
                console.log('\n💾 Output saved to:', outputFile);
                
                // Show preview
                console.log('\n📄 OUTPUT PREVIEW (first 500 chars):');
                console.log(result.response.substring(0, 500));
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
testV7WithLargerModels().catch(console.error);