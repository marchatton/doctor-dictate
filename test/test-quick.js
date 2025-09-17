#!/usr/bin/env node

/**
 * Quick test with sample data
 */

const fs = require('fs');
const path = require('path');
const { UnifiedProcessor } = require('./src/services/processing/unified-processor');

async function quickTest() {
    console.log('🚀 Quick Test - Testing both FAST and ACCURATE modes\n');
    
    // Read sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    console.log('📄 Input: Sample Whisper transcription');
    console.log(`   Length: ${rawText.length} characters\n`);
    
    // Test FAST mode
    console.log('⚡ FAST Mode (llama3.2:latest - 3B)');
    console.log('-'.repeat(40));
    try {
        const fastProcessor = new UnifiedProcessor('FAST');
        const start = Date.now();
        const result = await fastProcessor.format(rawText);
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        
        console.log(`✅ Success in ${duration}s`);
        console.log(`   Output: ${result.length} chars`);
        console.log(`   Sections: ${(result.match(/###/g) || []).length} found`);
        
        // Save output
        fs.writeFileSync('test-output-fast.md', result);
        console.log('   Saved to: test-output-fast.md\n');
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
    
    // Test ACCURATE mode
    console.log('🎯 ACCURATE Mode (mistral:latest - 7B)');
    console.log('-'.repeat(40));
    try {
        const accurateProcessor = new UnifiedProcessor('ACCURATE');
        const start = Date.now();
        const result = await accurateProcessor.format(rawText);
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        
        console.log(`✅ Success in ${duration}s`);
        console.log(`   Output: ${result.length} chars`);
        console.log(`   Sections: ${(result.match(/###/g) || []).length} found`);
        
        // Save output
        fs.writeFileSync('test-output-accurate.md', result);
        console.log('   Saved to: test-output-accurate.md\n');
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
    
    console.log('✅ Test complete! Check the output files.');
}

quickTest().catch(console.error);