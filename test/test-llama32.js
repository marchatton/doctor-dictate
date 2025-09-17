#!/usr/bin/env node

/**
 * Test with llama3.2 and the UI input
 */

const { UnifiedProcessor } = require('./src/services/processing/unified-processor');

async function testLlama32() {
    console.log('='.repeat(80));
    console.log('🧪 TESTING WITH LLAMA3.2');
    console.log('='.repeat(80));
    
    // This is the exact "corrected" text from the UI response
    const uiInput = `Identification, colon. John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade. Next paragraph. Chief complaint, follow-up. Next paragraph, problemist, ADHD. Improving, comma, partial control. Next line. Next line, two. Major depressive disorder, stable. Next paragraph, current medications, Lexapro 20 mg. In parentheses, one pill per day. Close parentheses, comma. Jordan APM, 60 mg. QHS period. Next paragraph. Interim history colon. Next line. ADHD in fair control in the interim period had improved symptoms after increase in dose period. Better control of after control of symptoms in school period, reduced control after 4 to 5 p.m. period,`;
    
    console.log('\n📄 INPUT TEXT:');
    console.log('  Length:', uiInput.length, 'characters');
    
    try {
        // Test with ACCURATE mode (which now uses llama3.2)
        const processor = new UnifiedProcessor('ACCURATE');
        console.log('\n✓ Processor initialized with ACCURATE mode');
        console.log('  (Now using llama3.2:latest instead of mistral)');
        
        console.log('\n⏳ Formatting text...');
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
        let foundCount = 0;
        for (const section of sections) {
            const found = outputLower.includes(section);
            if (found) foundCount++;
            console.log(`  ${found ? '✅' : '❌'} ${section}`);
        }
        
        if (foundCount === sections.length) {
            console.log('\n🎉 SUCCESS! All sections found!');
        } else {
            console.log(`\n⚠️ Only ${foundCount}/${sections.length} sections found`);
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
        console.error(`❌ Error:`, error.message);
    }
}

// Run the test
testLlama32().catch(console.error);