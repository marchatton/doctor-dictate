#!/usr/bin/env node

/**
 * Test with the exact input from the UI that's failing
 */

const { UnifiedProcessor } = require('./src/services/processing/unified-processor');

async function testUIInput() {
    console.log('='.repeat(80));
    console.log('🧪 TESTING WITH EXACT UI INPUT');
    console.log('='.repeat(80));
    
    // This is the exact "corrected" text from the UI response
    const uiInput = `Identification, colon. John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade. Next paragraph. Chief complaint, follow-up. Next paragraph, problemist, ADHD. Improving, comma, partial control. Next line. Next line, two. Major depressive disorder, stable. Next paragraph, current medications, Lexapro 20 mg. In parentheses, one pill per day. Close parentheses, comma. Jordan APM, 60 mg. QHS period. Next paragraph. Interim history colon. Next line. ADHD in fair control in the interim period had improved symptoms after increase in dose period. Better control of after control of symptoms in school period, reduced control after 4 to 5 p.m. period,`;
    
    console.log('\n📄 INPUT TEXT:');
    console.log('  Length:', uiInput.length, 'characters');
    console.log('  First 200 chars:', uiInput.substring(0, 200));
    
    // Test with both FAST and ACCURATE modes
    const modes = ['FAST', 'ACCURATE'];
    
    for (const mode of modes) {
        console.log('\n' + '='.repeat(60));
        console.log(`🎯 Testing ${mode} mode`);
        console.log('='.repeat(60));
        
        try {
            const processor = new UnifiedProcessor(mode);
            console.log('✓ Processor initialized');
            
            console.log('⏳ Formatting text...');
            const startTime = Date.now();
            
            const result = await processor.format(uiInput);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✓ Processing completed in ${duration}s`);
            
            console.log('\n📊 RESULT:');
            console.log('  Output length:', result.length, 'characters');
            
            // Check sections in output
            const outputLower = result.toLowerCase();
            const sections = [
                'identification',
                'cc',
                'chief complaint',
                'problem',
                'current med',
                'interim history'
            ];
            
            console.log('\n📋 SECTIONS FOUND:');
            for (const section of sections) {
                const found = outputLower.includes(section);
                console.log(`  ${found ? '✅' : '❌'} ${section}`);
            }
            
            // Check for specific fixes
            console.log('\n💊 MEDICATION FIXES:');
            console.log(`  Jornay PM: ${result.includes('Jornay PM') ? '✅' : '❌'}`);
            console.log(`  Jordan APM removed: ${!result.includes('Jordan APM') ? '✅' : '❌'}`);
            console.log(`  Lexapro: ${result.includes('Lexapro') ? '✅' : '❌'}`);
            
            // Check headers
            const hashHeaders = (result.match(/###\s+/g) || []).length;
            console.log(`\n📝 ### Headers found: ${hashHeaders}`);
            
            console.log('\n📄 FULL OUTPUT:');
            console.log('---START---');
            console.log(result);
            console.log('---END---');
            
        } catch (error) {
            console.error(`❌ Error in ${mode} mode:`, error.message);
        }
    }
}

// Run the test
testUIInput().catch(console.error);