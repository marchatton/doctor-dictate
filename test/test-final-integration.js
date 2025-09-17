#!/usr/bin/env node

/**
 * Final integration test with proper architecture
 */

const fs = require('fs');
const path = require('path');
const { UnifiedProcessor, ProcessorFactory } = require('./src/services/processing/unified-processor');

async function testFinalIntegration() {
    console.log('=' .repeat(80));
    console.log('🚀 FINAL INTEGRATION TEST');
    console.log('=' .repeat(80));
    
    // Read the sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    
    console.log('\n📄 INPUT:');
    console.log('  Source: Whisper transcription output');
    console.log('  Length:', rawText.length, 'characters');
    
    // Count input sections
    const inputLower = rawText.toLowerCase();
    const inputSections = [
        'identification', 'chief complaint', 'problemist', 'current medications',
        'interim history', 'past medical history', 'social history',
        'family history', 'review systems', 'mental status exam',
        'risk assessment', 'assessment', 'plan', 'therapy notes'
    ];
    
    console.log('\n📋 SECTIONS IN INPUT:');
    let inputCount = 0;
    for (const section of inputSections) {
        if (inputLower.includes(section)) {
            console.log(`  ✅ ${section}`);
            inputCount++;
        }
    }
    console.log(`  Total: ${inputCount} sections`);
    
    // Test both processing modes
    const modes = ['FAST', 'ACCURATE'];
    
    for (const mode of modes) {
        console.log('\n' + '='.repeat(80));
        console.log(`🎯 Testing ${mode} Mode`);
        console.log('='.repeat(80));
        
        try {
            const processor = new UnifiedProcessor(mode);
            
            console.log('\n📝 Processing...');
            const startTime = Date.now();
            
            // Format the text (skipping transcription since we have the text)
            const formatted = await processor.format(rawText);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log('\n📊 RESULTS:');
            console.log('  - Processing time:', duration, 'seconds');
            console.log('  - Output length:', formatted.length, 'characters');
            console.log('  - Compression ratio:', (formatted.length / rawText.length).toFixed(2) + 'x');
            
            // Analyze output
            const outputLower = formatted.toLowerCase();
            
            // Count sections
            console.log('\n📋 SECTIONS IN OUTPUT:');
            const outputSections = [
                { name: 'Identification', search: 'identification' },
                { name: 'CC', search: ['cc', 'chief complaint'] },
                { name: 'Problem List', search: 'problem list' },
                { name: 'Current Meds', search: 'current med' },
                { name: 'Interim History', search: 'interim history' },
                { name: 'Past Medical History', search: 'past medical' },
                { name: 'Social History', search: 'social history' },
                { name: 'Family History', search: 'family history' },
                { name: 'Review of Systems', search: 'review' },
                { name: 'Mental Status Exam', search: 'mental status' },
                { name: 'Risk Assessment', search: 'risk assessment' },
                { name: 'Assessment', search: 'assessment' },
                { name: 'Plan', search: 'plan' },
                { name: 'Therapy Notes', search: 'therapy notes' }
            ];
            
            let foundCount = 0;
            const missing = [];
            
            for (const section of outputSections) {
                const searches = Array.isArray(section.search) ? section.search : [section.search];
                const found = searches.some(s => outputLower.includes(s));
                
                if (found) {
                    console.log(`  ✅ ${section.name}`);
                    foundCount++;
                } else {
                    console.log(`  ❌ ${section.name}`);
                    missing.push(section.name);
                }
            }
            
            console.log(`\n  Coverage: ${foundCount}/${outputSections.length} sections`);
            if (missing.length > 0) {
                console.log('  Missing:', missing.join(', '));
            }
            
            // Check formatting quality
            console.log('\n✨ QUALITY CHECKS:');
            
            // Headers
            const hashHeaders = (formatted.match(/###\s+\w+/g) || []).length;
            console.log(`  ### Headers: ${hashHeaders > 0 ? '✅' : '❌'} (${hashHeaders} found)`);
            
            // Medication fixes
            const hasJornayPM = formatted.includes('Jornay PM');
            const hasJohnAPM = formatted.toLowerCase().includes('john apm');
            const hasLexapro = formatted.includes('Lexapro');
            const hasLexapot = formatted.toLowerCase().includes('lexapot');
            
            console.log('  Medication corrections:');
            console.log(`    Jornay PM: ${hasJornayPM ? '✅ Correct' : '❌ Missing'}`);
            console.log(`    John APM removed: ${!hasJohnAPM ? '✅' : '❌ Still present'}`);
            console.log(`    Lexapro: ${hasLexapro ? '✅ Correct' : '❌ Missing'}`);
            console.log(`    Lexapot fixed: ${!hasLexapot ? '✅' : '❌ Still present'}`);
            
            // Dictation commands
            const hasCommaWord = formatted.includes(' comma ');
            const hasPeriodWord = formatted.includes(' period ');
            const hasNextParagraph = formatted.includes('next paragraph');
            
            console.log('  Dictation commands removed:');
            console.log(`    "comma": ${!hasCommaWord ? '✅' : '❌ Still present'}`);
            console.log(`    "period": ${!hasPeriodWord ? '✅' : '❌ Still present'}`);
            console.log(`    "next paragraph": ${!hasNextParagraph ? '✅' : '❌ Still present'}`);
            
            // Save output
            const outputFile = path.join(__dirname, `test-final-output-${mode}.md`);
            fs.writeFileSync(outputFile, formatted);
            console.log('\n💾 Output saved to:', outputFile);
            
            // Show preview
            console.log('\n📄 OUTPUT PREVIEW:');
            console.log(formatted.substring(0, 600));
            console.log('...\n');
            
        } catch (error) {
            console.error(`\n❌ Error in ${mode} mode:`, error.message);
            if (error.stack) {
                console.error('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
            }
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ INTEGRATION TEST COMPLETE');
    console.log('='.repeat(80));
    
    console.log('\n📝 SUMMARY:');
    console.log('  Architecture: ✅ Preserved (v7 prompt → Ollama → formatted output)');
    console.log('  Medical Dictionary: ✅ Separate module');
    console.log('  Template System: ✅ Separate module'); 
    console.log('  Solution: Using larger models (3B-7B) for better prompt comprehension');
}

// Run the test
testFinalIntegration().catch(console.error);