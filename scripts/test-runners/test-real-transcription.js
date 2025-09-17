/**
 * Test medical formatting with real Whisper transcription
 */

const fs = require('fs');
const { OllamaFormatter } = require('./src/ollama-formatter');

async function testRealTranscription() {
    console.log('🏥 End-to-End Test with Real Transcription');
    console.log('=' .repeat(60));
    
    // Read the real transcript
    const transcriptPath = 'docs/sample-data/mock-recording-transcript.txt';
    let transcript = fs.readFileSync(transcriptPath, 'utf8');
    
    // Remove the warning line from Whisper
    transcript = transcript.split('\n').filter(line => !line.includes('UserWarning')).join('\n').trim();
    
    console.log('📝 WHISPER TRANSCRIPT (first 500 chars):');
    console.log('-'.repeat(60));
    console.log(transcript.substring(0, 500) + '...');
    console.log(`\nTotal length: ${transcript.length} characters`);
    
    // Test with OllamaFormatter
    const formatter = new OllamaFormatter();
    
    const available = await formatter.isOllamaAvailable();
    if (!available) {
        console.log('❌ Ollama not available');
        return;
    }
    
    console.log(`\n🤖 Using model: ${formatter.model}`);
    console.log('Processing transcription...\n');
    
    const result = await formatter.formatMedicalDictation(transcript);
    
    if (result.success) {
        console.log('✅ Formatting successful!');
        console.log(`Model: ${result.model}`);
        console.log(`Prompt version: ${result.promptVersion}`);
        console.log(`Retries: ${result.retries || 0}`);
        
        console.log('\n📋 FORMATTED OUTPUT:');
        console.log('=' .repeat(60));
        console.log(result.formatted);
        console.log('=' .repeat(60));
        
        // Save the formatted output
        const formattedPath = 'docs/sample-data/mock-recording-formatted.md';
        fs.writeFileSync(formattedPath, result.formatted);
        console.log(`\n✅ Saved to: ${formattedPath}`);
        
        // Template compliance check
        console.log('\n🔍 TEMPLATE.MD COMPLIANCE CHECK:');
        console.log('-'.repeat(60));
        
        const templateSections = {
            '# Identification': 'Main identification header',
            '**CC:**': 'Chief complaint format',
            '## Problem List': 'Problem list section',
            '## Current Meds': 'Current medications section (or ## Current Medications)',
            '## Interim History': 'Interim history section',
            '## Past Medical History': 'Past medical history',
            '## Social History': 'Social history',
            '## Family History': 'Family history',
            '## ROS': 'Review of systems (or ## Review of Systems)',
            '## MSE': 'Mental status exam',
            '## Risk Assessment': 'Risk assessment',
            '## Assessment': 'Assessment section',
            '## Plan': 'Plan section',
            '## Therapy Notes': 'Therapy notes (optional)'
        };
        
        let found = 0;
        let missing = 0;
        
        Object.entries(templateSections).forEach(([section, description]) => {
            // Check for variations
            let isFound = false;
            
            if (section === '## Current Meds') {
                isFound = result.formatted.includes('## Current Meds') || 
                         result.formatted.includes('## Current Medications');
            } else if (section === '## ROS') {
                isFound = result.formatted.includes('## ROS') || 
                         result.formatted.includes('## Review of Systems');
            } else if (section === '## MSE') {
                isFound = result.formatted.includes('## MSE') || 
                         result.formatted.includes('## Mental Status Exam');
            } else {
                isFound = result.formatted.includes(section);
            }
            
            if (isFound) {
                console.log(`✅ ${section} - ${description}`);
                found++;
            } else {
                console.log(`❌ ${section} - ${description}`);
                missing++;
            }
        });
        
        const compliance = (found / Object.keys(templateSections).length * 100).toFixed(1);
        console.log(`\n📊 Compliance: ${found}/${Object.keys(templateSections).length} sections (${compliance}%)`);
        
        // Additional quality checks
        console.log('\n📊 QUALITY CHECKS:');
        console.log('-'.repeat(60));
        
        const qualityChecks = [
            { 
                name: 'Uses numbered lists', 
                check: /\d+\.\s/.test(result.formatted),
                details: 'Problem list and medications should be numbered'
            },
            { 
                name: 'Medications properly formatted', 
                check: /\d+\s*mg|\d+\s*milligrams/i.test(result.formatted),
                details: 'Dosages should be present'
            },
            { 
                name: 'No raw dictation commands', 
                check: !/\b(colon|period|comma|next paragraph|next line)\b/i.test(result.formatted),
                details: 'Commands should be converted to punctuation'
            },
            { 
                name: 'Medical abbreviations capitalized', 
                check: /\b(ADHD|MDD|QHS|BID|TID|PRN)\b/.test(result.formatted),
                details: 'Standard medical abbreviations'
            },
            { 
                name: 'Unclear medications marked', 
                check: /journey|Journay|unclear|Luxapro|Lexapro/i.test(result.formatted),
                details: 'Medication names clarified'
            }
        ];
        
        qualityChecks.forEach(check => {
            const passed = check.check;
            console.log(`${passed ? '✅' : '❌'} ${check.name}`);
            if (!passed) {
                console.log(`   → ${check.details}`);
            }
        });
        
        if (result.llmNotes) {
            console.log('\n📝 LLM Processing Notes:');
            console.log(result.llmNotes);
        }
        
    } else {
        console.log('❌ Formatting failed:', result.error);
        if (result.formatted) {
            console.log('\nFallback output:');
            console.log(result.formatted);
        }
    }
}

// Run the test
testRealTranscription().catch(console.error);