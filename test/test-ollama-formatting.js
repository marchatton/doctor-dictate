#!/usr/bin/env node

/**
 * Test script for Ollama formatting
 * Uses the sample Whisper output to test formatting
 */

const fs = require('fs');
const path = require('path');
const { OllamaFormatter } = require('./src/services/formatting/ollama-formatter');

async function testOllamaFormatting() {
    console.log('=' .repeat(80));
    console.log('🧪 OLLAMA FORMATTING TEST');
    console.log('=' .repeat(80));
    
    // Read the sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    console.log('\n📄 INPUT TEXT:');
    console.log('Length:', rawText.length, 'characters');
    console.log('Preview:', rawText.substring(0, 200) + '...\n');
    
    // Count sections in input
    const inputLower = rawText.toLowerCase();
    console.log('📋 SECTIONS IN INPUT:');
    console.log('  - Identification:', inputLower.includes('identification'));
    console.log('  - Chief complaint:', inputLower.includes('chief complaint'));
    console.log('  - Problem list:', inputLower.includes('problemist') || inputLower.includes('problem list'));
    console.log('  - Current medications:', inputLower.includes('current medications'));
    console.log('  - Interim history:', inputLower.includes('interim history'));
    console.log('  - Past medical history:', inputLower.includes('past medical history'));
    console.log('  - Social history:', inputLower.includes('social history'));
    console.log('  - Family history:', inputLower.includes('family history'));
    console.log('  - Review of systems:', inputLower.includes('review systems'));
    console.log('  - Mental status exam:', inputLower.includes('mental status exam'));
    console.log('  - Risk assessment:', inputLower.includes('risk assessment'));
    console.log('  - Assessment:', inputLower.includes('assessment'));
    console.log('  - Plan:', inputLower.includes('plan'));
    console.log('  - Therapy notes:', inputLower.includes('therapy notes'));
    
    // Test with different models
    const models = [
        'qwen2.5:0.5b',  // Current default (smallest)
        'qwen2.5:1.5b',  // Slightly larger
        'qwen2.5:3b',    // Medium
        'llama3.2:3b',   // Alternative model
        'mistral:7b'     // Larger model if available
    ];
    
    for (const model of models) {
        console.log('\n' + '='.repeat(80));
        console.log(`🤖 TESTING WITH MODEL: ${model}`);
        console.log('='.repeat(80));
        
        try {
            // Create formatter with specific model
            const formatter = new OllamaFormatter({
                model: model,
                temperature: 0.1,
                timeout: 120000  // 2 minutes
            });
            
            // Check if Ollama is available
            const available = await formatter.isOllamaAvailable();
            if (!available) {
                console.error('❌ Ollama is not running or not available');
                continue;
            }
            
            // Check if model exists
            const models = await formatter.getAvailableModels();
            const modelNames = models.map(m => m.name);
            if (!modelNames.includes(model)) {
                console.log(`⚠️ Model ${model} not installed, skipping...`);
                continue;
            }
            
            console.log('✅ Model available, starting formatting...\n');
            
            // Format the text
            const startTime = Date.now();
            const result = await formatter.formatMedicalDictation(rawText, {
                num_predict: 8000,
                num_ctx: 16384
            });
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log('\n📊 RESULT:');
            console.log('  - Success:', result.success);
            console.log('  - Duration:', duration, 'seconds');
            console.log('  - Output length:', result.formatted?.length || 0, 'characters');
            console.log('  - Model used:', result.model);
            console.log('  - Tokens used:', result.tokensUsed || 'unknown');
            
            if (result.success) {
                // Count sections in output
                const outputLower = result.formatted.toLowerCase();
                console.log('\n📋 SECTIONS IN OUTPUT:');
                console.log('  - Identification:', outputLower.includes('identification'));
                console.log('  - CC:', outputLower.includes('cc:') || outputLower.includes('chief complaint'));
                console.log('  - Problem List:', outputLower.includes('problem list'));
                console.log('  - Current Meds:', outputLower.includes('current med'));
                console.log('  - Interim History:', outputLower.includes('interim history'));
                console.log('  - Past Medical History:', outputLower.includes('past medical history'));
                console.log('  - Assessment:', outputLower.includes('assessment'));
                console.log('  - Plan:', outputLower.includes('plan'));
                
                // Save output to file for inspection
                const outputFile = path.join(__dirname, `test-output-${model.replace(':', '-')}.md`);
                fs.writeFileSync(outputFile, result.formatted);
                console.log('\n💾 Output saved to:', outputFile);
                
                // Show first part of output
                console.log('\n📄 OUTPUT PREVIEW:');
                console.log(result.formatted.substring(0, 500));
                console.log('...');
            } else {
                console.error('❌ Formatting failed:', result.error);
            }
            
        } catch (error) {
            console.error(`❌ Error with model ${model}:`, error.message);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testOllamaFormatting().catch(console.error);