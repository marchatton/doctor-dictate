#!/usr/bin/env node

/**
 * Compare complex vs simple prompts with Ollama
 */

const fs = require('fs');
const path = require('path');

async function testBothPrompts() {
    console.log('=' .repeat(80));
    console.log('🧪 COMPLEX VS SIMPLE PROMPT COMPARISON');
    console.log('=' .repeat(80));
    
    // Read both prompts
    const complexPrompt = fs.readFileSync(path.join(__dirname, 'test-generated-prompt.txt'), 'utf8');
    const simplePrompt = fs.readFileSync(path.join(__dirname, 'test-simple-prompt.txt'), 'utf8');
    
    console.log('\n📊 PROMPT SIZES:');
    console.log('  Complex:', complexPrompt.length, 'characters');
    console.log('  Simple:', simplePrompt.length, 'characters');
    
    const model = 'qwen2.5:1.5b';
    const configs = [
        { name: 'Complex Prompt', prompt: complexPrompt },
        { name: 'Simple Prompt', prompt: simplePrompt }
    ];
    
    for (const config of configs) {
        console.log('\n' + '='.repeat(80));
        console.log(`🤖 Testing: ${config.name}`);
        console.log('='.repeat(80));
        
        try {
            const startTime = Date.now();
            
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: config.prompt,
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
                continue;
            }
            
            const result = await response.json();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log('\n📊 RESPONSE METADATA:');
            console.log('  - Duration:', duration, 'seconds');
            console.log('  - Response length:', result.response?.length || 0, 'characters');
            console.log('  - Tokens generated:', result.eval_count || 'unknown');
            console.log('  - Prompt tokens:', result.prompt_eval_count || 'unknown');
            console.log('  - Done reason:', result.done_reason || 'not specified');
            
            if (result.done_reason === 'length') {
                console.log('  ⚠️ RESPONSE WAS TRUNCATED!');
            }
            
            if (result.response) {
                // Count sections in output
                const outputLower = result.response.toLowerCase();
                console.log('\n📋 SECTIONS FOUND:');
                const sections = [
                    { name: 'Identification', search: 'identification' },
                    { name: 'CC', search: 'cc' },
                    { name: 'Problem List', search: 'problem list' },
                    { name: 'Current Meds', search: 'current med' },
                    { name: 'Interim History', search: 'interim history' },
                    { name: 'Past Medical History', search: 'past medical' },
                    { name: 'Social History', search: 'social history' },
                    { name: 'Family History', search: 'family history' },
                    { name: 'Review of Systems', search: 'review of systems' },
                    { name: 'Mental Status Exam', search: 'mental status' },
                    { name: 'Risk Assessment', search: 'risk assessment' },
                    { name: 'Assessment', search: 'assessment' },
                    { name: 'Plan', search: 'plan' },
                    { name: 'Therapy Notes', search: 'therapy notes' }
                ];
                
                let foundCount = 0;
                const foundSections = [];
                const missingSections = [];
                
                for (const section of sections) {
                    const found = outputLower.includes(section.search);
                    if (found) {
                        foundCount++;
                        foundSections.push(section.name);
                        console.log(`  ✅ ${section.name}`);
                    } else {
                        missingSections.push(section.name);
                        console.log(`  ❌ ${section.name}`);
                    }
                }
                
                console.log(`\n  Summary: ${foundCount}/${sections.length} sections`);
                if (missingSections.length > 0) {
                    console.log('  Missing:', missingSections.join(', '));
                }
                
                // Save output
                const outputFile = path.join(__dirname, `test-output-${config.name.toLowerCase().replace(' ', '-')}.md`);
                fs.writeFileSync(outputFile, result.response);
                console.log('\n💾 Output saved to:', outputFile);
                
                // Show first and last parts
                console.log('\n📄 OUTPUT START (first 500 chars):');
                console.log(result.response.substring(0, 500));
                
                console.log('\n📄 OUTPUT END (last 300 chars):');
                console.log(result.response.substring(result.response.length - 300));
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPARISON COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testBothPrompts().catch(console.error);