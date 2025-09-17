#!/usr/bin/env node

/**
 * Comprehensive test of the updated processing pipeline with larger models
 * Tests both FAST (llama3.2) and ACCURATE (mistral) modes
 */

const fs = require('fs');
const path = require('path');
const { UnifiedProcessor } = require('./src/services/processing/unified-processor');

// Expected sections that should appear in the output
const EXPECTED_SECTIONS = [
    'Identification',
    'CC',
    'Problem List',
    'Current Medications',
    'Interim History',
    'Past Medical History',
    'Social History',
    'Family History',
    'Review of Systems',
    'Mental Status Exam',
    'Risk Assessment',
    'Assessment',
    'Plan',
    'Therapy Notes'
];

// Known medication corrections that should be applied
const MEDICATION_CHECKS = [
    { incorrect: 'john apm', correct: 'Jornay PM', description: 'Jornay PM medication' },
    { incorrect: 'lexapot', correct: 'Lexapro', description: 'Lexapro medication' },
    { incorrect: 'john a pm', correct: 'Jornay PM', description: 'Jornay PM variant' }
];

// Dictation commands that should be removed
const DICTATION_COMMANDS = [
    ' comma ',
    ' period ',
    'next paragraph',
    'new paragraph',
    'next line'
];

async function runComprehensiveTest() {
    console.log('='.repeat(80));
    console.log('🔬 COMPREHENSIVE PROCESSING TEST WITH LARGER MODELS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Testing configuration:');
    console.log('  FAST mode: llama3.2:latest (3B parameters)');
    console.log('  ACCURATE mode: mistral:latest (7B parameters)');
    console.log('');
    
    // Load sample data
    const sampleFile = path.join(__dirname, 'docs/sample-data/mock recording-samir-temp.wav.txt');
    
    if (!fs.existsSync(sampleFile)) {
        console.error('❌ Sample file not found:', sampleFile);
        process.exit(1);
    }
    
    const rawText = fs.readFileSync(sampleFile, 'utf8');
    console.log('📄 Input data loaded:');
    console.log(`   Length: ${rawText.length} characters`);
    console.log(`   Lines: ${rawText.split('\n').length}`);
    console.log('');
    
    // Test both modes
    const modes = [
        { name: 'FAST', expectedTime: 90, model: 'llama3.2:latest' },
        { name: 'ACCURATE', expectedTime: 120, model: 'mistral:latest' }
    ];
    
    const results = {};
    
    for (const mode of modes) {
        console.log('='.repeat(80));
        console.log(`🚀 Testing ${mode.name} Mode (${mode.model})`);
        console.log('='.repeat(80));
        
        try {
            const processor = new UnifiedProcessor(mode.name);
            console.log('✓ Processor initialized');
            
            console.log('⏳ Processing text...');
            const startTime = Date.now();
            
            const formatted = await processor.format(rawText);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✓ Processing completed in ${duration}s`);
            
            if (duration > mode.expectedTime) {
                console.log(`  ⚠️ Warning: Exceeded expected time of ${mode.expectedTime}s`);
            }
            
            // Analyze results
            console.log('\n📊 OUTPUT ANALYSIS:');
            console.log(`   Length: ${formatted.length} characters`);
            console.log(`   Compression: ${(formatted.length / rawText.length * 100).toFixed(1)}%`);
            
            // Check sections
            console.log('\n📋 SECTION CHECK:');
            const foundSections = [];
            const missingSections = [];
            const formattedLower = formatted.toLowerCase();
            
            for (const section of EXPECTED_SECTIONS) {
                const variations = [
                    section.toLowerCase(),
                    section.toLowerCase().replace(' ', ''),
                    section.toLowerCase().replace(' ', '-')
                ];
                
                const found = variations.some(v => formattedLower.includes(v));
                
                if (found) {
                    foundSections.push(section);
                    console.log(`   ✅ ${section}`);
                } else {
                    missingSections.push(section);
                    console.log(`   ❌ ${section}`);
                }
            }
            
            const coverage = (foundSections.length / EXPECTED_SECTIONS.length * 100).toFixed(1);
            console.log(`\n   Coverage: ${foundSections.length}/${EXPECTED_SECTIONS.length} (${coverage}%)`);
            
            if (missingSections.length > 0) {
                console.log(`   Missing: ${missingSections.join(', ')}`);
            }
            
            // Check medication corrections
            console.log('\n💊 MEDICATION CORRECTIONS:');
            for (const med of MEDICATION_CHECKS) {
                const hasIncorrect = formattedLower.includes(med.incorrect);
                const hasCorrect = formatted.includes(med.correct);
                
                if (hasCorrect && !hasIncorrect) {
                    console.log(`   ✅ ${med.description}: Correctly formatted`);
                } else if (hasIncorrect) {
                    console.log(`   ❌ ${med.description}: Still contains "${med.incorrect}"`);
                } else {
                    console.log(`   ⚠️ ${med.description}: Not found in output`);
                }
            }
            
            // Check dictation command removal
            console.log('\n🎤 DICTATION COMMAND REMOVAL:');
            let commandsFound = 0;
            for (const command of DICTATION_COMMANDS) {
                if (formatted.includes(command)) {
                    console.log(`   ❌ Still contains: "${command}"`);
                    commandsFound++;
                }
            }
            
            if (commandsFound === 0) {
                console.log('   ✅ All dictation commands removed');
            } else {
                console.log(`   ❌ ${commandsFound} commands still present`);
            }
            
            // Check formatting
            console.log('\n📝 FORMATTING CHECK:');
            const hasHashHeaders = (formatted.match(/###\s+/g) || []).length;
            const hasBulletPoints = (formatted.match(/^\s*[-•]/gm) || []).length;
            const hasNumberedLists = (formatted.match(/^\s*\d+\./gm) || []).length;
            
            console.log(`   Headers (###): ${hasHashHeaders > 0 ? '✅' : '❌'} (${hasHashHeaders} found)`);
            console.log(`   Bullet points: ${hasBulletPoints > 0 ? '✅' : '❌'} (${hasBulletPoints} found)`);
            console.log(`   Numbered lists: ${hasNumberedLists > 0 ? '✅' : '❌'} (${hasNumberedLists} found)`);
            
            // Check for common issues
            console.log('\n⚠️ QUALITY CHECKS:');
            const hasDoubleSpaces = formatted.includes('  ');
            const hasTripleNewlines = formatted.includes('\n\n\n');
            const startsWithHeader = formatted.trim().startsWith('###');
            
            console.log(`   No double spaces: ${!hasDoubleSpaces ? '✅' : '❌'}`);
            console.log(`   No triple newlines: ${!hasTripleNewlines ? '✅' : '❌'}`);
            console.log(`   Starts with header: ${startsWithHeader ? '✅' : '❌'}`);
            
            // Save output
            const outputFile = `test-comprehensive-${mode.name.toLowerCase()}.md`;
            fs.writeFileSync(outputFile, formatted);
            console.log(`\n💾 Output saved to: ${outputFile}`);
            
            // Store results
            results[mode.name] = {
                success: true,
                duration,
                coverage,
                foundSections: foundSections.length,
                missingSections: missingSections.length,
                medicationsFixes: MEDICATION_CHECKS.filter(m => 
                    formatted.includes(m.correct) && !formattedLower.includes(m.incorrect)
                ).length,
                commandsRemoved: DICTATION_COMMANDS.length - commandsFound,
                hasFormatting: hasHashHeaders > 0
            };
            
            // Show preview
            console.log('\n📄 OUTPUT PREVIEW:');
            console.log('---');
            console.log(formatted.substring(0, 500));
            console.log('...\n');
            
        } catch (error) {
            console.error(`\n❌ Error in ${mode.name} mode:`, error.message);
            results[mode.name] = {
                success: false,
                error: error.message
            };
        }
    }
    
    // Final summary
    console.log('='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    
    for (const [mode, result] of Object.entries(results)) {
        console.log(`\n${mode} Mode:`);
        if (result.success) {
            console.log(`  ✅ Success`);
            console.log(`  ⏱️ Duration: ${result.duration}s`);
            console.log(`  📋 Sections: ${result.foundSections}/${EXPECTED_SECTIONS.length} (${result.coverage}%)`);
            console.log(`  💊 Medications fixed: ${result.medicationsFixes}/${MEDICATION_CHECKS.length}`);
            console.log(`  🎤 Commands removed: ${result.commandsRemoved}/${DICTATION_COMMANDS.length}`);
            console.log(`  📝 Has formatting: ${result.hasFormatting ? 'Yes' : 'No'}`);
            
            // Overall grade
            const score = (
                (result.foundSections / EXPECTED_SECTIONS.length) * 40 +
                (result.medicationsFixes / MEDICATION_CHECKS.length) * 20 +
                (result.commandsRemoved / DICTATION_COMMANDS.length) * 20 +
                (result.hasFormatting ? 20 : 0)
            );
            
            let grade = 'F';
            if (score >= 90) grade = 'A';
            else if (score >= 80) grade = 'B';
            else if (score >= 70) grade = 'C';
            else if (score >= 60) grade = 'D';
            
            console.log(`  📈 Overall Grade: ${grade} (${score.toFixed(1)}%)`);
        } else {
            console.log(`  ❌ Failed: ${result.error}`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPREHENSIVE TEST COMPLETE');
    console.log('='.repeat(80));
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (results.FAST?.success && results.ACCURATE?.success) {
        const fastScore = results.FAST.foundSections / EXPECTED_SECTIONS.length;
        const accurateScore = results.ACCURATE.foundSections / EXPECTED_SECTIONS.length;
        
        if (fastScore >= 0.8 && accurateScore >= 0.9) {
            console.log('  ✅ Both modes are performing well!');
            console.log('  - Use FAST mode for quick drafts');
            console.log('  - Use ACCURATE mode for final documents');
        } else if (accurateScore >= 0.9) {
            console.log('  ⚠️ FAST mode needs improvement');
            console.log('  - Consider using a larger model for FAST mode');
            console.log('  - Or increase num_predict for better completeness');
        } else {
            console.log('  ⚠️ Both modes need improvement');
            console.log('  - Check if models are properly installed');
            console.log('  - Consider increasing context window (num_ctx)');
            console.log('  - May need to adjust prompt structure');
        }
    }
    
    console.log('\n🎯 Ready for UI testing at http://localhost:5173');
}

// Run the test
runComprehensiveTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});