/**
 * Test the main example provided by the user
 */

const { OllamaFormatter } = require('./src/ollama-formatter');

async function testMainExample() {
    console.log('🏥 Testing Main Example');
    console.log('=' .repeat(60));
    
    const formatter = new OllamaFormatter();
    
    // Check if Ollama is available
    const available = await formatter.isOllamaAvailable();
    if (!available) {
        console.log('❌ Ollama not available');
        return;
    }
    
    console.log(`✅ Using model: ${formatter.model}\n`);
    
    // The main example from the user
    const input = `Identification,: John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade. Chief complaint follow-up. Next paragraph. Problemist: ADHD. Improving, partial control. Two, major depressive disorder, stable. Current medications, [Lexapro] 20 mg, (one pill per day), jurn APM, 60 milli, QHS period.`;
    
    const expected = `# Identification
John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade.

**CC:** Follow-up

## Problem List
1. ADHD: improving, partial control
2. Major Depressive Disorder: stable

## Current Medications
1. Lexapro 20 mg (daily)
2. [Unclear]{Journay PM} 60 mg (QHS)`;
    
    console.log('INPUT (Raw Whisper transcript):');
    console.log('-'.repeat(60));
    console.log(input);
    
    console.log('\n\nEXPECTED OUTPUT:');
    console.log('-'.repeat(60));
    console.log(expected);
    
    try {
        console.log('\n\nPROCESSING...');
        const result = await formatter.formatMedicalDictation(input);
        
        console.log('\n\nACTUAL OUTPUT:');
        console.log('-'.repeat(60));
        if (result.success) {
            console.log(result.formatted);
            
            console.log('\n\nMETADATA:');
            console.log('-'.repeat(60));
            console.log(`Model: ${result.model}`);
            console.log(`Prompt Version: ${result.promptVersion}`);
            console.log(`Retries: ${result.retries || 0}`);
            console.log(`Success: ${result.success}`);
            
            // Check key transformations
            console.log('\n\nKEY TRANSFORMATIONS:');
            console.log('-'.repeat(60));
            const checks = [
                { name: 'Removed comma after Identification', pass: !result.formatted.includes('Identification,:') },
                { name: 'Added # Identification header', pass: result.formatted.includes('# Identification') },
                { name: 'Converted "Chief complaint" to **CC:**', pass: result.formatted.includes('**CC:**') },
                { name: 'Fixed "Problemist" to "Problem List"', pass: result.formatted.includes('## Problem List') },
                { name: 'Numbered the problems', pass: result.formatted.includes('1. ADHD') && result.formatted.includes('2. Major') },
                { name: 'Formatted medications section', pass: result.formatted.includes('## Current Medications') },
                { name: 'Converted "one pill per day" to "(daily)"', pass: result.formatted.includes('(daily)') || result.formatted.includes('daily') },
                { name: 'Marked "jurn APM" as unclear', pass: result.formatted.includes('unclear') || result.formatted.includes('Journay PM') },
                { name: 'Kept QHS capitalized', pass: result.formatted.includes('QHS') },
                { name: 'Removed "period" at end', pass: !result.formatted.endsWith('period.') }
            ];
            
            checks.forEach(check => {
                console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
            });
            
            const passed = checks.filter(c => c.pass).length;
            console.log(`\nScore: ${passed}/${checks.length} transformations correct (${(passed/checks.length*100).toFixed(0)}%)`);
            
        } else {
            console.log('❌ Formatting failed');
            console.log(`Error: ${result.error}`);
            console.log('\nFallback output:');
            console.log(result.formatted);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

// Run test
testMainExample().catch(console.error);