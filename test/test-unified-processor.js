#!/usr/bin/env node

/**
 * Test the unified processor with sample data
 */

const fs = require('fs');
const path = require('path');
const { UnifiedProcessor } = require('./src/services/processing/unified-processor');

async function testUnifiedProcessor() {
    console.log('=' .repeat(80));
    console.log('🧪 UNIFIED PROCESSOR TEST');
    console.log('=' .repeat(80));
    
    // Read the sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    console.log('\n📄 INPUT:');
    console.log('  Length:', rawText.length, 'characters');
    console.log('  Preview:', rawText.substring(0, 200) + '...\n');
    
    // Test both modes
    const modes = ['FAST', 'ACCURATE'];
    
    for (const mode of modes) {
        console.log('\n' + '='.repeat(80));
        console.log(`🎯 Testing ${mode} mode`);
        console.log('='.repeat(80));
        
        try {
            const processor = new UnifiedProcessor(mode);
            
            // Mock audio path (just for the processor, we'll pass the text directly to format)
            const mockAudioPath = '/tmp/test.wav';
            
            // Since we're testing formatting, we'll skip transcription and go straight to format
            console.log('\n📝 Formatting text...');
            const startTime = Date.now();
            const formatted = await processor.format(rawText);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log('\n📊 RESULT:');
            console.log('  - Duration:', duration, 'seconds');
            console.log('  - Output length:', formatted.length, 'characters');
            
            // Count sections in output
            const outputLower = formatted.toLowerCase();
            console.log('\n📋 SECTIONS IN OUTPUT:');
            const sections = [
                'identification',
                'cc',
                'problem list',
                'current med',
                'interim history',
                'past medical history',
                'assessment',
                'plan'
            ];
            
            let foundCount = 0;
            for (const section of sections) {
                const found = outputLower.includes(section);
                console.log(`  - ${section}: ${found ? '✅' : '❌'}`);
                if (found) foundCount++;
            }
            
            console.log(`\n  Total: ${foundCount}/${sections.length} key sections found`);
            
            // Save output
            const outputFile = path.join(__dirname, `test-unified-${mode}.md`);
            fs.writeFileSync(outputFile, formatted);
            console.log('\n💾 Output saved to:', outputFile);
            
            // Show preview
            console.log('\n📄 OUTPUT PREVIEW:');
            console.log(formatted.substring(0, 600));
            console.log('...');
            
        } catch (error) {
            console.error(`\n❌ Error in ${mode} mode:`, error.message);
            if (error.stack) {
                console.error('Stack:', error.stack);
            }
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testUnifiedProcessor().catch(console.error);